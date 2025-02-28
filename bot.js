const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

// Replace with your Telegram bot token
const TOKEN = "7971393473:AAHhxpn9m-KwN9VrKaVU426_e1gNjIgFJjU";
const API_URL = "https://brsapi.ir/FreeTsetmcBourseApi/Api_Free_Gold_Currency.json";

const bot = new TelegramBot(TOKEN, { polling: true });

// Store user's last selected category to prevent repeating
let lastCategory = {};

// Function to fetch market data
async function fetchMarketData(category) {
    try {
        const response = await axios.get(API_URL);
        const data = response.data;

        if (!data) return "❌ داده‌ای یافت نشد!";

        let title, items;
        switch (category) {
            case "currency":
                title = "💵 *نرخ ارز:*";
                items = data.currency;
                break;
            case "crypto":
                title = "🔗 *نرخ ارزهای دیجیتال:*";
                items = data.cryptocurrency;
                break;
            case "gold":
                title = "💰 *نرخ طلا:*";
                items = data.gold;
                break;
            default:
                return "❌ دسته‌بندی نامعتبر!";
        }

        const date = items?.[0]?.date || "Unknown Date";
        const time = items?.[0]?.time || "Unknown Time";

        const formattedItems = items.map(item =>
            `🔹 *${item.name}*: ${item.price.toLocaleString()} ${item.unit}`
        ).join("\n\n");

        return `📅 *تاریخ:* ${date}\n⏰ *زمان:* ${time}\n\n${title}\n${formattedItems}`;
    } catch (error) {
        console.error("Error fetching data:", error);
        return "❌ خطا در دریافت اطلاعات!";
    }
}

// Function to generate inline keyboard
function getInlineKeyboard(excludeCategory = "") {
    const buttons = [
        { text: "💵 ارز", callback_data: "currency" },
        { text: "🔗 ارز دیجیتال", callback_data: "crypto" },
        { text: "💰 طلا", callback_data: "gold" }
    ];

    // Remove the last selected category from the options
    const filteredButtons = buttons.filter(button => button.callback_data !== excludeCategory);

    return {
        reply_markup: {
            inline_keyboard: [
                filteredButtons, // Show only the options excluding the last selected category
            ]
        }
    };
}

// Handle /currency command
bot.onText(/\/currency/, async (msg) => {
    const chatId = msg.chat.id;
    lastCategory[chatId] = ""; // Reset the last selected category
    const message = "📊 *انتخاب کنید:*";

    bot.sendMessage(chatId, message, { parse_mode: "Markdown", ...getInlineKeyboard() });
});

// Handle callback queries for inline buttons
bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const category = query.data;

    // Prevent selecting the same category twice
    if (lastCategory[chatId] === category) {
        bot.answerCallbackQuery(query.id, {
            text: "❌ شما قبلاً این گزینه را انتخاب کرده‌اید! لطفاً گزینه دیگری انتخاب کنید.",
            show_alert: true
        });
        return;
    }

    // Update the last selected category
    lastCategory[chatId] = category;

    // Fetch data and update the message
    const marketData = await fetchMarketData(category);

    // Edit the message with the new data and updated inline keyboard
    bot.editMessageText(marketData, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: "Markdown",
        ...getInlineKeyboard(category) // Exclude the current category to prevent selecting it again
    });

    // Answer callback to remove "loading" icon
    bot.answerCallbackQuery(query.id);
});

console.log("Bot is running...");
