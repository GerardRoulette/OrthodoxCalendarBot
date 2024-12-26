const { getMessageByDate } = require('../../db/db.js');

const message = getMessageByDate('2024-12-26')
console.log(message)