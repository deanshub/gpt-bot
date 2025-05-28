import { openai } from '@ai-sdk/openai';
import {
  experimental_generateImage as generateImage,
  experimental_generateSpeech as generateSpeech,
  generateText,
  experimental_transcribe as openAItranscribe,
  tool,
} from 'ai';
import { z } from 'zod';
import { addAssistantMessage, getBufferedMessages } from './bufferMessages';
import { promptScheduleMessage } from './promptScheduleMessage';
import { InputFile, type Context } from 'grammy';

// export async function image({text}:{text: string}): Promise<string>{
//     // const response = await generateObject({
//     //     model: openai("gpt-4o"),
//     //     prompt: `Create a detailed and vivid image based on the following text: ${text}`,
//     //     responseFormat: { type: "base64_json" },
//     //   });

//     //   return response.object;

//     throw new Error("Not implemented");
// }

export async function image({
  text,
  chatId,
}: {
  text: string;
  chatId?: number;
}) {
  const { image } = await generateImage({
    model: openai.image('dall-e-3'),
    prompt: text,
  });

  // If chatId is provided, add the image to the buffer
  if (chatId !== undefined) {
    addAssistantMessage(chatId, {
      type: 'file',
      data: image.base64,
      mimeType: 'image/png',
    });
  }

  return image.base64;
}

export async function talk({
  chatId,
  ctx,
}: {
  chatId: number;
  ctx: Context;
}): Promise<string> {
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
      generateImage: tool({
        description: 'Generate an image based on text',
        parameters: z.object({
          text: z.string().describe('The text to generate an image from'),
        }),
        execute: async ({ text }) => {
          const imgBase64 = await image({ text, chatId });
          if (!imgBase64) {
            throw new Error('No image generated');
          }
          const imgBuffer = Buffer.from(imgBase64, 'base64');
          const imgUint8Array = new Uint8Array(imgBuffer);
          const img = new InputFile(imgUint8Array, 'image.png');
          ctx.replyWithPhoto(img);
        },
      }),
    },
  });

  // Add the assistant's response to the buffer
  addAssistantMessage(chatId, {
    type: 'text',
    text: response.text,
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

export async function t2s({ text, chatId }: { text: string; chatId?: number }) {
  const { audio } = await generateSpeech({
    model: openai.speech('tts-1'),
    text,
    voice: 'alloy',
  });

  // If chatId is provided, add the audio response to the buffer as text
  if (chatId !== undefined) {
    addAssistantMessage(chatId, {
      type: 'file',
      data: audio.base64,
      mimeType: 'audio/mpeg',
    });
  }

  return audio.base64;
}
