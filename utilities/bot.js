const { Bot, InlineKeyboard, GrammyError, session } = require('grammy');
const { autoRetry } = require('@grammyjs/auto-retry');
const { hydrate } = require('@grammyjs/hydrate');

const bot = new Bot(process.env.BOT_API_KEY); 

bot.api.config.use(autoRetry());

bot.use(hydrate());


bot.use(session({
    initial: () => ({}), // сессия для запроса времени
  }));

// логи ошибок
bot.catch((err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  if (err instanceof GrammyError) {
    console.error('Error in request:', err.description);
  } else {
    console.error(err);
  }
});

module.exports = { bot, InlineKeyboard };
