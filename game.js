// =============================================
//  DEXO CHECKERS — game.js
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

// ── Telegram ID ──
const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
const TG_ID  = tgUser ? String(tgUser.id) : null;

// ── Coin ko'rsatish ──
const coinMiniAmountEl = document.getElementById('coinMiniAmount');

if (TG_ID) {
  db.collection('users').doc(TG_ID).onSnapshot((snap) => {
    if (snap.exists) {
      const bal = snap.data().dxCoin ?? 0;
      coinMiniAmountEl.textContent = formatNumber(bal);
    }
  });
} else {
  coinMiniAmountEl.textContent = '—';
}

// ── Number formatter ──
function formatNumber(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

// ── Mode buttons ──
function goOnline() {
  const card = document.getElementById('onlineCard');
  card.style.transform = 'scale(0.96)';
  setTimeout(() => {
    window.location.href = 'online_game.html';
  }, 180);
}

function goOffline() {
  const card = document.getElementById('offlineCard');
  card.style.transform = 'scale(0.96)';
  setTimeout(() => {
    window.location.href = 'offline_game.html';
  }, 180);
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

const pieceCells = cells.filter(cell => (cell.r + cell.c) % 2 === 1);

function randomPieces() {
  pieceCells.forEach(c => {
    c.el.classList.remove('has-piece', 'p1', 'p2');
  });
  const shuffled = [...pieceCells].sort(() => Math.random() - 0.5);
  const count = Math.floor(pieceCells.length * 0.32);
  for (let i = 0; i < count; i++) {
    const cell = shuffled[i];
    cell.el.classList.add('has-piece');
    cell.el.classList.add(Math.random() > 0.5 ? 'p1' : 'p2');
  }
}

randomPieces();
setInterval(randomPieces, 4000);
