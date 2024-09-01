import { openai } from "@ai-sdk/openai";
import {
  generateText,
} from "ai";
import { getBufferedMessages } from "./bufferMessages";

export async function image({text}:{text: string}): Promise<string>{
    // const response = await generateObject({
    //     model: openai("gpt-4o"),
    //     prompt: `Create a detailed and vivid image based on the following text: ${text}`,
    //     responseFormat: { type: "base64_json" },
    //   });
      
    //   return response.object;

    throw new Error("Not implemented");
}

export async function talk({text, chatId}:{text: string, chatId: number}): Promise<string>{
    const messages = getBufferedMessages(chatId);
    
    const response = await generateText({
        model: openai("gpt-4o"),
        messages,
    })

    return response.text;
}