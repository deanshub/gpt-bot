import { readFile } from 'node:fs/promises';
import { hydrateFiles } from '@grammyjs/files';
import { isAfter } from 'date-fns';
import { Bot, InputFile } from 'grammy';
import type { Api, RawApi } from 'grammy';
import schedule from 'node-schedule';
import { image, t2s, talk, transcribe } from './ai';
import { authorizedUsers, getAdminChatId } from './authorizedUsers';
import { bufferMessages } from './bufferMessages';
import type { MyContext } from './bufferMessages';
import { KEYBOARD, ScheduledMessageHeader, SchedulingHeader, SchedulingSeperator } from './consts';
import {
  deleteScheduledMessage,
  getScheduledMessages,
  getScheduledMessagesOfChat,
  initDb,
  storeScheduledMessage,
} from './db';
import { getFullName } from './getFullName';
import { getOrThrow } from './utils';

let bot: Bot<MyContext, Api<RawApi>>;

export function getBot() {
  if (!bot) {
    initDb();
    bot = new Bot<MyContext>(getOrThrow('BOT_TOKEN'));
    loadScheduledMessages();
    void setupBot(bot);
  }
  return bot;
}

async function setupBot(bot: Bot<MyContext, Api<RawApi>>) {
  bot.api.config.use(hydrateFiles(bot.token));
  bot.use(bufferMessages);
  bot.use(authorizedUsers);

  bot.command('start', async (ctx) => {
    const packageJson = JSON.parse(await readFile('package.json', 'utf-8'));
    await ctx.reply(
      `Hello ${getFullName(ctx)}👋
I am your AI helper 🧝‍♀️ v${packageJson.version}
How can I help you today?`,
      { parse_mode: 'HTML' }
    );
  });
  bot.command('help', (ctx) => ctx.reply('You can talk to me or command me to image with /img'));

  bot.command('schedule', async (ctx) => {
    const chatId = ctx.chat.id;
    const messages = await getScheduledMessagesOfChat(chatId);
    if (messages.length === 0) {
      await ctx.reply('No messages scheduled');
    }
    for (const message of messages) {
      await ctx.reply(`${message.message}\n\nScheduled at ${message.schedule_time}`);
    }
  });
  bot.callbackQuery(KEYBOARD.ScheduleMessagePromptDecline.callback_data, async (ctx) => {
    await ctx.answerCallbackQuery('Message scheduling cancelled.');
    await ctx.deleteMessage();
  });

  bot.callbackQuery(KEYBOARD.ScheduleMessagePromptAccept.callback_data, async (ctx) => {
    await ctx.answerCallbackQuery('Message scheduled.');
    // Extract the original message and schedule time from the callback query data
    const [originalMessage, scheduleTime] = ctx.callbackQuery
      .message!.text!.replace(SchedulingHeader, '')
      .split(SchedulingSeperator);

    if (originalMessage && scheduleTime) {
      try {
        // Parse the schedule time string to a Date object
        const scheduledDate = new Date(scheduleTime.replace('at ', '').trim());
        if (isAfter(scheduledDate, new Date())) {
          const jobId = crypto.randomUUID();
          schedule.scheduleJob(scheduledDate, () => {
            ctx.api.sendMessage(
              ctx.chat!.id,
              `${ScheduledMessageHeader}\n${originalMessage.trim()}`
            );
            deleteScheduledMessage(jobId);
          });
          await storeScheduledMessage(originalMessage.trim(), scheduledDate, ctx.chat!.id, jobId);
          // await ctx.api.sendMessage(ctx.chat!.id, originalMessage.trim(), {
          //     // @ts-expect-error-next-line
          //     schedule_date: scheduledDate.toUTCString()
          // })
        } else {
          setTimeout(() => {
            ctx.api.sendMessage(ctx.chat!.id, originalMessage.trim());
          }, 0);
        }

        await ctx.reply('Message has been scheduled successfully.', {
          reply_parameters: {
            message_id: ctx.callbackQuery.message!.message_id,
          },
        });
      } catch (error) {
        console.error('Error scheduling message:', error);
        await ctx.reply('Failed to schedule the message. Please try again.', {
          reply_parameters: {
            message_id: ctx.callbackQuery.message!.message_id,
          },
        });
      } finally {
        await ctx.editMessageText(ctx.callbackQuery.message!.text!, {
          reply_markup: undefined, // This removes the inline keyboard
        });
      }
    } else {
      await ctx.editMessageText('Failed to schedule the message due to missing information.');
    }
  });

  bot.command('img', async (ctx) => {
    const text = ctx.message?.text?.replace('/img', '');
    if (!text) {
      ctx.reply('Please provide a text to generate an image');
      return;
    }
    try {
      const img = await image({ text });
      if (!img) {
        throw new Error('No image generated');
      }
      ctx.replyWithPhoto(img);
    } catch (error) {
      console.error(error);
      ctx.reply("I'm sorry, had an error processing your request. Please try again later.");
    }
  });

  bot.command('speak', async (ctx) => {
    const text = ctx.message?.text?.replace('/speak', '');
    if (!text) {
      ctx.reply('Please provide a text to generate an audio');
      return;
    }
    try {
      const audioBase64 = await t2s({ text });
      const audioBuffer = Buffer.from(audioBase64, 'base64');
      const audioUint8Array = new Uint8Array(audioBuffer);
      await ctx.replyWithAudio(new InputFile(audioUint8Array, 'speech.mp3'));
    } catch (error) {
      console.error(error);
      ctx.reply("I'm sorry, had an error processing your request. Please try again later.");
    }
  });

  bot.on(['message:text', 'message:photo'], async (ctx) => {
    try {
      const reply = await talk({ chatId: ctx.chat.id });
      if (reply) {
        ctx.reply(reply, {
          parse_mode: 'HTML',
        });
      }
    } catch (e) {
      console.error(e);
      ctx.reply("I'm sorry, had an error processing your request. Please try again later.");
    }
  });

  bot.on('message:audio', async (ctx) => {
    const audio = ctx.message?.audio;
    if (!audio) {
      ctx.reply('Please send an audio to generate an image');
      return;
    }
    try {
      const file = await ctx.getFile();
      const path = await file.download();
      const audioBuffer = await readFile(path);
      const transcription = await transcribe({ audio: audioBuffer });
      if (!transcription) {
        throw new Error('No transcription generated');
      }
      ctx.reply(transcription);
    } catch (error) {
      console.error(error);
      ctx.reply("I'm sorry, had an error processing your request. Please try again later.");
    }
  });

  // Set bot commands
  bot.api.setMyCommands([
    { command: 'start', description: 'Start the bot' },
    { command: 'help', description: 'Show help' },
    { command: 'schedule', description: 'Show scheduled messages' },
    { command: 'img', description: 'Generate an image' },
    { command: 'speak', description: 'Generate an audio' },
  ]);

  bot.api.sendMessage(getAdminChatId(), 'Bot started');
}

async function loadScheduledMessages() {
  const messages = await getScheduledMessages();
  for (const message of messages) {
    schedule.scheduleJob(message.schedule_time, () => {
      bot.api.sendMessage(message.chat_id, message.message);
      deleteScheduledMessage(message.job_id);
    });
  }
}
