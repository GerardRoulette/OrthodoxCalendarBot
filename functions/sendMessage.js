require('dotenv').config();
const { Bot } = require('grammy');
const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');
const { db, getMessageByDate } = require('../db/db.js');
const { autoRetry } = require("@grammyjs/auto-retry");

const bot = new Bot(process.env.BOT_API_KEY); // инициализация бота

// храним Мап с расписаниями для удаления и добавления по одному вместо всех сразу
const scheduleMap = new Map();
const scheduleFile = './schedule.json'

// Отмена одного конкретного расписания по чат айди
function cancelSchedule(chatId) {
    if (scheduleMap.has(chatId)) {
        scheduleMap.get(chatId).cancel();
        scheduleMap.delete(chatId);
        saveSchedules();
    }
}

// запись Мапа с расписаниями в JSON
function saveSchedules() {
    const schedules = Array.from(scheduleMap.entries()).map(([chatId, job]) => ({
        chatId,
        nextInvocation: job.nextInvocation().toISOString(),
    }));
    fs.writeFileSync(scheduleFile, JSON.stringify(schedules, null, 2));
}

// пересоздание всех расписаний
function restoreSchedules() {
    if (fs.existsSync(scheduleFile)) {
        const schedules = JSON.parse(fs.readFileSync(scheduleFile, 'utf-8'));
        schedules.forEach(({ chatId, nextInvocation }) => {
            const jobTime = new Date(nextInvocation);
            if (jobTime > new Date()) {
                scheduleMessage(chatId, ...getUserDetails(chatId)); // Fetch user details from DB
            }
        });
    }
}


function scheduleMessage(chatId, timezone, preferredTime) {
    const [hour, minute] = preferredTime.split(':').map(Number);
    
    // вычисляем preferredtime в utc+0
  const utcPreferredTime = new Date();
  utcPreferredTime.setUTCHours(hour - timezone, minute, 0, 0);

  // конвертируем во время сервера (+3 Москва)
  const serverTime = new Date(utcPreferredTime);
  serverTime.setHours(serverTime.getHours() + 3); // Convert from UTC+0 to server local time

  // если время уже прошло, ставим на следующий
  if (serverTime < new Date()) {
    serverTime.setDate(serverTime.getDate() + 1);
  }

  
    // отмена существующего расписания если оно есть в мапе (если нет ничего не случится, ошибки не будет)
    cancelSchedule(chatId);
  
    const job = schedule.scheduleJob(serverTime, async () => {
    // тут идея в том чтобы юзер получал календарь именно той даты которая ему нужна
      const userDate = new Date(new Date().toLocaleDateString('en-CA', { timeZone: `UTC${timezone >= 0 ? '+' : ''}${timezone}` }));
      const messageData = await getMessageByDate(userDate.toISOString().split('T')[0]);
      if (messageData) {
        bot.telegram.sendMessage(chatId, messageData.message, { parse_mode: 'HTML' });
      }
    });
  
    scheduleMap.set(chatId, job);
    saveSchedules();
  }



bot.api.config.use(autoRetry());

// sendInfoNow();
// bot.start();

module.exports = {
    restoreSchedules,
    scheduleMessage,
    cancelSchedule,
    saveSchedules
}