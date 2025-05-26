import type { Context, NextFunction } from 'grammy';
import { getFullName } from './getFullName';
import { getOrThrow } from './utils';

const listAuthorizedUsers = getOrThrow('AUTHORIZED_USERS').split(',');
const admin = listAuthorizedUsers[0];

export async function authorizedUsers(ctx: Context, next: NextFunction): Promise<void> {
  if (
    ctx.from &&
    (listAuthorizedUsers.includes(ctx.from.id.toString()) || listAuthorizedUsers.includes('*'))
  ) {
    await next();
  } else {
    ctx.reply('You are not authorized to use this bot');
    ctx.api.sendMessage(
      admin,
      `Unauthorized user tried to use the bot: ${getFullName(ctx)} (tg://user?id=${ctx.from?.id})`
    );
  }
}

export function getAdminChatId(): string {
  return admin;
}
