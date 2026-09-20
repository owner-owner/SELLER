import mineflayer from 'mineflayer';
import express from 'express';

// 1. إعداد سيرفر Express لإبقاء السيرفر شغالاً (Render)
const PORT = process.env.PORT || '10000';
const app = express();
app.get('/', (_req, res) => res.status(200).send('Seller Bot Active'));
app.listen(parseInt(PORT, 10), '0.0.0.0', () => {
  console.log(`[Express] Server running on port ${PORT}`);
});

// 2. إعدادات البوت والمدد الزمنية
const BOT_CONFIG = {
  host: 'zero7even.net',
  port: 25565,
  username: 'RISZFG',
};

const RECONNECT_DELAY_MS = 5000;
const WORK_DURATION_MS = 4 * 60 * 60 * 1000; // 4 ساعات عمل داخل السيرفر
const REST_DURATION_MS = 1 * 60 * 60 * 1000; // ساعة واحدة استراحة خارج السيرفر

let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
let mainInterval: ReturnType<typeof setInterval> | null = null;

let workTimer: ReturnType<typeof setTimeout> | null = null;
let isResting = false; // حاجز لمنع إعادة الاتصال أثناء فترة الاستراحة
let currentBot: mineflayer.Bot | null = null;

// دالة مساعدة لتوليد تأخير عشوائي (محاكاة السلوك البشري)
function getRandomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clearAllTimers() {
  if (mainInterval) { clearInterval(mainInterval); mainInterval = null; }
  if (workTimer) { clearTimeout(workTimer); workTimer = null; }
}

function scheduleReconnect(reason?: string) {
  clearAllTimers();

  if (isResting) {
    console.log('[Seller-Bot] 💤 البوت حالياً في فترة الاستراحة (ساعة). تم تجاهل إعادة الاتصال.');
    return;
  }

  console.log(`[Seller-Bot] 🔄 إعادة الاتصال خلال 5 ثوانٍ... ${reason ? `(السبب: ${reason})` : ''}`);
  if (reconnectTimeout) return;

  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    startBot();
  }, RECONNECT_DELAY_MS);
}

function startBot() {
  if (isResting) return;
  console.log('[Seller-Bot] ⏳ جاري بدء الاتصال بالسيرفر...');

  const bot = mineflayer.createBot({
    ...BOT_CONFIG,
    viewDistance: 'tiny',
    physicsEnabled: true // تم تفعيل الفيزياء
  });

  currentBot = bot;

  // دالة البيع المضمونة والمحدثة لـ Mineflayer
  async function forceNormalClickSell(window: any) {
    const availableChestSlots: boolean[] = [];
    for (let i = 0; i < 45; i++) {
      availableChestSlots[i] = window.slots[i] === null || window.slots[i] === undefined;
    }

    let currentTargetChestSlot = 0;
    const playerInventoryStartInWindow = 54;
    const playerInventoryEndInWindow = 89;

    for (let slotId = playerInventoryStartInWindow; slotId <= playerInventoryEndInWindow; slotId++) {
      const item = window.slots[slotId];

      if (item) {
        while (currentTargetChestSlot < 45 && !availableChestSlots[currentTargetChestSlot]) {
          currentTargetChestSlot++;
        }

        if (currentTargetChestSlot >= 45) {
          break;
        }

        try {
          // 1. النقر كليك يسار عادي لالتقاط الآيتم
          await bot.clickWindow(slotId, 0, 0);
          await new Promise(resolve => setTimeout(resolve, getRandomDelay(180, 250)));

          // 2. النقر كليك يسار عادي في خانة البيع بالصندوق
          await bot.clickWindow(currentTargetChestSlot, 0, 0);
          
          availableChestSlots[currentTargetChestSlot] = false;

          // 3. انتظر مهلة عشوائية آمنة قبل الآيتم التالي
          await new Promise(resolve => setTimeout(resolve, getRandomDelay(180, 250)));
        } catch (err) {
          if (bot.inventory && bot.inventory.cursor) {
            await bot.clickWindow(slotId, 0, 0).catch(() => {});
          }
        }
      }
    }

    // إغلاق النافذة تلقائياً بعد الانتهاء
    setTimeout(() => {
      try {
        bot.closeWindow(window);
      } catch (e) {}
    }, getRandomDelay(800, 1200));
  }

  // لقط فتح واجهة الـ /sell
  bot.on('windowOpen', (window) => {
    setTimeout(() => {
      forceNormalClickSell(window);
    }, getRandomDelay(1800, 2200));
  });

  // إدارة الرسائل والشات (الاشتراكات، التسجيل، والـ TPAccept)
  bot.on('message', (jsonMsg) => {
    const text = jsonMsg.toString();
    console.log(`[Chat] ${text}`);

    const lowerText = text.toLowerCase();

    // 🚀 قبول طلب الانتقال التلقائي
    if (text.includes('AZSRGDTS34245')) {
      console.log('[Seller-Bot] 🚀 تم رصد كود الانتقال! جاري إرسال /tpaccept...');
      bot.chat('/tpaccept');
    }

    // 🔑 تسجيل الدخول والتسجيل
    if (lowerText.includes('/register') || lowerText.includes('register')) {
      bot.chat('/register AZERTY65 AZERTY65');
    } else if (lowerText.includes('/login') || lowerText.includes('login') || lowerText.includes('تسجيل الدخول')) {
      bot.chat('/login AZERTY65');
    }
  });

  // عند رسبونة البوت داخل العالم
  bot.on('spawn', () => {
    console.log('[Seller-Bot] 🎉 البوت رسبن وظهر داخل السيرفر!');
    clearAllTimers();

    // 🌐 الانتظار 7 ثوانٍ ثم كتابة أمر /smp
    setTimeout(() => {
      console.log('[Seller-Bot] 🌐 إرسال الأمر /smp تلقائياً بعد 7 ثوانٍ...');
      bot.chat('/smp');
    }, 7000);

    // ⏰ بدء مؤقت الـ 4 ساعات التلقائي للخروج للاستراحة
    workTimer = setTimeout(() => {
      console.log('[Seller-Bot] 🛑 اكتملت مدة العمل (4 ساعات). جاري تسجيل الخروج للاستراحة لمدة ساعة...');
      isResting = true;
      clearAllTimers();

      if (currentBot) {
        currentBot.quit();
        currentBot = null;
      }

      // إعادة التشغيل تلقائياً بعد ساعة استراحة
      setTimeout(() => {
        console.log('[Seller-Bot] ⏰ انتهت فترة الاستراحة (ساعة). جاري إعادة الاتصال...');
        isResting = false;
        startBot();
      }, REST_DURATION_MS);

    }, WORK_DURATION_MS);

    // تفعيل وضع الانحناء والبدء بالبيع الدوري
    setTimeout(() => {
      bot.setControlState('sneak', false);

      // إرسال أمر البيع بفاصل زمني متذبذب عشوائياً (كل 28 إلى 33 ثانية)
      mainInterval = setInterval(() => {
        if (!bot.currentWindow) {
          bot.chat('/sell');
        }
      }, getRandomDelay(28000, 33000));

      bot.chat('/sell');

    }, getRandomDelay(4000, 6000));
  });

  bot.on('kicked', (reason) => scheduleReconnect(`Kicked: ${JSON.stringify(reason)}`));
  bot.on('end', (reason) => scheduleReconnect(`Disconnected: ${reason}`));
  bot.on('error', (err) => scheduleReconnect(`Error: ${err.message}`));
}

startBot();
