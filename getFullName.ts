import type { Context } from "grammy";

export function getFullName(ctx: Context) {
    return `${ctx.from?.first_name ?? ''}${ctx.from?.last_name ? ` ${ctx.from?.last_name}` : ''}`;
}
