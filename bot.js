const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

// Replace with your Telegram bot token
const TOKEN = "7971393473:AAHhxpn9m-KwN9VrKaVU426_e1gNjIgFJjU";
const API_URL = "https://brsapi.ir/FreeTsetmcBourseApi/Api_Free_Gold_Currency.json";

const bot = new TelegramBot(TOKEN, { polling: true });

// Function to fetch and format currency data
async function fetchCurrencyData() {
    try {
        const response = await axios.get(API_URL);
        const data = response.data;

        if (!data || !data.currency) return "No currency data available.";

        const date = data.currency[0]?.date || "Unknown Date";
        const time = data.currency[0]?.time || "Unknown Time";

        const formattedCurrencies = data.currency.map(item =>
            `💵 *${item.name}*: ${item.price.toLocaleString()} ${item.unit}`
        ).join("\n\n");

        return `📅 *تاریخ:* ${date}\n⏰ *زمان:* ${time}\n\n📌 *نرخ ارز:*\n${formattedCurrencies}`;
    } catch (error) {
        console.error("Error fetching data:", error);
        return "خطا در دریافت اطلاعات!";
    }
}

// Handle /currency command
bot.onText(/\/currency/, async (msg) => {
    const chatId = msg.chat.id;
    const currencyData = await fetchCurrencyData();
    bot.sendMessage(chatId, currencyData, { parse_mode: "Markdown" });
});

console.log("Bot is running...");
