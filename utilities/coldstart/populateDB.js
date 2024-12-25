require('dotenv').config();
const fs = require('fs');
const { Bot } = require('grammy'); 
const { db, addUser } = require('../../db/db.js');
const bot = new Bot(process.env.BOT_API_KEY); 

// файл с чат айди
const chats = JSON.parse(fs.readFileSync('chats.json', 'utf8'));

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms)); // боюсь заспамить АПИ телеги


async function processChats() {
  for (const chatId of chats) {
    // чек на тему есть ли чат айди в БД
    db.get(`SELECT chatId FROM users WHERE chatId = ?`, [chatId], async (err, row) => {
      if (err) {
        console.error(`Database error for chat ID ${chatId}:`, err.message);
        return;
      }

      if (!row) {
        try {
          // забираем данные о чате с ТГ АПИ
          const chat = await bot.api.getChat(chatId);
          let userInfo, chatType;

          if (chat.type === 'private') {
            userInfo = `Name: ${chat.first_name || ''} ${chat.last_name || ''} // Username: @${chat.username || 'N/A'} // Lang: ${chat.language_code || 'N/A'}`;
            chatType = 'PRIVATE';
          } else {
            userInfo = `Group Name: ${chat.title} // Group ID: ${chat.id}`;
            chatType = 'GROUP';
          }

          // добавляем юзера в БД
          addUser(chatId, userInfo, chatType);
        } catch (error) {
          console.error(`Failed to fetch chat info for chat ID ${chatId}:`, error.message);
        }
      } else {
        console.log(`Chat ID ${chatId} already exists in the database.`);
      }
    });
    await delay(1000);
  }
}

processChats();