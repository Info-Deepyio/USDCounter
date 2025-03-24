const axios = require('axios');
const moment = require('moment');

// Configuration
const config = {
  token: '1355028807:h4DAqn1oPtnjpnLVyFaqIXISgjNrJH3l497fBs9w',
  specialUsers: [1085839779, 844843541], // Replace with your special user IDs
  maxFeedbackPerDay: 1,
  botApiUrl: 'https://tapi.bale.ai/bot'
};

// Emoji constants
const EMOJI = {
  WAVE: '👋',
  CALENDAR: '📅',
  ROBOT: '🤖',
  BACK: '🔙',
  FEEDBACK: '📝',
  SUCCESS: '✅',
  WARNING: '⚠️',
  CLOCK: '⏱️',
  UPLOAD: '📤',
  THANKS: '🙏',
  INFO: 'ℹ️'
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
 * @param {number} number 
 * @returns {string}
 */
function toPersianNumber(number) {
  return number.toString().split('').map(char => PERSIAN_NUMBERS[parseInt(char)]).join('');
}

/**
 * Get formatted Persian date and time
 * @returns {string}
 */
function getFormattedDate() {
  const now = moment();
  return [
    `${toPersianNumber(now.date())} / ${toPersianNumber(now.month() + 1)} / ${toPersianNumber(now.year())}`,
    `${toPersianNumber(now.hours())}:${toPersianNumber(now.minutes())}:${toPersianNumber(now.seconds())}`
  ].join(' - ');
}

/**
 * Send message with better error handling
 * @param {number} chatId 
 * @param {string} text 
 * @param {object} replyMarkup 
 * @returns {Promise}
 */
async function sendMessage(chatId, text, replyMarkup = null) {
  try {
    const params = {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
    };
    
    return await axios.post(`${config.botApiUrl}${config.token}/sendMessage`, params);
  } catch (error) {
    console.error('Error sending message:', error.message);
    return null;
  }
}

/**
 * Handle /start command
 * @param {object} msg 
 */
async function handleStart(msg) {
  const chatId = msg.chat.id;
  const greetingText = [
    `${EMOJI.WAVE} <b>سلام! به ربات بازخورد خوش آمدید!</b>`,
    '',
    `${EMOJI.CALENDAR} <i>تاریخ و ساعت:</i> <code>${getFormattedDate()}</code>`,
    '',
    'لطفاً رباتی که می‌خواهید بازخورد بدهید را انتخاب کنید:'
  ].join('\n');

  const replyMarkup = {
    inline_keyboard: [
      [{ 
        text: `${EMOJI.UPLOAD} ربات آپلود | uploadd_bot`, 
        callback_data: 'uploader_bot' 
      }],
    ],
  };

  await sendMessage(chatId, greetingText, replyMarkup);
}

/**
 * Handle callback queries
 * @param {object} query 
 */
async function handleCallbackQuery(query) {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  
  try {
    switch(query.data) {
      case 'uploader_bot':
        await showBotInfo(chatId, messageId);
        break;
        
      case 'send_feedback':
        await requestFeedback(chatId, messageId);
        break;
        
      case 'back_to_start':
        case 'back_to_bot_info':
        await handleStart(query.message);
        break;
    }
  } catch (error) {
    console.error('Error handling callback:', error);
    await sendMessage(chatId, `${EMOJI.WARNING} خطایی رخ داده است. لطفاً دوباره امتحان کنید.`);
  }
}

/**
 * Show bot information
 * @param {number} chatId 
 * @param {number} messageId 
 */
async function showBotInfo(chatId, messageId) {
  const botInfoText = [
    `${EMOJI.ROBOT} <b>•آ‌پــلــودر | 𝙪𝙥𝙡𝙤𝙖𝙙𝙚𝙧•</b>`,
    '',
    `${EMOJI.INFO} <i>آیدی:</i> @uploadd_bot`,
    `${EMOJI.INFO} <i>هدف:</i> آپلود و مدیریت فایل به روشی آسان و مدرن!`
  ].join('\n');

  const replyMarkup = {
    inline_keyboard: [
      [{ 
        text: `${EMOJI.FEEDBACK} ارسال بازخورد`, 
        callback_data: 'send_feedback' 
      }],
      [{ 
        text: `${EMOJI.BACK} بازگشت`, 
        callback_data: 'back_to_start' 
      }],
    ],
  };

  await axios.post(`${config.botApiUrl}${config.token}/editMessageText`, {
    chat_id: chatId,
    message_id: messageId,
    text: botInfoText,
    parse_mode: 'HTML',
    reply_markup: replyMarkup,
  });
}

/**
 * Request feedback from user
 * @param {number} chatId 
 * @param {number} messageId 
 */
async function requestFeedback(chatId, messageId) {
  const feedbackText = [
    `${EMOJI.FEEDBACK} <b>ارسال بازخورد</b>`,
    '',
    'لطفاً نظر، پیشنهاد یا انتقاد خود را درباره این ربات ارسال کنید:'
  ].join('\n');

  const replyMarkup = {
    inline_keyboard: [
      [{ 
        text: `${EMOJI.BACK} بازگشت`, 
        callback_data: 'back_to_bot_info' 
      }],
    ],
  };

  await axios.post(`${config.botApiUrl}${config.token}/editMessageText`, {
    chat_id: chatId,
    message_id: messageId,
    text: feedbackText,
    parse_mode: 'HTML',
    reply_markup: replyMarkup,
  });

  // Set state to expect feedback
  state.expectingFeedback = chatId;
}

/**
 * Process incoming feedback
 * @param {object} msg 
 */
async function processFeedback(msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const currentDate = moment().format('YYYY-MM-DD');
  
  // Initialize user feedback if not exists
  if (!state.feedbacks[userId]) {
    state.feedbacks[userId] = {};
  }
  
  // Check daily limit
  if (state.feedbacks[userId][currentDate] >= config.maxFeedbackPerDay) {
    await sendMessage(chatId, [
      `${EMOJI.WARNING} <b>شما امروز بازخورد ارسال کرده‌اید!</b>`,
      '',
      `می‌توانید فردا مجدداً بازخورد ارسال کنید. ${EMOJI.THANKS}`
    ].join('\n'));
    return;
  }
  
  // Store feedback
  state.feedbacks[userId][currentDate] = (state.feedbacks[userId][currentDate] || 0) + 1;
  
  // Prepare feedback message for admins
  const feedbackMessage = [
    `${EMOJI.FEEDBACK} <b>بازخورد جدید دریافت شد!</b>`,
    '',
    `${EMOJI.INFO} <i>از کاربر:</i> ${msg.from.first_name} (@${msg.from.username || 'N/A'})`,
    `${EMOJI.CLOCK} <i>زمان:</i> <code>${getFormattedDate()}</code>`,
    '',
    `<b>متن بازخورد:</b>`,
    `<code>${msg.text}</code>`
  ].join('\n');
  
  // Send to special users
  for (const specialUserId of config.specialUsers) {
    await sendMessage(specialUserId, feedbackMessage);
  }
  
  // Confirm to user
  await sendMessage(chatId, [
    `${EMOJI.SUCCESS} <b>بازخورد شما با موفقیت ثبت شد!</b>`,
    '',
    `از مشارکت شما سپاسگزاریم. ${EMOJI.THANKS}`
  ].join('\n'));
  
  // Reset feedback state
  delete state.expectingFeedback;
}

/**
 * Handle incoming updates
 * @param {object} update 
 */
async function handleUpdate(update) {
  try {
    // Process callback queries
    if (update.callback_query) {
      await handleCallbackQuery(update.callback_query);
      return;
    }
    
    // Process messages
    if (update.message) {
      // Handle /start command
      if (update.message.text === '/start') {
        await handleStart(update.message);
        return;
      }
      
      // Handle feedback if expecting
      if (state.expectingFeedback === update.message.chat.id) {
        await processFeedback(update.message);
        return;
      }
    }
  } catch (error) {
    console.error('Error processing update:', error);
  }
}

/**
 * Poll for updates with long polling
 */
async function pollUpdates() {
  try {
    const response = await axios.get(`${config.botApiUrl}${config.token}/getUpdates`, {
      params: {
        offset: state.lastUpdateId + 1,
        timeout: 30  // Long polling timeout
      }
    });
    
    if (response.data.result && response.data.result.length > 0) {
      for (const update of response.data.result) {
        state.lastUpdateId = Math.max(state.lastUpdateId, update.update_id);
        await handleUpdate(update);
      }
    }
    
    // Immediately poll again
    setImmediate(pollUpdates);
  } catch (error) {
    console.error('Polling error:', error.message);
    // Retry after 1 second on error
    setTimeout(pollUpdates, 1000);
  }
}

// Start the bot
console.log('🤖 Bot is running...');
pollUpdates();
