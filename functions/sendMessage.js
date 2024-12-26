require('dotenv').config();
const { Bot } = require('grammy');
const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');
const { getMessageByDate } = require('../db/db.js');
const { autoRetry } = require("@grammyjs/auto-retry");

const bot = new Bot(process.env.BOT_API_KEY); // инициализация бота

// храним Мап с расписаниями для удаления и добавления по одному вместо всех сразу
const scheduleMap = new Map();
const scheduleFile = './schedule.json'

// Отмена одного конкретного расписания по чат айди
function cancelMessage(chatId) {
    if (scheduleMap.has(chatId)) {
        scheduleMap.get(chatId).cancel();
        scheduleMap.delete(chatId);
        persistSchedules();
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

// TEST
function scheduleMessage(chatId, timezone, preferredTime) {
    const [hour, minute] = preferredTime.split(':').map(Number);
    const utcOffset = timezone - 3; 
    const scheduleTime = new Date();
    
    scheduleTime.setUTCHours(hour - utcOffset, minute, 0, 0); // User's local time in UTC
  
    if (scheduleTime < new Date()) {
      scheduleTime.setDate(scheduleTime.getDate() + 1); // Adjust for next day if time has passed
    }
  
    // Cancel existing job if any
    cancelMessage(chatId);
  
    const job = schedule.scheduleJob(scheduleTime, async () => {
      const userDate = new Date(new Date().toLocaleDateString('en-CA', { timeZone: `UTC${timezone >= 0 ? '+' : ''}${timezone}` }));
      const messageData = await getMessageByDate(userDate.toISOString().split('T')[0]);
      if (messageData) {
        bot.telegram.sendMessage(chatId, messageData.message, { parse_mode: 'HTML' });
      }
    });
  
    scheduleMap.set(chatId, job);
    saveSchedules();
  }
// STOP TEST


bot.api.config.use(autoRetry());

// sendInfoNow();
// bot.start();

module.exports = {
    restoreSchedules
}