const axios = require('axios');
const moment = require('moment-timezone');
const jalaali = require('jalaali-moment');

// Configuration
const TOKEN = '1355028807:h4DAqn1oPtnjpnLVyFaqIXISgjNrJH3l497fBs9w'; // Replace with your actual bot token
const BOT_API_URL = `https://tapi.bale.ai/bot${TOKEN}`;

// Special user IDs for feedback (add @ symbol)
const SPECIAL_USERS = [844843541, 1085839779]; // Replace with actual usernames

// Persian numerals mapping
const PERSIAN_NUMBERS = {
    '0': '۰', '1': '۱', '2': '۲', '3': '۳', '4': '۴',
    '5': '۵', '6': '۶', '7': '۷', '8': '۸', '9': '۹'
};

// Utility functions
function toPersianNumber(num) {
    return num.toString().replace(/\d/g, d => PERSIAN_NUMBERS[d]);
}

function getFormattedPersianDate() {
    const now = moment().tz('Asia/Tehran');
    const gregorianDate = now.format('YYYY/MM/DD');
    const jalaliDate = jalaali(now, 'YYYY/MM/DD').format('jYYYY/jMM/jDD');
    const time = toPersianNumber(now.format('HH:mm:ss'));

    return `میلادی: ${gregorianDate} \nجلالی: ${jalaliDate} \nساعت: ${time}`;
}


// User feedback tracking
const USER_FEEDBACKS = {};
const FEEDBACK_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Logging function
function log(message) {
    console.log(`[${getFormattedPersianDate()}] ${message}`);
}

// Send message with error handling and Persian formatting
async function sendPersianMessage(chatId, text, replyMarkup = null, options = {}) {
    try {
        const params = {
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML',
            reply_markup: replyMarkup,
            ...options
        };

        return await axios.post(`${BOT_API_URL}/sendMessage`, params);
    } catch (error) {
        log(`❌ خطا در ارسال پیام: ${error.message}`);
        return null;
    }
}

// Check if user can submit feedback
function canSubmitFeedback(userId) {
    const userFeedback = USER_FEEDBACKS[userId];
    if (!userFeedback) return true;

    const currentTime = Date.now();
    return (currentTime - userFeedback.timestamp) >= FEEDBACK_COOLDOWN;
}

// Main bot logic
class TelegramBot {
    constructor() {
        this.offset = 0;
        this.isProcessing = false;
    }

    // Start command handler
    async handleStart(message) {
        const chatId = message.chat.id;
        const greetingText = `👋 سلام! خوش آمدید.
📅 تاریخ و ساعت: ${getFormattedPersianDate()}

🤖 لطفاً رباتی که می‌خواهید بازخورد دهید را انتخاب کنید.`;

        const replyMarkup = {
            inline_keyboard: [
                [{ text: '🔝 ربات آپلود | uploadd_bot', callback_data: 'uploader_bot' }]
            ]
        };

        await sendPersianMessage(chatId, greetingText, replyMarkup);
    }

    // Feedback collection handler
    async handleFeedback(message) {
        const chatId = message.chat.id;
        const userId = message.from.id;
        const feedbackText = message.text;
        const username = message.from.username ? `@${message.from.username}` : 'بدون نام کاربری';
        const firstName = message.from.first_name || 'بدون نام';


        // Validate feedback length
        if (!feedbackText || feedbackText.length < 10) {
            await sendPersianMessage(chatId, '❌ بازخورد باید حداقل ۱۰ کارکتر داشته باشد.');
            return;
        }

        // Check cooldown
        if (!canSubmitFeedback(userId)) {
            const remainingTime = this.getRemainingCooldownTime(userId);
            await sendPersianMessage(chatId, `⏳ شما باید ${remainingTime} صبر کنید تا بتوانید دوباره بازخورد ارسال کنید.`);
            return;
        }

        // Store feedback
        USER_FEEDBACKS[userId] = {
            text: feedbackText,
            timestamp: Date.now(),
            username: username,
            firstName: firstName
        };

        // Prepare and send feedback to special users
        const feedbackMessage = `
\`\`\`
✨ بازخورد جدید:

👤 کاربر: ${USER_FEEDBACKS[userId].username} (${USER_FEEDBACKS[userId].firstName})
🆔 شناسه کاربری: ${userId}
📝 متن بازخورد: ${feedbackText}
📅 تاریخ: ${getFormattedPersianDate()}
\`\`\``;


        // Send to special users
        for (const specialUserId of SPECIAL_USERS) {
          try {
             await sendPersianMessage(specialUserId, feedbackMessage);
          } catch (error){
            log(`Error sending to special user ${specialUserId}: ${error}`);
          }
        }

        // Confirm to original user
        await sendPersianMessage(chatId, '✅ بازخورد شما با موفقیت ارسال شد!\n⏳ می‌توانید پس از ۲۴ ساعت مجدداً بازخورد ارسال کنید.');
    }

