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

// Function to add a new user
function addUser(chatId, userInfo) {
  const stmt = db.prepare("INSERT OR REPLACE INTO users (chatId, userInfo) VALUES (?, ?)");
  stmt.run(chatId, JSON.stringify(userInfo));
  stmt.finalize();
}

module.exports = {
  addUser,
  db
};