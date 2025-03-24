const axios = require('axios');
const moment = require('moment-timezone');

// Configuration
const config = {
  token: '1355028807:h4DAqn1oPtnjpnLVyFaqIXISgjNrJH3l497fBs9w',
  specialUsers: [1085839779, 844843541],
  maxFeedbackPerDay: 1,
  botApiUrl: 'https://tapi.bale.ai/bot',
  timezone: 'Asia/Tehran'
};

// Persian numerals
const PERSIAN_NUMBERS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

// State management
const state = {
  feedbacks: {},
  lastUpdateId: 0
};

/**
 * Convert numbers to Persian numerals
 */
function toPersianNumber(num) {
  return num.toString().replace(/\d/g, d => PERSIAN_NUMBERS[parseInt(d)]);
}

/**
 * Get formatted Persian date and time in Tehran timezone
 */
function getFormattedDate() {
  const now = moment().tz(config.timezone);
  const date = now.locale('fa').format('D MMMM YYYY');
  const time = now.format('HH:mm:ss');
  return `${toPersianNumber(date)} - ${toPersianNumber(time)}`;
}

/**
 * Send message via Telegram Bot API
 */
async function sendMessage(chatId, text, replyMarkup = null) {
  try {
    await axios.post(`${config.botApiUrl}${config.token}/sendMessage`, {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
      reply_markup: replyMarkup
    });
  } catch (error) {
    console.error('Error sending message:', error.message);
  }
}

/**
 * Handle start command
 */
async function handleStart(msg) {
  const chatId = msg.chat.id;
  const text = `سلام! به ربات بازخورد خوش آمدید.\nتاریخ و ساعت: ${getFormattedDate()}\n\nلطفاً ربات مورد نظر را انتخاب کنید:`;
  
  const replyMarkup = {
    inline_keyboard: [
      [{ text: `ربات آپلود ${toPersianNumber('@uploadd_bot')}`, callback_data: 'uploader_bot' }]
    ]
  };

  await sendMessage(chatId, text, replyMarkup);
}

/**
 * Show bot information
 */
async function showBotInfo(chatId, messageId) {
  const text = `نام: آپلودر | uploader\nآیدی: ${toPersianNumber('@uploadd_bot')}\nهدف: آپلود و مدیریت فایل`;
  
  const replyMarkup = {
    inline_keyboard: [
      [{ text: 'ارسال بازخورد', callback_data: 'send_feedback' }],
      [{ text: 'بازگشت', callback_data: 'back_to_start' }]
    ]
  };

  try {
    await axios.post(`${config.botApiUrl}${config.token}/editMessageText`, {
      chat_id: chatId,
      message_id: messageId,
      text: text,
      parse_mode: 'HTML',
      reply_markup: replyMarkup
    });
  } catch (error) {
    console.error('Error editing message:', error.message);
  }
}

/**
 * Request feedback from user
 */
async function requestFeedback(chatId, messageId) {
  const text = 'لطفاً بازخورد خود را ارسال کنید:';
  
  const replyMarkup = {
    inline_keyboard: [
      [{ text: 'بازگشت', callback_data: 'back_to_bot_info' }]
    ]
  };

  try {
    await axios.post(`${config.botApiUrl}${config.token}/editMessageText`, {
      chat_id: chatId,
      message_id: messageId,
      text: text,
      parse_mode: 'HTML',
      reply_markup: replyMarkup
    });
    state.expectingFeedback = chatId;
  } catch (error) {
    console.error('Error requesting feedback:', error.message);
  }
}

/**
 * Process feedback with proper cooldown
 */
async function processFeedback(msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const currentDate = moment().tz(config.timezone).format('YYYY-MM-DD');

  if (!state.feedbacks[userId]) {
    state.feedbacks[userId] = {};
  }

  if (state.feedbacks[userId].date === currentDate && 
      state.feedbacks[userId].count >= config.maxFeedbackPerDay) {
    await sendMessage(chatId, 'شما امروز بازخورد ارسال کرده‌اید. لطفاً فردا مجدداً تلاش کنید.');
    return;
  }

  state.feedbacks[userId] = {
    date: currentDate,
    count: (state.feedbacks[userId].count || 0) + 1
  };

  const feedbackText = `بازخورد جدید از ${msg.from.first_name} (${toPersianNumber(userId)}):\n${msg.text}\n\nتاریخ: ${getFormattedDate()}`;

  for (const adminId of config.specialUsers) {
    await sendMessage(adminId, feedbackText);
  }

  await sendMessage(chatId, 'بازخورد شما با موفقیت ثبت شد.');
  state.expectingFeedback = null;
}

/**
 * Handle updates
 */
async function handleUpdate(update) {
  if (update.callback_query) {
    const { data, message } = update.callback_query;
    
    if (data === 'uploader_bot') {
      await showBotInfo(message.chat.id, message.message_id);
    } 
    else if (data === 'send_feedback') {
      await requestFeedback(message.chat.id, message.message_id);
    }
    else if (data === 'back_to_start') {
      await handleStart(message);
    }
    else if (data === 'back_to_bot_info') {
      await showBotInfo(message.chat.id, message.message_id);
    }
  }
  else if (update.message) {
    if (update.message.text === '/start') {
      await handleStart(update.message);
    }
    else if (state.expectingFeedback === update.message.chat.id) {
      await processFeedback(update.message);
    }
  }
}

/**
 * Poll for updates
 */
async function pollUpdates() {
  try {
    const { data } = await axios.get(`${config.botApiUrl}${config.token}/getUpdates`, {
      params: {
        offset: state.lastUpdateId + 1,
        timeout: 30
      }
    });

    if (data.result && data.result.length) {
      for (const update of data.result) {
        state.lastUpdateId = Math.max(state.lastUpdateId, update.update_id);
        await handleUpdate(update);
      }
    }
  } catch (error) {
    console.error('Polling error:', error.message);
  } finally {
    setTimeout(pollUpdates, 100);
  }
}

// Start the bot
pollUpdates();
