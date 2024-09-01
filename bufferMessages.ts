import type { Context, NextFunction } from "grammy";
import { getOrThrow } from "./utils";
import { readFile } from "node:fs/promises";
import type { FileFlavor } from "@grammyjs/files";
import type { CoreUserMessage } from "ai";

export type MyContext = FileFlavor<Context>;

export type Content  = {
    type: "text"
    text: string
} | {
    type: "image"
    image: Buffer
}
    
export interface Message extends CoreUserMessage {
    timestamp: number;
}

const bufferedMessages = new Map<number, Message[]>();
const timeframeInMinutes = Number(getOrThrow('BUFFER_MESSAGES_TIMEFRAME')) * 60 * 1000;

// async function getLestMessages(ctx: Context, chatId:string, timeframe: number = 2){
//     const chat = await ctx.hist
//     chat.history
// }
export async function bufferMessages(
    ctx: Context,
    next: NextFunction): Promise<void> {
    const content: Content[] = []
    if (ctx.chat?.id){
        if (ctx.message?.text) {
            content.push({
                type: "text",
                text: ctx.message.text,
            })
        }
        if (ctx.message?.photo) {
            content.push({
                type: "image",
                image: await getFile(ctx as MyContext),
            })
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
            role: "user",
        });
    }

    await next();
}

function removeMessagesOlderThanTimeframe(
    messages: Message[],
    timeframeInMinutes: number
) {
    const now = Date.now();
    while (messages.length > 0 && now - messages[0].timestamp > timeframeInMinutes) {
        messages.shift();
    }
}

export function getBufferedMessages(chatId: undefined|number): CoreUserMessage[] {
    if (!chatId || !bufferedMessages.has(chatId)) {
        return [];
    }
    const messages = bufferedMessages.get(chatId)!;
    removeMessagesOlderThanTimeframe(messages, timeframeInMinutes);
    return messages;
}

async function getFile(ctx: MyContext): Promise<Buffer>{
    const file = await ctx.getFile();
    const path = await file.download();
    const fileBuffer = await readFile(path)
    return fileBuffer
}