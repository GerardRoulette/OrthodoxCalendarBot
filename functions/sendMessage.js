require('dotenv').config();
const fs = require('fs');
const path = require('path');
const schedule = require('node-schedule');
const { db, getMessageByDate, getAllUsers } = require('../db/db.js');
const { bot } = require('../utilities/bot.js')

// храним Мап с расписаниями для удаления и добавления по одному вместо всех сразу
const scheduleMap = new Map();
const rootFolder = path.resolve(__dirname, '../');
const scheduleFile = path.join(rootFolder, 'schedule.json');

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


function scheduleMessage(chatId, timezone, preferredTime) {
  console.log(`chatid: ${chatId} // timezone: ${timezone} // preftime: ${preferredTime}`)
  const [hour, minute] = preferredTime.split(':').map(Number);
  const localHour = (hour - timezone + 3 + 24) % 24;
  // 3 - таймзона сервера. +24 чтобы число точно было положительное. % 24 чтобы убрать лишние часы
  // 2:00 - 5 (utc+5) + 3 
  // то есть 2 часа локал времени юзера - 5 таймзоны + 3 сервера = 0
  // т.е. 2 часа в UTC+5 будут полночью по времени сервера
  // +24 % 24 в случае если негативное число получилось 
  const cronExpression = `${minute} ${localHour} * * *`;

  // отмена существующего расписания если оно есть в мапе (если нет ничего не случится, ошибки не будет)
  cancelSchedule(chatId);

  const job = schedule.scheduleJob(cronExpression, async () => {
    // тут идея в том чтобы юзер получал календарь именно той даты которая ему нужна
    const userDate = new Date(
      new Date().toLocaleDateString('en-CA', {
        timeZone: `Etc/GMT${timezone > 0 ? '-' : '+'}${Math.abs(timezone)}`,
      }))
    const message = await getMessageByDate(userDate.toISOString().split('T')[0]);

    if (message) {
      bot.api.sendMessage(chatId, message, {
        parse_mode: 'HTML', disable_web_page_preview: true
      });
    }
  });

  // сохраняем в мап, сейвим
  scheduleMap.set(chatId, job);
  saveSchedules();
}


// пересоздание всех расписаний из JSON
function restoreSchedules() {
  if (fs.existsSync(scheduleFile)) {
    const schedules = JSON.parse(fs.readFileSync(scheduleFile, 'utf-8'));
    schedules.forEach(({ chatId, nextInvocation }) => {
      const jobTime = new Date(nextInvocation);
      if (jobTime > new Date()) {
        scheduleMessage(chatId, ...getUserDetails(chatId)); // 
      }
    });
  }
}
async function scheduleAllUsers() {
  try {
    const users = await getAllUsers();
    for (const user of users) {
      const { chatId, timezone, preferredTime } = user; 
      scheduleMessage(chatId, timezone, preferredTime);
    }
    saveSchedules()
    console.log('All user schedules have been created successfully!');
  } catch (error) {
    console.error('Error creating schedules for all users:', error);
  }
}

async function sendMessageToEveryone(message) {
  const users = await getAllUsers();
  for (const user of users) {
    const { chatId } = user;
    bot.api.sendMessage(chatId, message, {
      parse_mode: 'HTML', disable_web_page_preview: true
    });
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