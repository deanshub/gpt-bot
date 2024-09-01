import { Api, Bot, Context, type RawApi } from "grammy";
import { getOrThrow } from "./utils";
import { getFullName } from "./getFullName";
import { authorizedUsers, getAdminChatId } from "./authorizedUsers";
import { bufferMessages } from "./bufferMessages";
import { image, talk } from "./ai";

let bot: Bot<Context, Api<RawApi>> 

export function getBot(){
    if (!bot) {
        bot = new Bot(getOrThrow("BOT_TOKEN")); 
        void setupBot(bot)
    }
    return bot
}

async function setupBot(bot: Bot<Context, Api<RawApi>>){
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


    bot.on("message:text", async (ctx) => {
        try {
            const reply = await talk({ text: ctx.message.text, chatId: ctx.chat.id });
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

    // bot.on("message:photo", async (ctx) => {
    //     try {
    //         const photoLink = await bot.telegram.getFileLink(
    //             ctx.message.photo[0].file_id,
    //         );
    //     } catch (e) {
            
    //     }
    // })

    // Set bot commands
    bot.api.setMyCommands([
        { command: "start", description: "Start the bot" },
        { command: "help", description: "Show help" },
        { command: "img", description: "Generate an image" },
    ]);

    bot.api.sendMessage(getAdminChatId(), "Bot started")
}

