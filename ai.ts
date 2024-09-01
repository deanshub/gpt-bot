import { openai } from "@ai-sdk/openai";
import {
  generateText,
} from "ai";
import { getBufferedMessages } from "./bufferMessages";
import OpenAI from "openai";
import { getOrThrow } from "./utils";

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
    })

    return response.text;
}