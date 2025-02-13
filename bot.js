const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const moment = require('moment');

// Token provided by you
const token = '7971393473:AAHhxpn9m-KwN9VrKaVU426_e1gNjIgFJjU';

// Your Fixer.io API key
const fixerApiKey = '957a0187f777d66286bf887b8a80fe14';

// Create a new Telegram bot instance
const bot = new TelegramBot(token, { polling: true });

// Function to fetch USD to Toman conversion rates
async function fetchExchangeRates() {
  try {
    // Use Fixer.io API to get the rates
    const response = await axios.get(`https://api.apilayer.com/fixer/latest?base=USD&symbols=IRR`, {
      headers: {
        'apikey': fixerApiKey,
      },
    });
    const usdToToman = response.data.rates.IRR / 10; // IRR is Iranian Rial, divided by 10 to get Toman
    return usdToToman;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    return null;
  }
}

// Function to fetch yesterday's USD to Toman rate
async function fetchYesterdayExchangeRate() {
  try {
    const yesterday = moment().subtract(1, 'days').format('YYYY-MM-DD');
    const response = await axios.get(`https://api.apilayer.com/fixer/${yesterday}?base=USD&symbols=IRR`, {
      headers: {
        'apikey': fixerApiKey,
      },
    });
    const usdToTomanYesterday = response.data.rates.IRR / 10;
    return usdToTomanYesterday;
  } catch (error) {
    console.error('Error fetching yesterday\'s exchange rates:', error);
    return null;
  }
}

// Command handler when the user types "/usd"
bot.onText(/\/usd/, async (msg) => {
  const chatId = msg.chat.id;

  // Fetch today's and yesterday's exchange rates
  const todayRate = await fetchExchangeRates();
  const yesterdayRate = await fetchYesterdayExchangeRate();

  // Check if rates were fetched successfully
  if (todayRate && yesterdayRate) {
    const rateDifference = todayRate - yesterdayRate;
    const differencePercentage = ((rateDifference / yesterdayRate) * 100).toFixed(2);

    const responseMessage = `
⚡️ **نرخ دلار به تومان امروز**: ${todayRate.toFixed(2)} تومان
🕰 **نرخ دلار به تومان دیروز**: ${yesterdayRate.toFixed(2)} تومان
📉 **تفاوت**: ${rateDifference.toFixed(2)} تومان (${differencePercentage}%) 
`;

    bot.sendMessage(chatId, responseMessage);
  } else {
    bot.sendMessage(chatId, '❌ خطا در دریافت نرخ‌ها، لطفاً بعداً امتحان کنید.');
    console.error('Error fetching rates');
  }
});

console.log('Bot is running...');
