const axios = require("axios");

const TOKEN = "1691953570:WmL4sHlh1ZFMcGv8ekKGgUdGxlZfforRzuktnweg";
const BALE_API = `https://tapi.bale.ai/bot${TOKEN}`;

// Function to send a message
async function sendMessage(chatId, text) {
    await axios.post(`${BALE_API}/sendMessage`, {
        chat_id: chatId,
        text
    });
}

// Function to handle updates
async function handleUpdate(update) {
    if (update.message && update.message.text === "/start") {
        await sendMessage(update.message.chat.id, "Hi!");
    }
}

// Function to get updates (Polling)
async function getUpdates(offset = 0) {
    try {
        const response = await axios.get(`${BALE_API}/getUpdates`, { params: { offset } });
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
