/*
------------

Источник - https://github.com/backmeupplz/grammy-middlewares
При установке пакетом вылетали 403 ошибки в сценарии "бота удалили из группы" из-за того что бот пытался использовать getChatMember уже после кика
Как следствие, не исполнялись removeUser и deleteSchedule
Обернул в try...catch, стало работать
Но остальные 99% авторства - выше

------------
*/

const onlyAdmin = (errorHandler) => async (ctx, next) => {
  // No chat = no service
  if (!ctx.chat) {
    return next(); // Ensure continuation
  }

  // Channels and private chats are only postable by admins
  if (['channel', 'private'].includes(ctx.chat.type)) {
    return next(); // Ensure continuation
  }

  // Anonymous users are always admins
  if (ctx.from?.username === 'GroupAnonymousBot') {
    return next(); // Ensure continuation
  }

  // Surely not an admin
  if (!ctx.from?.id) {
    return next(); // Ensure continuation
  }

  try {
    // Check the member status
    const chatMember = await ctx.getChatMember(ctx.from.id);
    if (['creator', 'administrator'].includes(chatMember.status)) {
      return next(); // Allow continuation if admin
    }
  } catch (err) {
    if (err.message.includes('bot was kicked')) {
      // Ensure continuation for further handlers
      return next();
    } else {
      console.error('Failed to fetch chat member info:', err);
      return next(); // Ensure continuation even on other errors
    }
  }

  // Not an admin
  if (errorHandler) {
    return errorHandler(ctx);
  } /* else {
    // Stop further processing if no error handler is provided
    ctx.reply("Only admins can use this bot.");
  } */
};


module.exports = { onlyAdmin };