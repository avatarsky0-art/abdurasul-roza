/* =======================================================
   Абдурасул & Роза — чакыруу кат
   ======================================================= */

const CONFIG = {
  /* Той башталган убак (Бишкек, UTC+6) */
  weddingDate: '2026-11-09T16:00:00+06:00',

  /* Жооптор ушул WhatsApp номерине келет.
     Өлкө коду менен, плюссуз, боштуксуз жазылат. */
  whatsapp: '996550581583',

  /* Же Telegram бот аркылуу. Экөө тең бош болсо — жооп
     браузердин эсинде гана сакталат. */
  telegram: { botToken: '', chatId: '' }
};

/* -------------------------------------------------------
   1. Скролл анимациясы
   ------------------------------------------------------- */
(() => {
  const items = document.querySelectorAll('[data-reveal]');
  if (!items.length) return;

  if (!('IntersectionObserver' in window)) {
    items.forEach(el => el.classList.add('is-in'));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

  items.forEach(el => io.observe(el));
})();


/* -------------------------------------------------------
   2. Таймер
   ------------------------------------------------------- */
(() => {
  const target = new Date(CONFIG.weddingDate).getTime();
  const out = {
    d: document.getElementById('cdDays'),
    h: document.getElementById('cdHours'),
    m: document.getElementById('cdMins'),
    s: document.getElementById('cdSecs')
  };
  if (!out.d || Number.isNaN(target)) return;

  const pad = n => String(n).padStart(2, '0');

  const tick = () => {
    let left = Math.max(0, target - Date.now());

    const day = Math.floor(left / 86400000); left -= day * 86400000;
    const hr  = Math.floor(left / 3600000);  left -= hr  * 3600000;
    const min = Math.floor(left / 60000);    left -= min * 60000;
    const sec = Math.floor(left / 1000);

    out.d.textContent = day;
    out.h.textContent = pad(hr);
    out.m.textContent = pad(min);
    out.s.textContent = pad(sec);
  };

  tick();
  setInterval(tick, 1000);
})();


/* -------------------------------------------------------
   3. Музыка
   ------------------------------------------------------- */
(() => {
  const btn   = document.getElementById('musicBtn');
  const audio = document.getElementById('bgMusic');
  if (!btn || !audio) return;

  audio.volume = 0.45;
  audio.preload = 'auto';

  let broken = false;      // файл жүктөлбөй калса
  let userPaused = false;  // конок өзү токтотсо, кайра коюбуз

  audio.addEventListener('error', () => {
    broken = true;
    btn.classList.remove('is-playing');
  });

  const play = () =>
    audio.play()
      .then(() => { btn.classList.add('is-playing'); return true; })
      .catch(() => { btn.classList.remove('is-playing'); return false; });

  /* 1. Барак ачылганда ошол замат коюуга аракет кылабыз.
        Браузерлер үнү бар автоойнотууну көбүнчө тосот — ошондуктан
        ылдыйда конок биринчи тийгенде/жылдырганда кайра аракет кылынат. */
  if (!broken) play();

  /* 2. Биринчи аракетте — тийүү, басуу, скролл, баскычтоп */
  const EVENTS = ['pointerdown', 'touchstart', 'keydown', 'scroll', 'click'];

  const stopWatching = () =>
    EVENTS.forEach(ev => window.removeEventListener(ev, kick));

  async function kick() {
    if (broken || userPaused) { stopWatching(); return; }
    if (!audio.paused) { stopWatching(); return; }
    if (await play()) stopWatching();
  }

  EVENTS.forEach(ev =>
    window.addEventListener(ev, kick, { passive: true })
  );

  /* Баскыч: коюу / токтотуу */
  btn.addEventListener('click', (e) => {
    e.stopPropagation();          // window'догу kick иштебесин
    if (broken) return;
    if (audio.paused) {
      userPaused = false;
      play();
    } else {
      userPaused = true;
      audio.pause();
      btn.classList.remove('is-playing');
    }
  });

  /* Герой бүткөндөн кийин баскыч кичирейип ылдыйга өтөт */
  const hero = document.querySelector('.hero');
  if (hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => {
      btn.classList.toggle('is-compact', !e.isIntersecting);
    }, { threshold: 0 }).observe(hero);
  }
})();


