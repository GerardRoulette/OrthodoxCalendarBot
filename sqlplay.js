const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('mybase.db'); 

// Create a table
db.serialize(() => {

  // Insert data
  const stmt = db.prepare("INSERT INTO users (name, age, email) VALUES (?, ?, ?)");
  stmt.run('Alice', 30, 'alice@example.com');
  stmt.run('Bob', 25, 'bob@example.com');
  stmt.finalize();

  // Query data
  db.each("SELECT id, name, age, email FROM users", (err, row) => {
    console.log(row.id + ": " + row.name + ", " + row.age + ", " + row.email);
  });
});

// Close the database connection
db.close();