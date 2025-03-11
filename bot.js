const axios = require("axios");

const TOKEN = "1691953570:WmL4sHlh1ZFMcGv8ekKGgUdGxlZfforRzuktnweg";
const API_URL = "https://brsapi.ir/FreeTsetmcBourseApi/Api_Free_Gold_Currency.json";
const BALE_API = `https://tapi.bale.ai/bot${TOKEN}`; // Base URL

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

// Function to send a request to Bale API (Includes method in URL)
async function callBaleAPI(method, payload) {
    try {
        await axios.post(`${BALE_API}/${method}`, payload); // Method name included in the URL
    } catch (error) {
        console.error(`Error calling ${method}:`, error);
    }
}

// Function to send a message
async function sendMessage(chatId, text, replyMarkup = null) {
    const payload = { chat_id: chatId, text, parse_mode: "Markdown" };
    if (replyMarkup) payload.reply_markup = replyMarkup;
    await callBaleAPI("sendMessage", payload); // Correct API call with method
}

// Function to edit a message
async function editMessage(chatId, messageId, text, replyMarkup = null) {
    const payload = { chat_id: chatId, message_id: messageId, text, parse_mode: "Markdown" };
    if (replyMarkup) payload.reply_markup = replyMarkup;
    await callBaleAPI("editMessageText", payload); // Correct API call with method
}

// Function to answer callback queries
async function answerCallbackQuery(callbackQueryId, text, showAlert = false) {
    await callBaleAPI("answerCallbackQuery", {
        callback_query_id: callbackQueryId,
        text,
        show_alert: showAlert
    }); // Correct API call with method
}

// Function to get inline keyboard
function getInlineKeyboard(excludeCategory = "") {
    const buttons = [
        { text: "💵 ارز", callback_data: "currency" },
        { text: "🔗 ارز دیجیتال", callback_data: "crypto" },
        { text: "💰 طلا", callback_data: "gold" }
    ];
    return {
        inline_keyboard: [buttons.filter(button => button.callback_data !== excludeCategory)]
    };
}

// Handle updates
async function handleUpdate(update) {
    if (update.message) {
        const chatId = update.message.chat.id;
        if (update.message.text === "/currency") {
            lastCategory[chatId] = "";
            await sendMessage(chatId, "📊 *انتخاب کنید:*", getInlineKeyboard());
        }
    } else if (update.callback_query) {
        const chatId = update.callback_query.message.chat.id;
        const messageId = update.callback_query.message.message_id;
        const category = update.callback_query.data;

        if (lastCategory[chatId] === category) {
            await answerCallbackQuery(update.callback_query.id, "❌ شما قبلاً این گزینه را انتخاب کرده‌اید!", true);
            return;
        }

        lastCategory[chatId] = category;
        const marketData = await fetchMarketData(category);
        await editMessage(chatId, messageId, marketData, getInlineKeyboard(category));
        await answerCallbackQuery(update.callback_query.id);
    }
}

// Function to get updates (Polling)
async function getUpdates(offset = 0) {
    try {
        const response = await axios.get(`${BALE_API}/getUpdates`, { params: { offset } }); // Correct API call
        const updates = response.data.result;
        if (updates.length > 0) {
            const lastUpdateId = updates[updates.length - 1].update_id;
            for (const update of updates) {
                await handleUpdate(update);
            }
            getUpdates(lastUpdateId + 1);
        } else {
            setTimeout(() => getUpdates(offset), 1000);
        }
    } catch (error) {
        console.error("Error fetching updates:", error);
        setTimeout(() => getUpdates(offset), 5000);
    }
}

// Start polling updates
getUpdates();

console.log("Bot is running...");
