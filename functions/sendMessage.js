require('dotenv').config();
const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');
const { getMessageByDate, getAllUsers, getUserSettings } = require('../db/db.js');
const { bot } = require('../utilities/bot.js')

// храним Мап с расписаниями для удаления и добавления по одному вместо всех сразу
const scheduleMap = new Map();
const rootFolder = path.resolve(__dirname, '../');
const scheduleFile = path.join(rootFolder, 'schedule.json');

/* 
---------
Отмена одного конкретного расписания по чат айди
---------
*/
function cancelSchedule(chatId) {
  const scheduleEntry = scheduleMap.get(chatId);
  if (scheduleEntry && scheduleEntry.job) {
    scheduleEntry.job.cancel(); 
    scheduleMap.delete(chatId);
    saveSchedules();
  }
}

/* 
---------
Запись мапа с расписаниями в schedule.json
---------
*/
function saveSchedules() {
  const schedules = Array.from(scheduleMap.entries()).map(([chatId, job]) => ({
    chatId,
    cronExpression: job.cronExpression, 
  }));
  fs.writeFileSync(scheduleFile, JSON.stringify(schedules, null, 2));
}

/* 
---------
Базовое создание расписания
---------
*/
function scheduleMessage(chatId, timezone, preferredTime) {
  const [hour, minute] = preferredTime.split(':').map(Number);

  // я плохо дружу с математикой, так что заметки для себя чтобы не забыть что для чего нужно
  const integerTimezone = Math.floor(timezone); // целое число в случае если таймзона типа 4.5
  const fractionalTimezone = timezone - integerTimezone; // остаток если он есть, иначе 0

  const adjustedMinute = minute - (fractionalTimezone * 60); // вычитаем условный 0.5 в виде 30 минут от минут пользователя
  
  const adjustedHour = (hour - integerTimezone + 3 + 24) % 24; 
  // 3 - таймзона сервера. +24 чтобы число точно было положительное. % 24 чтобы убрать лишние часы
  // 2:00 - 5 (utc+5) + 3 
  // то есть 2 часа локал времени юзера - 5 таймзоны + 3 сервера = 0
  // т.е. 2 часа в UTC+5 будут полночью по времени сервера
  // +24 % 24 в случае если негативное число получилось 

  const finalMinute = (adjustedMinute + 60) % 60; // +60 % 60 в случае если adjustedMinute негативное число
  const carryOverHour = adjustedMinute < 0 ? -1 : 0; // если добавленные минуты добавляют час)
  const finalHour = (adjustedHour + carryOverHour + 24) % 24; // та же логика что выше

  const cronExpression = `${finalMinute} ${finalHour} * * *`;

  // отмена существующего расписания если оно есть в мапе (если нет ничего не случится, ошибки не будет)
  cancelSchedule(chatId);

  const job = schedule.scheduleJob(cronExpression, async () => {
    // тут идея в том чтобы юзер получал календарь именно той даты которая ему нужна
    const nowUTC = new Date(Date.now() - 3 * 60 * 60 * 1000); // Convert server time (UTC+3) to UTC
    const userTime = new Date(nowUTC.getTime() + timezone * 60 * 60 * 1000);
    const userDate = userTime.toISOString().split('T')[0]; // Extract YYYY-MM-DD format
    const message = await getMessageByDate(userDate);

    if (message) {
      bot.api.sendMessage(chatId, message, {
        parse_mode: 'HTML', 
        disable_web_page_preview: true
      });
    }
  });

  // сохраняем в мап, сейвим
  scheduleMap.set(chatId, { cronExpression, job });
  saveSchedules();
}


/* 
---------
Пересоздание всех расписаний из JSON
---------
*/
async function restoreSchedules() { 
  if (fs.existsSync(scheduleFile)) {
    const schedules = JSON.parse(fs.readFileSync(scheduleFile, 'utf-8'));
    for (const { chatId } of schedules) {
      const user = await getUserSettings(chatId); 
      if (user) {
        scheduleMessage(chatId, user.timezone, user.preferredTime);
      }
    }
  }
}

/* 
---------
Пересоздание всех расписаний из БД
---------
*/
async function scheduleAllUsers() {
  try {
    const users = await getAllUsers();
    for (const user of users) {
      const { chatId, timezone, preferredTime } = user; 
      scheduleMessage(chatId, timezone, preferredTime);
    }
    saveSchedules()
    console.log('scheduleAllUsers() - All user schedules have been created successfully!');
  } catch (error) {
    console.error('scheduleAllUsers() - Error creating schedules for all users:', error);
  }
}

async function sendMessageToEveryone(message) {
  const users = await getAllUsers();
    for (const user of users) {
      try {
          await bot.api.sendMessage(user.chatId, message, {
            parse_mode: 'HTML', 
            disable_web_page_preview: true
          });
      } catch (err) {
          console.error(`Failed to send message to user: ${user.chatId}`, err);
      }
  }
  }



module.exports = {
  restoreSchedules,
  scheduleMessage,
  cancelSchedule,
  saveSchedules,
  scheduleAllUsers,
  sendMessageToEveryone
}