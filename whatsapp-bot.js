const axios = require('axios');
const cookie = require('cookie');
const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');
require('dotenv').config();

const client = new Client({ authStrategy: new LocalAuth() });

const apiUrl = process.env.API_URL;
const apiBodyTemplate = JSON.parse(process.env.API_BODY);
const cookies = process.env.COOKIES;

const parsedCookies = cookie.parse(cookies);
const cookieString = Object.entries(parsedCookies)
  .map(([key, value]) => `${key}=${value}`)
  .join('; ');

const userStates = {}; // Object to track states for each user or group participant

async function fetchVehicleDetails(vehicleNumber) {

  try {
    const apiBody = { ...apiBodyTemplate, Props: [vehicleNumber] };

    const response = await axios.post(apiUrl, apiBody, {
      headers: {
        'Cookie': cookieString,
        'Content-Type': 'application/json',
      },
    });

    // Remove unnecessary fields
    delete response.data.transKey;
    delete response.data.message;
    delete response.data.description;
    delete response.data.response.transKey;
    delete response.data.response.statusDesc;
    delete response.data.response.dataStatus;
    delete response.data.response.eDate;
    delete response.data.response.lmDate;
    delete response.data.response.manufacturerMonthYear;
    delete response.data.response.manufacturerYear;
    delete response.data.response.vehicleAge;

    delete response.data.response.puccNumber;
    delete response.data.response.puccValidUpto;
    delete response.data.response.presentAddress;
    delete response.data.response.insuranceExpired;
    delete response.data.response.status;

    return response.data;
  } catch (error) {
    console.error('Error making the API request:', error.message);
    throw error;
  }
}

function logToFile(user, command, response) {
  const logEntry = `${new Date().toISOString()} - User: ${user}, Command: ${command}, Response: ${JSON.stringify(response, null, 2)}\n`;
  fs.appendFileSync('bot_logs.txt', logEntry, 'utf8');
}

client.on('qr', qr => {
  console.log('QR RECEIVED', qr);
});

client.on('ready', () => {
  console.log('CLIENT IS READY');
});

async function formatVehicleDetails(responseData) {
    // Destructure the response object
    const {
      regNo,
      rtoCode,
      regAuthority,
      chassis,
      engine,
      regDate,
      vehicleClass,
      permAddress,
      manufacturer,
      vehicle,
      vehicleType,
      variant,
      fuelType,
      cubicCapacity,
      owner,
      ownerFatherName,
      financerName,
      insuranceCompanyName,
      insurancePolicyNumber,
      insuranceUpto,
      pincode,
    } = responseData.response;
  
    // Format the details into a readable string
    return `
  *Vehicle registration Details:*

  
  *📆Registration Number:* ${regNo}
  *🏢RTO Code:* ${rtoCode}
  *🏢Registration Authority:* ${regAuthority}
  *🔎Chassis Number:* ${chassis}
  *🔧Engine Number:* ${engine}
  *📆Registration Date:* ${regDate}

    *vehicle address*

  *🏘️Permanent Address:* ${permAddress}
  *📮Pincode:* ${pincode}

   *car details*

  *🚗Vehicle Class:* ${vehicleClass}
  *🏢Manufacturer:* ${manufacturer}
  *🚙Vehicle Model:* ${vehicle}
  *🚘Vehicle Type:* ${vehicleType}
  *🛞Variant:* ${variant}
  *⛽Fuel Type:* ${fuelType}
  *🔩Cubic Capacity:* ${cubicCapacity} cc

   *owners details*

  *🙍‍♂️Owner Name:* ${owner}
  *👴Owner's Father Name:* ${ownerFatherName}
  *💼Financer Name:* ${financerName}

   *insurance policy details*
   
  *📝Insurance Company:* ${insuranceCompanyName}
  *🗒️insurance policy no:* ${insurancePolicyNumber}
  *📒Insurance Valid Upto:* ${insuranceUpto}`;
  }
  
  client.on('message', async message => {
    const lowercasedMessage = message.body.toLowerCase();
    const chatId = message.from;
    const userId = message.author || message.from;
    const uniqueId = `${chatId}:${userId}`;
  
    if (userStates[uniqueId] && userStates[uniqueId].awaitingVehicleNumber) {
      const vehicleNumber = message.body.trim();

      try {
        const vehicleDetails = await fetchVehicleDetails(vehicleNumber);
        userStates[uniqueId].awaitingVehicleNumber = false;
  
        const formattedDetails = await formatVehicleDetails(vehicleDetails);
        await message.reply(formattedDetails);
        logToFile(uniqueId, vehicleNumber, vehicleDetails);
      } catch (error) {
        userStates[uniqueId].awaitingVehicleNumber = false;
        await message.reply('Oops, we don\'t have data.');
        logToFile(uniqueId, vehicleNumber, { error: error.message });
      }
  } else if (lowercasedMessage.includes('hello')) {
    await message.reply('Hello! How can I help you today?');
  } else if (lowercasedMessage.includes('bye')) {
    await message.reply('Goodbye! Have a great day!');
  } else if (lowercasedMessage.includes('help')) {
    await message.reply('First send a command to the bot "search vehicle" then enter a registered vehicle number.');
  } else if (lowercasedMessage.includes('developer')) {
    await message.reply('My developer is Kevin AKA Ayush Kumar Barnwal.');
  } else if (lowercasedMessage.includes('start')) {
    await message.reply('kiis colour ki chaddi pahne ho');
  } else if (lowercasedMessage.includes('name')) {
    await message.reply('My name is CyberRakshak_Bot.');
  } else if (lowercasedMessage.includes('search vehicle')) {
    userStates[uniqueId] = { awaitingVehicleNumber: true }; // Set user-specific state
    await message.reply('Please enter the vehicle registration number.');
  } else {
    await message.reply('I\'m not sure how to respond to that. Can you please try again?');
  }
});

client.initialize();
