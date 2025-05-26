import { openai } from '@ai-sdk/openai';
import {
  experimental_generateImage as generateImage,
  experimental_generateSpeech as generateSpeech,
  generateText,
  experimental_transcribe as openAItranscribe,
  tool,
} from 'ai';
import { z } from 'zod';
import { getBufferedMessages } from './bufferMessages';
import { promptScheduleMessage } from './promptScheduleMessage';

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
  const { image } = await generateImage({
    model: openai.image('dall-e-3'),
    prompt: text,
  });
  return image.base64;
}

export async function talk({ chatId }: { chatId: number }): Promise<string> {
  const messages = getBufferedMessages(chatId);

  const response = await generateText({
    model: openai('gpt-4o'),
    messages,
    tools: {
      scheduleMessage: tool({
        description: `Schedule a message to be sent later, the current time is ${new Date().toString()}`,
        parameters: z.object({
          message: z.string().describe('The message to be sent'),
          minutesInFuture: z
            .optional(z.number().min(1))
            .describe('The number of minutes in the future to schedule the message'),
          scheduleDate: z
            .optional(z.string())
            .describe('The date and time to schedule the message'),
        }),
        execute: async ({ message, minutesInFuture, scheduleDate }) => {
          await promptScheduleMessage(chatId, message, minutesInFuture, scheduleDate);
        },
      }),
    },
  });

  return response.text;
}

export async function transcribe({ audio }: { audio: Buffer }) {
  const { text } = await openAItranscribe({
    model: openai.transcription('whisper-1'),
    audio,
  });
  return text;
}

export async function t2s({ text }: { text: string }) {
  const { audio } = await generateSpeech({
    model: openai.speech('tts-1'),
    text,
    voice: 'alloy',
  });
  return audio.base64;
}
