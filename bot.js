const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// Your token provided by Telegram
const token = '7971393473:AAHhxpn9m-KwN9VrKaVU426_e1gNjIgFJjU';

// The new API URL (use your API key as mentioned)
const apiUrl = 'https://api.navasan.tech/latest/?api_key=free7HKJj4k6FRl8XQb18vTxe1paPiB9';

// Create a new Telegram bot instance
const bot = new TelegramBot(token, { polling: true });

// Function to convert English numbers to Persian numbers
function toPersianNumbers(str) {
  const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/[0-9]/g, (digit) => persianNumbers[digit]);
}

// Function to format numbers with commas (Persian format)
function formatNumberWithCommas(number) {
  const numberString = number.toString();
  const parts = numberString.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];

  const integerWithCommas = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '،');
  return decimalPart ? `${integerWithCommas}.${decimalPart}` : integerWithCommas;
}

// Function to format the date and time
function formatPersianDateAndTime(dateString) {
  const [datePart, timePart] = dateString.split(' ');
  const formattedDate = toPersianNumbers(datePart); // Convert date to Persian
  const formattedTime = toPersianNumbers(timePart); // Convert time to Persian

  return { formattedDate, formattedTime };
}

// Function to fetch the USD buy rate and its change
async function fetchUsdRate() {
  try {
    const response = await axios.get(apiUrl);

    if (response.data && response.data['usd_buy']) {
      const usdBuyValue = response.data['usd_buy'].value;
      const usdBuyChange = response.data['usd_buy'].change;
      const usdBuyDate = response.data['usd_buy'].date;

      return {
        usdBuyValue,
        usdBuyChange,
        usdBuyDate,
      };
    } else {
      console.error('usd_buy data not found in the response');
      return null;
    }
  } catch (error) {
    console.error('Error fetching USD rate:', error.response ? error.response.data : error.message);
    return null;
  }
}

// Command handler when the user types "/usd"
bot.onText(/\/usd/, async (msg) => {
  const chatId = msg.chat.id;

  // Fetch today's USD buy rate
  const rateData = await fetchUsdRate();

  if (rateData) {
    const { usdBuyValue, usdBuyChange, usdBuyDate } = rateData;

    // Calculate yesterday's value by subtracting change from today's value
    const yesterdayUsdBuyValue = usdBuyValue - usdBuyChange;

    // Convert numbers to Persian
    const persianUsdBuyValue = toPersianNumbers(formatNumberWithCommas(usdBuyValue.toString()));
    const persianUsdBuyChange = toPersianNumbers(formatNumberWithCommas(usdBuyChange.toString()));
    const persianYesterdayUsdBuyValue = toPersianNumbers(formatNumberWithCommas(yesterdayUsdBuyValue.toString()));

    // Extract and format date and time from the API response
    const { formattedDate, formattedTime } = formatPersianDateAndTime(usdBuyDate); 

    // Calculate if the rate increased or decreased
    let changeText;
    if (usdBuyValue > yesterdayUsdBuyValue) {
      changeText = `افزایش`;
    } else if (usdBuyValue < yesterdayUsdBuyValue) {
      changeText = `کاهش`;
    } else {
      changeText = `بدون تغییر`;
    }

    // Prepare the message to send with bold formatting and Persian numerals
    const responseMessage = `
\u200F⚡️ **نرخ خرید دلار امروز**: *${persianUsdBuyValue} تومان*
📉 **نرخ دلار دیروز**: *${persianYesterdayUsdBuyValue} تومان*
📈 **نسبت تغییرات به دیروز**: *${persianUsdBuyChange} تومان ${changeText}*
📅 **تاریخ**: *${formattedDate}*
⏰ **زمان**: *${formattedTime}*
    `;
      
    // Send the response message to the user
    bot.sendMessage(chatId, responseMessage, { parse_mode: 'Markdown' });
  } else {
    bot.sendMessage(chatId, '❌ خطا در دریافت نرخ‌ها، لطفاً بعداً امتحان کنید.');
    console.error('Error fetching rates');
  }
});

console.log('Bot is running...');