/* -------------------------------------------------------
   4. RSVP
   ------------------------------------------------------- */
(() => {
  const form = document.getElementById('rsvpForm');
  if (!form) return;

  const nameEl  = document.getElementById('guestName');
  const msgEl   = document.getElementById('formMsg');
  const btn     = form.querySelector('.btn--submit');
  const countEl = document.getElementById('guestCount');
  const countRow = document.getElementById('countRow');

  /* --- киши санын тандоо --- */
  const MIN = 1, MAX = 20;

  const clamp = () => {
    let n = parseInt(countEl.value, 10);
    if (!Number.isFinite(n)) n = MIN;
    n = Math.min(MAX, Math.max(MIN, n));
    countEl.value = n;
    form.querySelectorAll('.stepper__btn').forEach(b => {
      const dir = Number(b.dataset.step);
      b.disabled = (dir < 0 && n <= MIN) || (dir > 0 && n >= MAX);
    });
    return n;
  };

  form.querySelectorAll('.stepper__btn').forEach(b => {
    b.addEventListener('click', () => {
      countEl.value = Number(countEl.value || MIN) + Number(b.dataset.step);
      clamp();
    });
  });
  countEl.addEventListener('input', clamp);
  countEl.addEventListener('blur', clamp);
  clamp();

  /* «Келе албайм» тандалса — сан суралбайт */
  const syncCount = () => {
    const coming = form.querySelector('input[name="answer"]:checked').value !== 'Келе албайм';
    countRow.hidden = !coming;
  };
  form.querySelectorAll('input[name="answer"]').forEach(r =>
    r.addEventListener('change', syncCount)
  );
  syncCount();

  const say = (text, isError = false) => {
    msgEl.textContent = text;
    msgEl.classList.toggle('is-error', isError);
  };

  const sendTelegram = (text) => {
    const { botToken, chatId } = CONFIG.telegram;
    if (!botToken || !chatId) return Promise.resolve(false);
    return fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text })
    }).then(r => r.ok).catch(() => false);
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = nameEl.value.trim();
    if (name.length < 2) {
      say('Сураныч, атыңызды жазып коюңуз.', true);
      nameEl.focus();
      return;
    }

    const answer = form.querySelector('input[name="answer"]:checked').value;
    const coming = answer !== 'Келе албайм';
    const count  = coming ? clamp() : 0;

    const text = `💌 Той: Абдурасул & Роза\nКонок: ${name}\nЖообу: ${answer}`
               + (coming ? `\nКиши саны: ${count}` : '');

    try {
      const saved = JSON.parse(localStorage.getItem('rsvp') || '[]');
      saved.push({ name, answer, count, at: new Date().toISOString() });
      localStorage.setItem('rsvp', JSON.stringify(saved));
    } catch (_) { /* эч нерсе */ }

    /* WhatsApp'ты дал ушул жерде — баскыч басылган учурда — ачабыз.
       `await`тан кийин ачсак, браузер блоктоп салышы мүмкүн. */
    let waOpened = false;
    if (CONFIG.whatsapp) {
      const url = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`;
      waOpened = !!window.open(url, '_blank', 'noopener');
      if (!waOpened) location.href = url;   // блокталса — ушул эле бетте ачабыз
    }

    sendTelegram(text);   // кошумча канал, конфигурацияланса иштейт

    ['.field', '.hint', '.radios', '.count'].forEach(sel => {
      const el = form.querySelector(sel);
      if (el) el.style.display = 'none';
    });
    btn.style.display = 'none';

    const thanks = coming
      ? `Рахмат, ${name}! Сизди ${count} киши болуп тойдо күтөбүз. 🤍`
      : `Рахмат, ${name}! Жообуңуз кабыл алынды.`;

    say(CONFIG.whatsapp
      ? `${thanks}\nWhatsApp ачылды — даяр билдирүүнү жөнөтүп коюңуз.`
      : thanks);
  });
})();
