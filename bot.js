const axios = require('axios');
const moment = require('moment-timezone');

// Your Telegram Bot Token here
const token = '1355028807:h4DAqn1oPtnjpnLVyFaqIXISgjNrJH3l497fBs9w';
const botApiUrl = `https://tapi.bale.ai/bot${token}`;

// Special user IDs for feedback
const specialUsers = [1085839779, 844843541]; // Replace with your special user IDs
const feedbacks = {}; // To store feedbacks and manage user daily limits

// Persian numerals function
const PersianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

function toPersianNumber(number) {
    return number.toString().split('').map(char => PersianNumbers[parseInt(char)] || char).join('');
}

// Get formatted date and time in Persian with Tehran timezone
function getFormattedDate() {
    // Use Tehran timezone
    const now = moment().tz('Asia/Tehran');
    
    const day = toPersianNumber(now.date());
    const month = toPersianNumber(now.month() + 1); // Month is zero-indexed
    const year = toPersianNumber(now.year());
    const hours = toPersianNumber(now.hours());
    const minutes = toPersianNumber(now.minutes());
    const seconds = toPersianNumber(now.seconds());
    
    return `${day} / ${month} / ${year} - ${hours}:${minutes}:${seconds}`;
}

// Send message via Telegram Bot API
async function sendMessage(chatId, text, replyMarkup = null) {
    const params = {
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
    };

    try {
        return await axios.post(`${botApiUrl}/sendMessage`, params);
    } catch (error) {
        console.error('Error sending message:', error.response ? error.response.data : error.message);
    }
}

// Handle start command
async function handleStart(msg) {
    const chatId = msg.chat.id;
    const greetingText = `👋 سلام! خوش آمدید.
📅 تاریخ و ساعت: ${getFormattedDate()}
    
🔄 لطفاً رباتی که می‌خواهید بازخورد بدهید را انتخاب کنید.`;

    const replyMarkup = {
        inline_keyboard: [
            [{ text: '🔝 ربات آپلود | uploadd_bot', callback_data: 'uploader_bot' }],
        ],
    };

    await sendMessage(chatId, greetingText, replyMarkup);
}

// Handle callback queries
async function handleCallbackQuery(query) {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const user = query.from;
    
    if (query.data === 'uploader_bot') {
        const botInfoText = `💬 نام: •آ‌پــلــودر | 𝙪𝙥𝙡𝙤𝙖𝙙𝙚𝙧•
🆔 آیدی: @uploadd_bot
📂 هدف: آپلود و مدیریت فایل به روشی آسان و مدرن!`;

        const replyMarkup = {
            inline_keyboard: [
                [{ text: '📩 ارسال بازخورد', callback_data: 'send_feedback' }],
                [{ text: '↩️ بازگشت', callback_data: 'back_to_start' }],
            ],
        };

        await axios.post(`${botApiUrl}/editMessageText`, {
            chat_id: chatId,
            message_id: messageId,
            text: botInfoText,
            parse_mode: 'HTML',
            reply_markup: replyMarkup,
        });
    }

    if (query.data === 'send_feedback') {
        const feedbackText = `📝 لطفاً بازخورد خود را در مورد این ربات وارد کنید.`;

        const replyMarkup = {
            inline_keyboard: [
                [{ text: '↩️ بازگشت', callback_data: 'back_to_bot_info' }],
            ],
        };

        await axios.post(`${botApiUrl}/editMessageText`, {
            chat_id: chatId,
            message_id: messageId,
            text: feedbackText,
            parse_mode: 'HTML',
            reply_markup: replyMarkup,
        });

        // Collect feedback from user
        await startFeedbackCollection(chatId, user);
    }

    if (query.data === 'back_to_start') {
        await handleStart(query.message);
    }

    if (query.data === 'back_to_bot_info') {
        const botInfoText = `💬 نام: •آ‌پــلــودر | 𝙪𝙥𝙡𝙤𝙖𝙙𝙚𝙧•
🆔 آیدی: @uploadd_bot
📂 هدف: آپلود و مدیریت فایل به روشی آسان و مدرن`;

        const replyMarkup = {
            inline_keyboard: [
                [{ text: '📩 ارسال بازخورد', callback_data: 'send_feedback' }],
                [{ text: '↩️ بازگشت', callback_data: 'back_to_start' }],
            ],
        };

        await axios.post(`${botApiUrl}/editMessageText`, {
            chat_id: chatId,
            message_id: messageId,
            text: botInfoText,
            parse_mode: 'HTML',
            reply_markup: replyMarkup,
        });
    }
}

