// =============================================
//  DEXO CHECKERS — online_game.js
//  Matchmaking tizimi (Firebase Firestore)
//  Firebase: loyiha-11c74
// =============================================

const firebaseConfig = {
  apiKey: "AIzaSyA2vALrsz7tc5dencTlRFmVH4wlxFPjJ98",
  authDomain: "loyiha-11c74.firebaseapp.com",
  projectId: "loyiha-11c74",
  storageBucket: "loyiha-11c74.firebasestorage.app",
  messagingSenderId: "437733379812",
  appId: "1:437733379812:web:5a64c30627e58254fd66f1",
  measurementId: "G-5HRZFQ3YXS"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ── Telegram foydalanuvchi ──
const tgUser  = window.Telegram?.WebApp?.initDataUnsafe?.user;
const TG_ID   = tgUser ? String(tgUser.id) : 'test_' + Math.random().toString(36).slice(2, 8);
const TG_NAME = tgUser?.first_name || 'O\'yinchi';

// ── DOM refs ──
const coinMiniAmountEl  = document.getElementById('coinMiniAmount');
const onlineCountTextEl = document.getElementById('onlineCountText');
const searchTimerEl     = document.getElementById('searchTimer');
const countdownEl       = document.getElementById('countdown');
const myNameEl          = document.getElementById('myName');
const myIdEl            = document.getElementById('myId');
const oppNameEl         = document.getElementById('oppName');
const oppIdEl           = document.getElementById('oppId');

// ── State ──
let selectedBet      = 10;
let searchTimerSec   = 0;
let searchInterval   = null;
let queueDocRef      = null;
let queueListener    = null;
let currentRoomId    = null;
const SEARCH_TIMEOUT = 30;

// =============================================
//  INIT
// =============================================

// DX coin balans
if (TG_ID && !TG_ID.startsWith('test_')) {
  db.collection('users').doc(TG_ID).onSnapshot(snap => {
    if (snap.exists) {
      coinMiniAmountEl.textContent = formatNumber(snap.data().dxCoin ?? 0);
    }
  }, () => {});
}

// ── Onlayn o'yinchilar soni (index talab qilmaydi — JS da filter) ──
db.collection('queue').onSnapshot(snap => {
  const waiting = snap.docs.filter(d => d.data().status === 'waiting');
  onlineCountTextEl.textContent = waiting.length + ' nafar onlayn';
}, err => {
  console.error('Queue listen:', err);
});

// Garov tugmalari
document.querySelectorAll('.bet-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.bet-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedBet = parseInt(btn.dataset.bet);
  });
});

// =============================================
//  QIDIRUV BOSHLASH
// =============================================

async function startSearch() {
  showState('stateSearching');
  startTimer();

  try {
    // FIX: faqat bitta where — composite index talab qilmaydi
    // status filterni JS da qilamiz
    const snap = await db.collection('queue')
      .where('status', '==', 'waiting')
      .get();

    // O'zidan boshqa, xuddi shu garovdagi o'yinchi
    const others = snap.docs.filter(d =>
      d.id !== TG_ID &&
      d.data().bet === selectedBet
    );

    if (others.length > 0) {
      // Raqib topildi — xona yaratamiz
      const opponent = others[0];
      await matchPlayers(TG_ID, opponent.id, opponent.data().name || 'Raqib', selectedBet);
    } else {
      // Hech kim yo'q — queue ga qo'shamiz va kutamiz
      await joinQueue();
    }
  } catch (err) {
    console.error('Search error:', err);
    showNotFound();
  }
}

// =============================================
//  QUEUE GA QOYISH
// =============================================

