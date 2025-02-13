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
  // Split the number to add commas for thousands
  const numberString = number.toString();
  const parts = numberString.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];

  const integerWithCommas = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '،');
  return decimalPart ? `${integerWithCommas}.${decimalPart}` : integerWithCommas;
}

// Function to format the date and convert its numerals to Persian
function formatPersianDate(dateString) {
  const date = new Date(dateString); // Convert to Date object
  const formattedDate = date.toISOString().replace('T', ' ').slice(0, 19); // Get YYYY-MM-DD HH:MM:SS
  return toPersianNumbers(formattedDate); // Convert all numbers in the date to Persian
}

// Function to fetch the USD buy rate and its change
async function fetchUsdRate() {
  try {
    const response = await axios.get(apiUrl);

    console.log('API Response:', response.data); // Log the full response for debugging

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

// Function to fetch yesterday's value
async function fetchYesterdayUsdRate() {
  try {
    const response = await axios.get(`${apiUrl}?date=yesterday`);

    if (response.data && response.data['usd_buy']) {
      const usdBuyValue = response.data['usd_buy'].value;

      return usdBuyValue;
    } else {
      console.error('usd_buy data for yesterday not found in the response');
      return null;
    }
  } catch (error) {
    console.error('Error fetching yesterday\'s USD rate:', error.response ? error.response.data : error.message);
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

    // Fetch yesterday's USD buy rate for comparison
    const yesterdayUsdBuyValue = await fetchYesterdayUsdRate();

    if (yesterdayUsdBuyValue !== null) {
      const persianUsdBuyValue = toPersianNumbers(formatNumberWithCommas(usdBuyValue.toString()));
      const persianUsdBuyChange = toPersianNumbers(formatNumberWithCommas(usdBuyChange.toString()));
      const persianYesterdayUsdBuyValue = toPersianNumbers(formatNumberWithCommas(yesterdayUsdBuyValue.toString()));

      // Calculate the change between today and yesterday
      const changeFromYesterday = usdBuyValue - yesterdayUsdBuyValue;
      const persianChangeFromYesterday = toPersianNumbers(formatNumberWithCommas(changeFromYesterday.toString()));

      // Format the date properly in Persian numerals
      const persianUsdBuyDate = formatPersianDate(usdBuyDate); // Format and convert date to Persian numerals

      // Prepare the message to send with bold formatting and Persian numerals
      const responseMessage = `
⚡️ **نرخ خرید دلار امروز**: *${persianUsdBuyValue} تومان*
📈 **نسبت تغییرات به دیروز**: *${persianChangeFromYesterday} تومان*
📅 **تاریخ**: *${persianUsdBuyDate}*
    `;
      
      // Send the response message to the user
      bot.sendMessage(chatId, responseMessage, { parse_mode: 'Markdown' });
    } else {
      bot.sendMessage(chatId, '❌ خطا در دریافت نرخ دیروز، لطفاً بعداً امتحان کنید.');
    }
  } else {
    bot.sendMessage(chatId, '❌ خطا در دریافت نرخ‌ها، لطفاً بعداً امتحان کنید.');
    console.error('Error fetching rates');
  }
});

console.log('Bot is running...');
