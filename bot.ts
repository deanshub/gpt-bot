import { Api, Bot, type RawApi } from "grammy";
import { getOrThrow } from "./utils";
import { getFullName } from "./getFullName";
import { authorizedUsers, getAdminChatId } from "./authorizedUsers";
import { bufferMessages, type MyContext } from "./bufferMessages";
import { image, talk } from "./ai";
import { hydrateFiles } from "@grammyjs/files";
import { KEYBOARD, SchedulingHeader, SchedulingSeperator } from "./consts";
import schedule from "node-schedule";
import { isAfter, toDate } from "date-fns";

let bot: Bot<MyContext, Api<RawApi>> 

export function getBot(){
    if (!bot) {
        bot = new Bot<MyContext>(getOrThrow("BOT_TOKEN")); 
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
                const scheduledDate = toDate(scheduleTime.replace('at ', '').trim());
                // const formattedDate = format(add(scheduledDate, {hours: 2}), 'yyyy-MM-dd HH:mm:ss')
                // const formattedDate = scheduledDate.getTime()
                console.log(scheduledDate)

                if (isAfter(scheduledDate, new Date())){
                    // Send the message with the scheduled time
                    const job = schedule.scheduleJob(scheduledDate, () => {
                        console.log("Sending message")
                        ctx.api.sendMessage(ctx.chat!.id, originalMessage.trim())
                    })
                }else{
                    setTimeout(() => {
                        ctx.api.sendMessage(ctx.chat!.id, originalMessage.trim())
                    })
                }


                // await ctx.api.sendMessage(ctx.chat!.id, originalMessage.trim(), {
                    // schedule_date: formattedDate
                // }

                // await ctx.editMessageText("Message has been scheduled successfully.");
                await ctx.reply("Message has been scheduled successfully.", {
                    reply_parameters: {
                        message_id: ctx.callbackQuery.message!.message_id
                    }
                })
            } catch (error) {
                console.error("Error scheduling message:", error);
                // await ctx.editMessageText("Failed to schedule the message. Please try again.");
                await ctx.reply("Failed to schedule the message. Please try again.", {
                    reply_parameters: {
                        message_id: ctx.callbackQuery.message!.message_id
                    }
                })
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
            ctx.reply(reply ?? "I'm sorry, I don't understand", {
              parse_mode: "HTML",
            });
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
        { command: "img", description: "Generate an image" },
    ]);

    bot.api.sendMessage(getAdminChatId(), "Bot started")
}

