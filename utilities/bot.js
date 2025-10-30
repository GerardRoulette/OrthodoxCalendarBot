const path = require('path');
const dotenv = require('dotenv');
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });
const { onlyAdmin } = require('./onlyAdmin.js')
const { Bot, InlineKeyboard, GrammyError, session } = require('grammy');
const { autoRetry } = require('@grammyjs/auto-retry');
const { hydrate } = require('@grammyjs/hydrate');
const https = require('https');
const dns = require('dns');

// у хостера проблема с IPv6 и телеграмом, форсим ipv4
dns.setDefaultResultOrder('ipv4first');

// кастомный https агент
const httpsAgent = new https.Agent({
  family: 4,  // форсим ipv4
  keepAlive: true
});

// конфиг бота
const bot = new Bot(process.env.BOT_API_KEY, {
  client: {
    baseFetchConfig: {
      agent: httpsAgent  // для всех https реквестов - только ipv4
    }
  }
}); 

bot.api.config.use(autoRetry()); // обход ошибок во время бродкастов изза слишком большого количества сообщений в секунду

bot.use(hydrate()); // редактирование сообщений 

bot.use(
 onlyAdmin(), // в групповых чатах дает применят команды только админам
 // чуть чуть подпиленное решение от https://github.com/backmeupplz/grammy-middlewares
);



bot.use(session({
    initial: () => ({}), // сессия для запроса времени
  }));

// логи ошибок
bot.catch(async (err) => {
  const ctx = err.ctx;
  console.error(`Error while handling update ${ctx.update.update_id}:`);
  
  const errorTrackerChat = process.env.ERROR_TRACKER;
  let errorMessage = `Error while handling update ${ctx.update.update_id}:\n`;
  
  if (err instanceof GrammyError) {
    console.error('Error in request:', err.description);
    errorMessage += `GrammyError: ${err.description}`;
  } else {
    console.error(err);
    errorMessage += `Error: ${err.message || 'Unknown error'}`;
  }
  
  // Send error to tracker if available
  if (errorTrackerChat) {
    try {
      const maxLength = 4000;
      const truncatedError = errorMessage.length > maxLength
        ? errorMessage.substring(0, maxLength) + '... (truncated)'
        : errorMessage;
      await bot.api.sendMessage(errorTrackerChat, `bot.catch() - ОШИБКА: ${truncatedError}`);
    } catch (sendError) {
      console.error('Failed to send error notification:', sendError.message);
    }
  }
});

module.exports = { bot, InlineKeyboard };
