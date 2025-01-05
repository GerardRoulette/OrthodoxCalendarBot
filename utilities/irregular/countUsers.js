const { countUsers } = require("../../db/db.js");

countUsers().then(counts => console.log(`Private chats: ${counts.privateCount}, Group chats: ${counts.groupCount}`))

