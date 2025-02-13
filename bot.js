const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// Your token provided by Telegram
const token = '7971393473:AAHhxpn9m-KwN9VrKaVU426_e1gNjIgFJjU';

// The new API URL (use your API key as mentioned)
const apiUrl = 'https://api.navasan.tech/latest/?api_key=free7HKJj4k6FRl8XQb18vTxe1paPiB9';

// Create a new Telegram bot instance
const bot = new TelegramBot(token, { polling: true });

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

// Command handler when the user types "/usd"
bot.onText(/\/usd/, async (msg) => {
  const chatId = msg.chat.id;

  // Fetch today's USD buy rate
  const rateData = await fetchUsdRate();

  if (rateData) {
    const { usdBuyValue, usdBuyChange, usdBuyDate } = rateData;

    // Prepare the message to send
    const responseMessage = `
⚡️ **نرخ خرید دلار امروز**: ${usdBuyValue} تومان
📈 **تغییرات نسبت به روز قبل**: ${usdBuyChange} تومان
🗓 **تاریخ**: ${usdBuyDate}
    `;
    
    // Send the response message to the user
    bot.sendMessage(chatId, responseMessage);
  } else {
    bot.sendMessage(chatId, '❌ خطا در دریافت نرخ‌ها، لطفاً بعداً امتحان کنید.');
    console.error('Error fetching rates');
  }
});

console.log('Bot is running...');