async function joinQueue() {
  queueDocRef = db.collection('queue').doc(TG_ID);

  await queueDocRef.set({
    uid     : TG_ID,
    name    : TG_NAME,
    bet     : selectedBet,
    status  : 'waiting',
    joinedAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  // O'zimizni real-time kuzatamiz
  queueListener = queueDocRef.onSnapshot(snap => {
    if (!snap.exists) return;
    const data = snap.data();
    if (data.status === 'matched' && data.roomId) {
      stopTimer();
      showFoundScreen(data.roomId, data.opponentId, data.opponentName || 'Raqib');
    }
  }, err => {
    console.error('Queue snapshot error:', err);
    showNotFound();
  });

  // 30 soniyada hech kim kelmasa — topilmadi
  setTimeout(async () => {
    if (!queueListener) return;
    try {
      const snap = await queueDocRef.get();
      if (snap.exists && snap.data().status === 'waiting') {
        await cancelQueue();
        showNotFound();
      }
    } catch (e) {}
  }, SEARCH_TIMEOUT * 1000);
}

// =============================================
//  2 O'YINCHINI ULASH
// =============================================

async function matchPlayers(player1Id, player2Id, player2Name, bet) {
  const roomId = 'room_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);

  try {
    // Xona yaratish
    await db.collection('rooms').doc(roomId).set({
      player1     : player1Id,
      player1Name : TG_NAME,
      player2     : player2Id,
      player2Name : player2Name,
      bet         : bet,
      status      : 'starting',
      turn        : player1Id,
      createdAt   : firebase.firestore.FieldValue.serverTimestamp()
    });

    // 2-o'yinchining queue yozuvini matched qilish
    await db.collection('queue').doc(player2Id).update({
      status      : 'matched',
      roomId      : roomId,
      opponentId  : player1Id,
      opponentName: TG_NAME
    });

    // O'zimizni queue dan o'chirish
    await db.collection('queue').doc(player1Id).delete().catch(() => {});

    // Topildi ekrani
    showFoundScreen(roomId, player2Id, player2Name);

  } catch (err) {
    console.error('matchPlayers error:', err);
    showNotFound();
  }
}

// =============================================
//  TOPILDI EKRANI + COUNTDOWN
// =============================================

function showFoundScreen(roomId, opponentId, opponentName) {
  currentRoomId = roomId;
  stopTimer();
  if (queueListener) { queueListener(); queueListener = null; }

  myNameEl.textContent  = TG_NAME.toUpperCase();
  myIdEl.textContent    = 'ID: ' + String(TG_ID).slice(0, 10);
  oppNameEl.textContent = String(opponentName).toUpperCase();
  oppIdEl.textContent   = 'ID: ' + String(opponentId).slice(0, 10);

  showState('stateFound');

  let count = 3;
  countdownEl.textContent = count;

  const countInterval = setInterval(() => {
    count--;
    if (count <= 0) {
      clearInterval(countInterval);
      goToGame(roomId);
    } else {
      countdownEl.textContent = count;
    }
  }, 1000);
}

// =============================================
//  O'YIN SAHIFASIGA O'TISH
// =============================================

function goToGame(roomId) {
  window.location.href = 'start_online_game.html?room=' + roomId + '&uid=' + TG_ID;
}

// =============================================
//  BEKOR QILISH
// =============================================

async function cancelSearch() {
  stopTimer();
  await cancelQueue();
  window.location.href = 'game.html';
}

async function cancelQueue() {
  if (queueListener) { queueListener(); queueListener = null; }
  if (queueDocRef) {
    await queueDocRef.delete().catch(() => {});
    queueDocRef = null;
  }
}

// =============================================
//  QAYTA QIDIRISH
// =============================================

function retrySearch() {
  showState('stateIdle');
}

// =============================================
//  TIMER
// =============================================

function startTimer() {
  searchTimerSec = 0;
  updateTimerDisplay();
  searchInterval = setInterval(() => {
    searchTimerSec++;
    updateTimerDisplay();
  }, 1000);
}

function stopTimer() {
  if (searchInterval) { clearInterval(searchInterval); searchInterval = null; }
}

function updateTimerDisplay() {
  const m = String(Math.floor(searchTimerSec / 60)).padStart(2, '0');
  const s = String(searchTimerSec % 60).padStart(2, '0');
  searchTimerEl.textContent = m + ':' + s;
}

// =============================================
//  STATE SWITCHER
// =============================================

function showState(id) {
  ['stateIdle','stateSearching','stateFound','stateNotFound'].forEach(s => {
    const el = document.getElementById(s);
    if (el) el.classList.toggle('hidden', s !== id);
  });
}

function showNotFound() {
  stopTimer();
  cancelQueue();
  showState('stateNotFound');
}

// =============================================
//  NUMBER FORMAT
// =============================================

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000)    return (n / 1000).toFixed(1) + 'K';
  return n.toString();
}

// =============================================
//  BACKGROUND BOARD ANIMATION
// =============================================

const board = document.getElementById('bgBoard');
const COLS = 10, ROWS = 14;
const cells = [];

for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const cell = document.createElement('div');
    cell.className = 'bg-cell ' + ((r + c) % 2 === 0 ? 'dark' : 'light');
    board.appendChild(cell);
    cells.push({ el: cell, r, c });
  }
}

const pieceCells = cells.filter(cell => (cell.r + cell.c) % 2 === 1);

function randomPieces() {
  pieceCells.forEach(c => c.el.classList.remove('has-piece','p1','p2'));
  const shuffled = [...pieceCells].sort(() => Math.random() - 0.5);
  const count = Math.floor(pieceCells.length * 0.3);
  for (let i = 0; i < count; i++) {
    const cell = shuffled[i];
    cell.el.classList.add('has-piece', Math.random() > 0.5 ? 'p1' : 'p2');
  }
}

randomPieces();
setInterval(randomPieces, 4000);

// Sahifa yopilganda queue dan chiqish
window.addEventListener('beforeunload', () => {
  if (queueDocRef) queueDocRef.delete().catch(() => {});
});
