import { Api, Bot, type RawApi } from "grammy";
import { getOrThrow } from "./utils";
import { getFullName } from "./getFullName";
import { authorizedUsers, getAdminChatId } from "./authorizedUsers";
import { bufferMessages, type MyContext } from "./bufferMessages";
import { image, talk } from "./ai";
import { hydrateFiles } from "@grammyjs/files";
import { KEYBOARD, ScheduledMessageHeader, SchedulingHeader, SchedulingSeperator } from "./consts";
import schedule from "node-schedule";
import { isAfter } from "date-fns";
import { deleteScheduledMessage, getScheduledMessages, getScheduledMessagesOfChat, initDb, storeScheduledMessage } from "./db";

let bot: Bot<MyContext, Api<RawApi>> 

export function getBot(){
    if (!bot) {
        initDb()
        bot = new Bot<MyContext>(getOrThrow("BOT_TOKEN")); 
        loadScheduledMessages()
        void setupBot(bot)
    }
    return bot
}

async function setupBot(bot: Bot<MyContext, Api<RawApi>>){
    bot.api.config.use(hydrateFiles(bot.token));
    bot.use(bufferMessages);
    bot.use(authorizedUsers);

    bot.command("start", async (ctx) => {
        await ctx.reply(`Hello ${
            getFullName(ctx)
        }👋
I am your AI helper 🧝‍♀️
How can I help you today?`,{parse_mode: 'HTML'})
    })
    bot.command("help", (ctx) => ctx.reply("You can talk to me or command me to image with /img"))

    bot.command("schedule", async (ctx) => {
        const chatId = ctx.chat.id
        const messages = await getScheduledMessagesOfChat(chatId)
        if (messages.length === 0){
            await ctx.reply("No messages scheduled")
        }
        for (const message of messages){
            await ctx.reply(`${message.message}\n\nScheduled at ${message.schedule_time}`)
        }
    })
    bot.callbackQuery(KEYBOARD.ScheduleMessagePromptDecline.callback_data, async (ctx) => {
        await ctx.answerCallbackQuery("Message scheduling cancelled.");
        await ctx.deleteMessage();
    })

    bot.callbackQuery(KEYBOARD.ScheduleMessagePromptAccept.callback_data, async (ctx) => {
        await ctx.answerCallbackQuery("Message scheduled.");
        // Extract the original message and schedule time from the callback query data
        const [originalMessage, scheduleTime] = ctx.callbackQuery.message!.text!.replace(SchedulingHeader, "").split(SchedulingSeperator);

        if (originalMessage && scheduleTime) {
            try {
                // Parse the schedule time string to a Date object
                const scheduledDate = new Date(scheduleTime.replace('at ', '').trim());
                if (isAfter(scheduledDate, new Date())){
                    const jobId = crypto.randomUUID()
                    schedule.scheduleJob(scheduledDate, () => {
                        ctx.api.sendMessage(ctx.chat!.id, `${ScheduledMessageHeader}\n${originalMessage.trim()}`)
                        deleteScheduledMessage(jobId)
                    })
                    await storeScheduledMessage(originalMessage.trim(), scheduledDate, ctx.chat!.id, jobId)
                    // await ctx.api.sendMessage(ctx.chat!.id, originalMessage.trim(), {
                    //     // @ts-expect-error-next-line
                    //     schedule_date: scheduledDate.toUTCString()
                    // })
                }else{
                    setTimeout(() => {
                        ctx.api.sendMessage(ctx.chat!.id, originalMessage.trim())
                    }, 0)
                }

                await ctx.reply("Message has been scheduled successfully.", {
                    reply_parameters: {
                        message_id: ctx.callbackQuery.message!.message_id
                    }
                })
            } catch (error) {
                console.error("Error scheduling message:", error);
                await ctx.reply("Failed to schedule the message. Please try again.", {
                    reply_parameters: {
                        message_id: ctx.callbackQuery.message!.message_id
                    }
                })
            } finally {
                await ctx.editMessageText(ctx.callbackQuery.message!.text!, {
                    reply_markup: undefined // This removes the inline keyboard
                });
            }
        } else {
            await ctx.editMessageText("Failed to schedule the message due to missing information.");
        }
    })

    bot.command("img", async (ctx) => {
        const text = ctx.message?.text?.replace("/img", "");
        if (!text) {
            ctx.reply("Please provide a text to generate an image");
            return;
        }
        try {
            const img = await image({ text });
            if (!img) {
              throw new Error("No image generated");
            }
            ctx.replyWithPhoto(img);
        } catch (error) {
            console.error(error);
            ctx.reply("I'm sorry, had an error processing your request. Please try again later.");
        }
    })


    bot.on(["message:text", "message:photo"], async (ctx) => {
        try {
            const reply = await talk({ chatId: ctx.chat.id });
            if (reply) {
                ctx.reply(reply, {
                parse_mode: "HTML",
                });
            }
          } catch (e) {
            console.error(e);
            ctx.reply(
              "I'm sorry, had an error processing your request. Please try again later.",
            );
        }
    })

    // Set bot commands
    bot.api.setMyCommands([
        { command: "start", description: "Start the bot" },
        { command: "help", description: "Show help" },
        { command: "schedule", description: "Show scheduled messages" },
        { command: "img", description: "Generate an image" },
    ]);

    bot.api.sendMessage(getAdminChatId(), "Bot started")
}


async function loadScheduledMessages(){
    const messages = await getScheduledMessages()
    for (const message of messages){
        schedule.scheduleJob(message.schedule_time, () => {
            bot.api.sendMessage(message.chat_id, message.message)
            deleteScheduledMessage(message.job_id)
        })
    }
}