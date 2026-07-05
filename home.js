// =============================================
//  DEXO CHECKERS — home.js
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

// ── DOM refs ──
const coinAmountEl = document.getElementById('coinAmount');
const statWinsEl   = document.getElementById('statWins');
const statLossEl   = document.getElementById('statLosses');
const statGamesEl  = document.getElementById('statGames');

// ── Telegram ID olish ──
const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
const TG_ID  = tgUser ? String(tgUser.id) : null;

if (!TG_ID) {
  // Telegram tashqarisida ochilgan bo'lsa ogohlantirish
  coinAmountEl.textContent = 'TG kerak';
  console.warn('Telegram WebApp topilmadi. Bu Mini App faqat Telegramda ishlaydi.');
} else {
  loadUserData(TG_ID);
}

// ── Load user data from Firestore ──
function loadUserData(uid) {
  const userRef = db.collection('users').doc(uid);

  userRef.onSnapshot((snap) => {
    if (snap.exists) {
      const data = snap.data();
      const balance = data.dxCoin ?? 0;
      coinAmountEl.textContent = formatNumber(balance);
      statWinsEl.textContent   = data.wins   ?? 0;
      statLossEl.textContent   = data.losses ?? 0;
      statGamesEl.textContent  = data.games  ?? 0;
    } else {
      // Yangi foydalanuvchi uchun boshlang'ich qiymat
      userRef.set({
        dxCoin : 100,
        wins   : 0,
        losses : 0,
        games  : 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
  });
}

// ── Number formatter ──
function formatNumber(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

// =============================================
//  BACKGROUND CHECKER BOARD (animated pieces)
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

// Place decorative pieces on dark cells
const pieceCells = cells.filter(cell => (cell.r + cell.c) % 2 === 1);

function randomPieces() {
  // Clear all pieces
  pieceCells.forEach(c => {
    c.el.classList.remove('has-piece', 'p1', 'p2');
  });

  // Randomly pick some cells for pieces
  const shuffled = [...pieceCells].sort(() => Math.random() - 0.5);
  const count = Math.floor(pieceCells.length * 0.35);

  for (let i = 0; i < count; i++) {
    const cell = shuffled[i];
    cell.el.classList.add('has-piece');
    cell.el.classList.add(Math.random() > 0.5 ? 'p1' : 'p2');
  }
}

randomPieces();
setInterval(randomPieces, 4000);
