const axios = require('axios');
const moment = require('moment');

// Configuration
const CONFIG = {
    BOT_TOKEN: '1355028807:h4DAqn1oPtnjpnLVyFaqIXISgjNrJH3l497fBs9w',
    BASE_API_URL: 'https://tapi.bale.ai/bot',
    SPECIAL_USERS: [1085839779, 844843541],
    FEEDBACK_COOLDOWN_HOURS: 24
};

// Persian numerals mapping
const PERSIAN_NUMERALS = {
    '0': '۰', '1': '۱', '2': '۲', '3': '۳', '4': '۴', 
    '5': '۵', '6': '۶', '7': '۷', '8': '۸', '9': '۹'
};

/**
 * Convert Arabic numerals to Persian numerals
 * @param {number|string} number - Number to convert
 * @returns {string} Persian numeral representation
 */
function toPersianNumber(number) {
    return number.toString()
        .split('')
        .map(digit => PERSIAN_NUMERALS[digit] || digit)
        .join('');
}

/**
 * Get current date and time in Persian format
 * @returns {string} Formatted date and time
 */
function getFormattedPersianDateTime() {
    const now = moment();
    return [
        toPersianNumber(now.date()),
        '/',
        toPersianNumber(now.month() + 1),
        '/',
        toPersianNumber(now.year()),
        ' - ',
        toPersianNumber(now.hours()),
        ':',
        toPersianNumber(now.minutes()),
        ':',
        toPersianNumber(now.seconds())
    ].join('');
}

/**
 * Send a message via Telegram Bot API
 * @param {number} chatId - Destination chat ID
 * @param {string} text - Message text
 * @param {Object} [replyMarkup=null] - Keyboard markup
 * @returns {Promise} Axios promise
 */
async function sendMessage(chatId, text, replyMarkup = null) {
    try {
        const params = {
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
            reply_markup: replyMarkup
        };

        return await axios.post(
            `${CONFIG.BASE_API_URL}${CONFIG.BOT_TOKEN}/sendMessage`, 
            params
        );
    } catch (error) {
        console.error('Error sending message:', error.message);
        throw error;
    }
}

// Feedback management
const FeedbackManager = {
    feedbacks: {},

    /**
     * Check if user can submit feedback
     * @param {number} userId - User's unique ID
     * @returns {boolean} Whether feedback can be submitted
     */
    canSubmitFeedback(userId) {
        const currentDate = moment();
        const lastFeedback = this.feedbacks[userId];

        if (!lastFeedback) return true;

        const hoursSinceLastFeedback = moment.duration(
            currentDate.diff(moment(lastFeedback.timestamp))
        ).asHours();

        return hoursSinceLastFeedback >= CONFIG.FEEDBACK_COOLDOWN_HOURS;
    },

    /**
     * Record user feedback
     * @param {number} userId - User's unique ID
     * @param {string} feedback - Feedback text
     * @returns {void}
     */
    recordFeedback(userId, feedback) {
        this.feedbacks[userId] = {
            text: feedback,
            timestamp: moment().toISOString()
        };
    }
};

/**
 * Handle start command
 * @param {Object} msg - Incoming message object
 */
async function handleStart(msg) {
    const chatId = msg.chat.id;
    const greetingText = `سلام! خوش آمدید.
تاریخ و ساعت: ${getFormattedPersianDateTime()}

لطفاً رباتی که می‌خواهید بازخورد بدهید را انتخاب کنید.`;

    const replyMarkup = {
        inline_keyboard: [
            [{ text: 'ربات آپلود | uploadd_bot', callback_data: 'uploader_bot' }]
        ]
    };

    await sendMessage(chatId, greetingText, replyMarkup);
}

/**
 * Handle callback queries
 * @param {Object} query - Callback query object
 */
