const { countUsers } = require("../../db/db.js");

countUsers().then(message => console.log(message))

/* (async () => {
  try {
    const counts = await countUsers();
    console.log(`Private chats: ${counts.privateCount}, Group chats: ${counts.groupCount}`);
  } catch (error) {
    console.error('Error fetching user counts:', error);
  }
})(); */