// Start feedback collection process
async function startFeedbackCollection(chatId, user) {
    const currentDate = moment().tz('Asia/Tehran').format('YYYY-MM-DD');

    // Initialize user feedback tracking if not exists
    if (!feedbacks[user.id]) {
        feedbacks[user.id] = {};
    }

    // Check if user has already submitted feedback today
    if (feedbacks[user.id][currentDate]) {
        const remainingTime = moment(feedbacks[user.id][currentDate].nextAllowedTime).fromNow();
        await sendMessage(chatId, `❗️ شما قبلاً بازخورد ارسال کرده‌اید. لطفاً ${remainingTime} مجدداً تلاش کنید.`);
        return;
    }

    // Send instruction to send feedback
    await sendMessage(chatId, '📝 لطفاً بازخورد خود را در یک پیام ارسال کنید.');
}

// Process incoming feedback
async function processFeedback(msg) {
    const chatId = msg.chat.id;
    const user = msg.from;
    const feedbackText = msg.text;

    // Validate feedback
    if (!feedbackText || feedbackText.length < 10) {
        await sendMessage(chatId, '❌ بازخورد باید حداقل ۱۰ کاراکتر داشته باشد.');
        return;
    }

    const currentDate = moment().tz('Asia/Tehran').format('YYYY-MM-DD');

    // Initialize user feedback tracking if not exists
    if (!feedbacks[user.id]) {
        feedbacks[user.id] = {};
    }

    // Set cooldown for 24 hours
    const nextAllowedTime = moment().tz('Asia/Tehran').add(1, 'day');
    
    // Store feedback details
    feedbacks[user.id][currentDate] = {
        text: feedbackText,
        timestamp: moment().tz('Asia/Tehran').toISOString(),
        nextAllowedTime: nextAllowedTime.toISOString()
    };

    // Prepare feedback message
    const feedbackMessage = `
✨ بازخورد جدید:

👤 از طرف: ${user.username || 'بدون نام کاربری'} (${user.first_name || 'بدون نام'})
👤 شناسه کاربری: ${user.id}
📝 متن بازخورد: ${feedbackText}
📅 تاریخ: ${getFormattedDate()}`;

    // Send feedback to special users
    for (const specialUserId of specialUsers) {
        await sendMessage(specialUserId, feedbackMessage);
    }

    // Confirm feedback submission to user
    await sendMessage(chatId, '✅ بازخورد شما با موفقیت ارسال شد!\n⏳ شما می‌توانید پس از ۲۴ ساعت مجدداً بازخورد ارسال کنید.');
}

// Handle updates (messages and callback queries)
function handleUpdates(update) {
    if (update.message) {
        if (update.message.text === '/start') {
            handleStart(update.message);
        } else {
            // Process any text message as potential feedback
            processFeedback(update.message);
        }
    }

    if (update.callback_query) {
        handleCallbackQuery(update.callback_query);
    }
}

// Poll for updates (using long polling)
async function getUpdates(offset = 0) {
    try {
        const response = await axios.get(`${botApiUrl}/getUpdates`, {
            params: {
                offset: offset,
                timeout: 30
            }
        });

        const updates = response.data.result;

        if (updates.length > 0) {
            // Process each update
            for (const update of updates) {
                handleUpdates(update);
                
                // Update offset to acknowledge processed updates
                offset = update.update_id + 1;
            }
        }

        // Continue polling with updated offset
        getUpdates(offset);
    } catch (error) {
        console.error('⚠️ Error fetching updates:', error);
        
        // Wait and retry
        setTimeout(() => getUpdates(offset), 5000);
    }
}

// Start polling for updates
getUpdates();