async function handleCallbackQuery(query) {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;

    const actionMap = {
        'uploader_bot': async () => {
            const botInfoText = `نام: •آ‌پــلــودر | 𝙪𝙥𝙡𝙤𝙖𝙙𝙚𝙧•
آیدی: @uploadd_bot
هدف: آپلود و مدیریت فایل به روشی آسان و مدرن!`;

            const replyMarkup = {
                inline_keyboard: [
                    [{ text: 'ارسال بازخورد', callback_data: 'send_feedback' }],
                    [{ text: 'بازگشت', callback_data: 'back_to_start' }]
                ]
            };

            await axios.post(`${CONFIG.BASE_API_URL}${CONFIG.BOT_TOKEN}/editMessageText`, {
                chat_id: chatId,
                message_id: messageId,
                text: botInfoText,
                parse_mode: 'HTML',
                reply_markup: replyMarkup
            });
        },
        'send_feedback': async () => {
            const feedbackText = 'لطفاً بازخورد خود را در مورد این ربات وارد کنید.';

            const replyMarkup = {
                inline_keyboard: [
                    [{ text: 'بازگشت', callback_data: 'back_to_bot_info' }]
                ]
            };

            await axios.post(`${CONFIG.BASE_API_URL}${CONFIG.BOT_TOKEN}/editMessageText`, {
                chat_id: chatId,
                message_id: messageId,
                text: feedbackText,
                parse_mode: 'HTML',
                reply_markup: replyMarkup
            });

            // Note: Actual feedback collection would require more sophisticated 
            // message handling not shown in this example
        },
        'back_to_start': handleStart,
        'back_to_bot_info': async () => {
            const botInfoText = `نام: •آ‌پــلــودر | 𝙪𝙥𝙡𝙤𝙖𝙙𝙚𝙧•
آیدی: @uploadd_bot
هدف: آپلود و مدیریت فایل به روشی آسان و مدرن`;

            const replyMarkup = {
                inline_keyboard: [
                    [{ text: 'ارسال بازخورد', callback_data: 'send_feedback' }],
                    [{ text: 'بازگشت', callback_data: 'back_to_start' }]
                ]
            };

            await axios.post(`${CONFIG.BASE_API_URL}${CONFIG.BOT_TOKEN}/editMessageText`, {
                chat_id: chatId,
                message_id: messageId,
                text: botInfoText,
                parse_mode: 'HTML',
                reply_markup: replyMarkup
            });
        }
    };

    const action = actionMap[query.data];
    if (action) await action(query);
}

/**
 * Collect and distribute feedback
 * @param {number} chatId - Chat ID
 * @param {Object} user - User information
 * @param {string} feedback - Feedback text
 */
async function processFeedback(chatId, user, feedback) {
    // Check if user can submit feedback
    if (!FeedbackManager.canSubmitFeedback(user.id)) {
        await sendMessage(chatId, 'شما قبلاً بازخوردی ارسال کرده‌اید.');
        return;
    }

    // Record feedback
    FeedbackManager.recordFeedback(user.id, feedback);

    // Prepare feedback message for special users
    const feedbackMessage = `
بازخورد جدید:

از طرف: ${user.username} (${user.first_name})
متن بازخورد: ${feedback}
تاریخ: ${getFormattedPersianDateTime()}`;

    // Send feedback to special users
    for (const specialUserId of CONFIG.SPECIAL_USERS) {
        await sendMessage(specialUserId, feedbackMessage);
    }

    // Confirm feedback to original sender
    await sendMessage(chatId, 'بازخورد شما ارسال شد!');
}

/**
 * Handle incoming updates
 * @param {Object} update - Update object from Telegram
 */
function handleUpdates(update) {
    if (update.message && update.message.text === '/start') {
        handleStart(update.message);
    }

    if (update.callback_query) {
        handleCallbackQuery(update.callback_query);
    }
}

/**
 * Long polling mechanism to get updates
 */
async function pollUpdates() {
    try {
        const response = await axios.get(`${CONFIG.BASE_API_URL}${CONFIG.BOT_TOKEN}/getUpdates`);
        const updates = response.data.result;

        for (const update of updates) {
            handleUpdates(update);
        }

        // Continue polling
        setTimeout(pollUpdates, 1000);
    } catch (error) {
        console.error('Error fetching updates:', error);
        // Retry with exponential backoff
        setTimeout(pollUpdates, 5000);
    }
}

// Start the bot
function startBot() {
    console.log('Bot started at:', new Date().toISOString());
    pollUpdates();
}

// Initialize the bot
startBot();
