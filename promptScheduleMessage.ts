import { InlineKeyboard } from "grammy";
import { getBot } from "./bot"
import { KEYBOARD, SchedulingHeader, SchedulingSeperator } from "./consts";


const promptScheduleMessageInlineKeyboard = new InlineKeyboard()
    .text(KEYBOARD.ScheduleMessagePromptAccept.text, KEYBOARD.ScheduleMessagePromptAccept.callback_data)
    .text(KEYBOARD.ScheduleMessagePromptDecline.text, KEYBOARD.ScheduleMessagePromptDecline.callback_data)


export async function promptScheduleMessage(chatId: number, message: string, minutesInFuture?: number, scheduleDate?: Date){
    const bot = getBot()
    // await bot.api.sendMessage(chatId, message, {
    //     schedule_date: scheduleTime,
    // })
    if (!message || (!minutesInFuture && !scheduleDate)){
        return;
    }

    let scheduleTime = "";
    if (minutesInFuture){
        scheduleTime = new Date(Date.now() + minutesInFuture * 60 * 1000).toString();
    } else if (scheduleDate){
        scheduleTime = scheduleDate.toString()
    }
    
    await bot.api.sendMessage(chatId, `${SchedulingHeader}
        
${message}
${SchedulingSeperator}
at ${scheduleTime}`, {
        reply_markup: promptScheduleMessageInlineKeyboard,
        parse_mode: 'HTML'
    })
}