    // Get remaining cooldown time
    getRemainingCooldownTime(userId) {
        const userFeedback = USER_FEEDBACKS[userId];
        if (!userFeedback) return '۰ ساعت';

        const elapsedTime = Date.now() - userFeedback.timestamp;
        const remainingTime = FEEDBACK_COOLDOWN - elapsedTime;

        const hours = Math.floor(remainingTime / (60 * 60 * 1000));
        const minutes = Math.floor((remainingTime % (60 * 60 * 1000)) / (60 * 1000));

        return `${toPersianNumber(hours)} ساعت و ${toPersianNumber(minutes)} دقیقه`;
    }

    // Handle callback queries
    async handleCallbackQuery(callbackQuery) {
        const chatId = callbackQuery.message.chat.id;
        const messageId = callbackQuery.message.message_id;

        switch (callbackQuery.data) {
            case 'uploader_bot':
                const botInfoText = `💬 نام: •آ‌پــلــودر | 𝙪𝙥𝙡𝙤𝙖𝙙𝙚𝙧•
🆔 آیدی: @uploadd_bot
📂 هدف: آپلود و مدیریت فایل به روشی آسان و مدرن!`;

                const replyMarkup = {
                    inline_keyboard: [
                        [{ text: '📩 ارسال بازخورد', callback_data: 'send_feedback' }],
                        [{ text: '↩️ بازگشت', callback_data: 'back_to_start' }]
                    ]
                };

                await axios.post(`${BOT_API_URL}/editMessageText`, {
                    chat_id: chatId,
                    message_id: messageId,
                    text: botInfoText,
                    parse_mode: 'HTML',
                    reply_markup: replyMarkup
                });
                break;

            case 'send_feedback':
                await sendPersianMessage(chatId, '📝 لطفاً بازخورد خود را در یک پیام ارسال کنید.');
                break;

            case 'back_to_start':
                await this.handleStart(callbackQuery.message);
                break;
        }
    }

    // Process incoming updates
    async processUpdate(update) {
        try {
            if (update.message) {
                if (update.message.text === '/start') {
                    await this.handleStart(update.message);
                } else {
                    await this.handleFeedback(update.message);
                }
            }

            if (update.callback_query) {
                await this.handleCallbackQuery(update.callback_query);
            }
        } catch (error) {
            log(`❌ خطا در پردازش به‌روزرسانی: ${error.message}`);
        }
    }

    // Fetch updates
    async fetchUpdates() {
        if (this.isProcessing) return;

        this.isProcessing = true;
        try {
            const response = await axios.get(`${BOT_API_URL}/getUpdates`, {
                params: {
                    offset: this.offset,
                    timeout: 30
                }
            });

            const updates = response.data.result;

            if (updates && updates.length > 0) {
                for (const update of updates) {
                    await this.processUpdate(update);
                    this.offset = update.update_id + 1;
                }
            }
        } catch (error) {
            log(`❌ خطا در دریافت به‌روزرسانی‌ها: ${error.message}`);
        } finally {
            this.isProcessing = false;
            // Schedule next update fetch
            setTimeout(() => this.fetchUpdates(), 1000);
        }
    }

    // Start the bot
    start() {
        log('🤖 ربات شروع به کار کرد.');
        this.fetchUpdates();
    }
}

// Initialize and start the bot
const bot = new TelegramBot();
bot.start();
