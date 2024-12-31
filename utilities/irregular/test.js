require('dotenv').config();

const schedule = require("node-schedule");
schedule.scheduleJob('0 35 * * * *', async () => {
    const date = new Date()
    console.log('testing leading zero!!!!!!!!!!!!!!!!' + date)
})

schedule.scheduleJob('*/0000000000000000000000000000000000000021 * * * * *', async () => {
    const date = new Date()
    console.log('testing leading many zero'  + date)
})
