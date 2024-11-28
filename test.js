require('dotenv').config();
const fs = require('fs');
const path = require('path');
const dateFile = path.join(__dirname, 'date.json');
//const date = JSON.parse(fs.readFileSync(path.join(__dirname, 'date.json')))[0];
// console.log(date.abstractDate)

let today = new Date();
let year = today.getUTCFullYear();
let month = today.getUTCMonth() + 1;
let day = today.getUTCDate();
let testtt = true;
console.log(year + ' ' + month + ' ' + day)
console.log(`test ${testtt ? '1' : '2'}`)
/* async function getData() {
  const url = `https://azbyka.ru/days/api/day?date%5Bexact%5D=${year}-${month}-${day}`;
  try {
    const response = await fetch(url, {
      headers: {
          'authorization': `Bearer ${process.env.AZBYKA_API_KEY}`
      }
    });
    if (!response.ok) {
      throw new Error(`Response status: ${response.status} --- ${response.text}`);
    }
    
    const json = await response.json();
    console.table(json);
    fs.writeFileSync(date, JSON.stringify(json, null, 2), 'utf8');
  } catch (error) {
    console.error(error.message);
  }
}

getData() */