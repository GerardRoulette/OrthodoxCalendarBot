const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.db');

// создать таблицу если ее нет
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    chatId INTEGER PRIMARY KEY,
    timezone REAL DEFAULT '3',
    preferredTime TEXT DEFAULT '08:30',
    userInfo TEXT,
    chatType TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS data (
    date TEXT PRIMARY KEY,
    message TEXT
  )`);
});

// добавляем юзера
function addUser(chatId, userInfo, chatType) {
  const stmt = db.prepare("INSERT OR REPLACE INTO users (chatId, userInfo, chatType) VALUES (?, ?, ?)");
  stmt.run(chatId, userInfo, chatType);
  stmt.finalize();
}
// удаляем юзера
function removeUser(chatId) {
  const stmt = db.prepare("DELETE FROM users WHERE chatId = ?");
  stmt.run(chatId);
  stmt.finalize();
}
// меняем timezone для юзера
function updateTimezone(chatId, timezone) {
  const stmt = db.prepare("UPDATE users SET timezone = ? WHERE chatId = ?");
  stmt.run(timezone, chatId);
  stmt.finalize();
}

// меняем preferredTime для юзера
function updatePreferredTime(chatId, preferredTime) {
  const stmt = db.prepare("UPDATE users SET preferredTime = ? WHERE chatId = ?");
  stmt.run(preferredTime, chatId);
  stmt.finalize();
}
// считаем юзеров
function countUsers(callback) {
  db.get("SELECT COUNT(*) AS count FROM users", (err, row) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, row.count);
    }
  });
}
// добавляем сообщения дня в БД
function updateData(date, message) {
  const stmt = db.prepare(`
    INSERT INTO data (date, message)
    VALUES (?, ?)
    ON CONFLICT(date) DO UPDATE SET
    message=excluded.message;
  `);
  stmt.run(date, message);
  stmt.finalize();
}

// удаляем устаревшие сообщения дня из БД
function deleteOutdatedData(currentDate) {
  const stmt = db.prepare(`
    DELETE FROM data WHERE date < ?;
  `);
  stmt.run(currentDate);
  stmt.finalize();
}

// получаем последней даты из базы данных
function getLatestDate(callback) {
  db.get("SELECT MAX(date) AS latestDate FROM data", (err, row) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, row.latestDate);
    }
  });
}

module.exports = {
  addUser,
  removeUser,
  updateTimezone,
  updatePreferredTime,
  countUsers,
  updateData,
  deleteOutdatedData,
  getLatestDate,
  db
};