require('dotenv').config();
const fs = require('fs');
const path = require('path');
// Ensure you have node-fetch installed

const dateFile = path.join(__dirname, 'saintsJfToday.json');

let today = new Date();
let year = today.getUTCFullYear();
let month = today.getUTCMonth() + 1;
let day = today.getUTCDate();

console.log(`Year: ${year}, Month: ${month}, Day: ${day}`);

async function getData() {
  const url = `https://azbyka.ru/days/api/day?date%5Bexact%5D=2024-11-30`;
  try {
    const response = await fetch(url, {
      headers: {
        'authorization': `Bearer ${process.env.AZBYKA_API_KEY}`
      }
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Response status: ${response.status} --- ${errorText}`);
    }
    console.log(process.env.AZBYKA_API_KEY)
    const json = await response.json();
    console.table(json);
    fs.writeFileSync(dateFile, JSON.stringify(json, null, 2), 'utf8');
    console.log('Data written to file successfully');
  } catch (error) {
    console.error('Error fetching data:', error.message);
  }
}

getData();