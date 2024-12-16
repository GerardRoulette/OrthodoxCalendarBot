const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.db');

// создать таблицу если ее нет
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    chatId INTEGER PRIMARY KEY,
    timezone REAL DEFAULT '3',
    preferredTime TEXT DEFAULT '08:30',
    userInfo TEXT
  )`);
});

// добавляем юзера
function addUser(chatId, userInfo) {
  const stmt = db.prepare("INSERT OR REPLACE INTO users (chatId, userInfo) VALUES (?, ?)");
  stmt.run(chatId, userInfo);
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

module.exports = {
  addUser,
  removeUser,
  updateTimezone,
  updatePreferredTime,
  countUsers,
  db
};