require('dotenv').config();
const fs = require('fs');
const path = require('path');

const date = path.join(__dirname, 'date.json');


async function getData() {
  const url = "https://azbyka.ru/days/api/day?date%5Bexact%5D=2024-11-25";
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

getData()