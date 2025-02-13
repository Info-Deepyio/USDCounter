const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const moment = require('moment');

// توکن ربات خود را از BotFather قرار دهید
const token = '7971393473:AAHhxpn9m-KwN9VrKaVU426_e1gNjIgFJjU';

// ایجاد یک نمونه جدید از ربات تلگرام
const bot = new TelegramBot(token, { polling: true });

// تابعی برای گرفتن نرخ تبدیل دلار به تومان
async function fetchExchangeRates() {
  try {
    // جایگزینی با نقطه پایانی مناسب برای گرفتن نرخ دلار به تومان
    const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD');
    const usdToToman = response.data.rates.IRR / 10; // IRR ریال ایرانی است و تقسیم بر ۱۰ برای گرفتن تومان
    return usdToToman;
  } catch (error) {
    console.error('خطا در دریافت نرخ‌ها:', error);
    return null;
  }
}

// تابعی برای گرفتن نرخ دلار به تومان روز گذشته
async function fetchYesterdayExchangeRate() {
  try {
    const yesterday = moment().subtract(1, 'days').format('YYYY-MM-DD');
    const response = await axios.get(`https://api.exchangerate-api.com/v4/${yesterday}/USD`);
    const usdToTomanYesterday = response.data.rates.IRR / 10; // IRR ریال ایرانی است و تقسیم بر ۱۰ برای گرفتن تومان
    return usdToTomanYesterday;
  } catch (error) {
    console.error('خطا در دریافت نرخ‌های روز گذشته:', error);
    return null;
  }
}

// هنگامی که کاربر دستور "/usd" را وارد می‌کند
bot.onText(/\/usd/, async (msg) => {
  const chatId = msg.chat.id;

  // دریافت نرخ تبدیل امروز و دیروز
  const todayRate = await fetchExchangeRates();
  const yesterdayRate = await fetchYesterdayExchangeRate();

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
  }
});

console.log('ربات در حال اجرا است...');
