import type { Context, NextFunction } from "grammy";
import { getOrThrow } from "./utils";

export interface Message {
    content: string;
    timestamp: number;
    role: "user" | "assistant";
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
    if (ctx.message?.text && ctx.chat?.id) {
        const chatId = ctx.chat?.id;
        if (!bufferedMessages.has(chatId)) {
            bufferedMessages.set(chatId, []);
        }
        const messages = bufferedMessages.get(chatId)!;
        removeMessagesOlderThanTimeframe(messages, timeframeInMinutes);
        messages.push({
            content: ctx.message.text,
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

export function getBufferedMessages(chatId: undefined|number): Message[] {
    if (!chatId || !bufferedMessages.has(chatId)) {
        return [];
    }
    const messages = bufferedMessages.get(chatId)!;
    removeMessagesOlderThanTimeframe(messages, timeframeInMinutes);
    return messages;
}