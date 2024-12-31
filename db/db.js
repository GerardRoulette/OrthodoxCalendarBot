const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const dbPath = path.resolve(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

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
async function addUser(chatId, userInfo, chatType) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(
      "INSERT OR REPLACE INTO users (chatId, userInfo, chatType) VALUES (?, ?, ?)"
    );
    stmt.run(chatId, userInfo, chatType, function (err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
    stmt.finalize();
  });
}

// удаляем юзера
async function removeUser(chatId) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare("DELETE FROM users WHERE chatId = ?");
    stmt.run(chatId, function (err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
    stmt.finalize();
  });
}

// меняем timezone для юзера
async function updateTimezone(chatId, timezone) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare("UPDATE users SET timezone = ? WHERE chatId = ?");
    stmt.run(timezone, chatId, function (err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
    stmt.finalize();
  });
}

// меняем preferredTime для юзера
async function updatePreferredTime(chatId, preferredTime) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare("UPDATE users SET preferredTime = ? WHERE chatId = ?");
    stmt.run(preferredTime, chatId, function (err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
    stmt.finalize();
  });
}

// считаем юзеров
async function countUsers() {
  return new Promise((resolve, reject) => {
    db.get("SELECT COUNT(*) AS count FROM users", (err, row) => {
      if (err) reject(err);
      else resolve(row.count);
    });
  });
}

// добавляем сообщения дня в БД
async function updateData(date, message) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`
      INSERT INTO data (date, message)
      VALUES (?, ?)
      ON CONFLICT(date) DO UPDATE SET message=excluded.message;
    `);
    stmt.run(date, message, function (err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
    stmt.finalize();
  });
}

// удаляем устаревшие сообщения дня из БД
async function deleteOutdatedData(currentDate) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare("DELETE FROM data WHERE date < ?");
    stmt.run(currentDate, function (err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
    stmt.finalize();
  });
}

// получаем последней даты из базы данных
async function getLatestDate() {
  return new Promise((resolve, reject) => {
    db.get("SELECT MAX(date) AS latestDate FROM data", (err, row) => {
      if (err) reject(err);
      else resolve(row.latestDate);
    });
  });
}

// получаем сообщение по дате
async function getMessageByDate(date) {
  return new Promise((resolve, reject) => {
    db.get("SELECT message FROM data WHERE date = ?", [date], (err, row) => {
      if (err) reject(err);
      else resolve(row ? row.message : null);
    });
  });
}

// получаем текущие настройки юзера
async function getUserSettings(chatId, fields = ['preferredTime', 'timezone']) {
  const allowedFields = ['preferredTime', 'timezone'];
  const selectedFields = fields.filter(field => allowedFields.includes(field));

  if (selectedFields.length === 0) {
    throw new Error("Invalid fields requested.");
  }

  const query = `SELECT ${selectedFields.join(', ')} FROM users WHERE chatId = ?`;

  return new Promise((resolve, reject) => {
    db.get(query, [chatId], (err, row) => {
      if (err) {
        return reject(err);
      }
      if (!row) {
        return reject(new Error("User not found."));
      }
      resolve(row);
    });
  });
}

// получаем данные по всем юзерам
async function getAllUsers() {
  return new Promise((resolve, reject) => {
    db.all("SELECT chatId, timezone, preferredTime FROM users", (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
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
  getMessageByDate,
  getUserSettings,
  getAllUsers,
  db
};