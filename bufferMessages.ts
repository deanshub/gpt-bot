import { readFile } from 'node:fs/promises';
import type { FileFlavor } from '@grammyjs/files';
import type { CoreAssistantMessage, CoreUserMessage, DataContent } from 'ai';
import type { Context, NextFunction } from 'grammy';
import { getOrThrow } from './utils';

export type MyContext = FileFlavor<Context>;

type FileContent = {
  type: 'file';
  data: DataContent;
  mimeType: string;
};
type TextContent = {
  type: 'text';
  text: string;
};
type ImageContent = {
  type: 'image';
  image: Buffer;
};

export type Content = TextContent | ImageContent | FileContent;

export type Message = {
  timestamp: number;
} & (CoreUserMessage | CoreAssistantMessage);

const bufferedMessages = new Map<number, Message[]>();
const timeframeInMinutes = Number(getOrThrow('BUFFER_MESSAGES_TIMEFRAME')) * 60 * 1000;

// async function getLestMessages(ctx: Context, chatId:string, timeframe: number = 2){
//     const chat = await ctx.hist
//     chat.history
// }
export async function bufferMessages(ctx: Context, next: NextFunction): Promise<void> {
  const content: Content[] = [];
  if (ctx.chat?.id) {
    if (ctx.message?.text) {
      content.push({
        type: 'text',
        text: ctx.message.text,
      });
    }
    if (ctx.message?.photo) {
      content.push({
        type: 'image',
        image: await getFile(ctx as MyContext),
      });
      if (ctx.message.caption) {
        content.push({
          type: 'text',
          text: ctx.message.caption,
        });
      }
    }
    const chatId = ctx.chat?.id;
    if (!bufferedMessages.has(chatId)) {
      bufferedMessages.set(chatId, []);
    }
    const messages = bufferedMessages.get(chatId)!;
    removeMessagesOlderThanTimeframe(messages, timeframeInMinutes);
    messages.push({
      content,
      timestamp: Date.now(),
      role: 'user',
    });
  }

  await next();
}

function removeMessagesOlderThanTimeframe(messages: Message[], timeframeInMinutes: number) {
  const now = Date.now();
  while (messages.length > 0 && now - messages[0].timestamp > timeframeInMinutes) {
    messages.shift();
  }
}

export function getBufferedMessages(chatId: undefined | number): Message[] {
  if (!chatId || !bufferedMessages.has(chatId)) {
    return [];
  }
  const messages = bufferedMessages.get(chatId)!;
  removeMessagesOlderThanTimeframe(messages, timeframeInMinutes);
  return messages;
}

export function addAssistantMessage(chatId: number, content: FileContent | TextContent): void {
  if (!bufferedMessages.has(chatId)) {
    bufferedMessages.set(chatId, []);
  }
  const messages = bufferedMessages.get(chatId)!;
  removeMessagesOlderThanTimeframe(messages, timeframeInMinutes);
  messages.push({
    content: [content],
    timestamp: Date.now(),
    role: 'assistant',
  });
}

async function getFile(ctx: MyContext): Promise<Buffer> {
  const file = await ctx.getFile();
  const path = await file.download();
  const fileBuffer = await readFile(path);
  return fileBuffer;
}
