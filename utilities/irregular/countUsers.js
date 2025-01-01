const { countUsers } = require("../../db/db.js");

countUsers().then(message => console.log(message))