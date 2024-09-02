import { openai } from "@ai-sdk/openai";
import {
  generateText,
  tool,
} from "ai";
import { getBufferedMessages } from "./bufferMessages";
import OpenAI from "openai";
import { getOrThrow } from "./utils";
import { z } from "zod";
import { promptScheduleMessage } from "./promptScheduleMessage";

const openaiCore = new OpenAI({
    apiKey: getOrThrow("OPENAI_API_KEY"),
});
  



// export async function image({text}:{text: string}): Promise<string>{
//     // const response = await generateObject({
//     //     model: openai("gpt-4o"),
//     //     prompt: `Create a detailed and vivid image based on the following text: ${text}`,
//     //     responseFormat: { type: "base64_json" },
//     //   });
      
//     //   return response.object;

//     throw new Error("Not implemented");
// }


export async function image({ text }: { text: string }) {
    const img = await openaiCore.images.generate({
      prompt: text,
      model: "dall-e-3",
      size: "1024x1024",
      quality: "standard",
      n: 1,
    });
    return img.data[0].url;
}

export async function talk({chatId}:{chatId: number}): Promise<string>{
    const messages = getBufferedMessages(chatId);
    
    const response = await generateText({
        model: openai("gpt-4o"),
        messages,
        tools: {
          scheduleMessage: tool({
            description: `Schedule a message to be sent later, the current time is ${new Date().toString()}`,
            parameters: z.object({
              message: z.string().describe("The message to be sent"),
              minutesInFuture: z.optional(z.number().min(1)).describe("The number of minutes in the future to schedule the message"),
              scheduleDate: z.optional(z.string()).describe("The date and time to schedule the message"),
            }),
            execute: async ({ message, minutesInFuture, scheduleDate }) => {
              await promptScheduleMessage(chatId, message, minutesInFuture, scheduleDate)
            },
          })
        }
    })

    return response.text;
}