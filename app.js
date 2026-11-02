// ================= НАСТРОЙКА АДМИНА =================
// ВСТАВЬ СЮДА СВОЙ 12-ЗНАЧНЫЙ ID
const ADMIN_ID = "207718233811"; 
// ====================================================

// ================= ЗАЩИТА ОТ КОНСОЛИ (ТОЛЬКО ДЛЯ ПК) =================
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
if (!isMobile) {
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('keydown', e => {
    if (e.key === 'F12' || e.keyCode === 123) { e.preventDefault(); return false; }
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) { e.preventDefault(); return false; }
    if (e.ctrlKey && (e.key === 'U' || e.key === 'u')) { e.preventDefault(); return false; }
  });
  setInterval(() => {
    const threshold = 200;
    if (window.outerWidth - window.innerWidth > threshold || window.outerHeight - window.innerHeight > threshold) {
      document.body.innerHTML = `<div style="display:flex; justify-content:center; align-items:center; height:100vh; background:#fff; text-align:center; font-family:sans-serif; z-index:999999; position:fixed; inset:0;"><div><h1 style="color:red; font-size:60px; margin-bottom:20px;">⛔ ДОСТУП ЗАПРЕЩЕН</h1><p style="font-size:24px; color:#333;">Пожалуйста, закройте консоль разработчика.</p></div></div>`;
    }
  }, 1000);
}

// ================= ПОДКЛЮЧЕНИЕ FIREBASE =================
const firebaseConfig = {
  apiKey: "AIzaSyByPXnKxjJyxgZust6YuD9lvdCs-lMSu3U",
  authDomain: "nexuschat-6e0b8.firebaseapp.com",
  databaseURL: "https://nexuschat-6e0b8-default-rtdb.firebaseio.com",
  projectId: "nexuschat-6e0b8",
  storageBucket: "nexuschat-6e0b8.firebasestorage.app",
  messagingSenderId: "952535643897",
  appId: "1:952535643897:web:6a1d5c8d998ec3110c5428",
  measurementId: "G-ZPBV76FJDK"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let currentUser = null;
let state = { nickname: "Гость", displayId: "", avatar: "", equippedFrame: "", balance: 0, inventory: [], offers: [], forcedItem: null, lastSpinMonth: "" };
let selectedTradeItems = [];
let currentTradeId = null;
let currentTradeData = null;
let unsubTrade = null;

// ================= ITEMS (ПРЕДМЕТЫ) =================
const ITEMS = {
  nothing: { id: 'nothing', name: 'НИЧЕГО', img: 'images/nothing.png', rarity: 'common' },
  frame1: { id: 'frame1', name: 'Рамка Крылья', img: 'images/frame1.png', rarity: 'rare' },
  frame2: { id: 'frame2', name: 'Рамка Кристалл', img: 'images/frame2.png', rarity: 'epic' },
  frame3: { id: 'frame3', name: 'Рамка Хэллоуин', img: 'images/frame3.png', rarity: 'epic' },
  frame4: { id: 'frame4', name: 'Рамка Огонь', img: 'images/frame4.png', rarity: 'legendary' },
  deagle: { id: 'deagle', name: 'Дигл Аурейт', img: 'images/deagle.png', rarity: 'mythic' },
  mp7_necro: { id: 'mp7_necro', name: 'AKR Некромант', img: 'images/mp7_necro.png', rarity: 'mythic' },
  mp7_red: { id: 'mp7_red', name: 'MP7 | Красный', img: 'images/mp7_red.png', rarity: 'rare' },
  ak_flame: { id: 'ak_flame', name: 'AK-47 | Пламя', img: 'images/ak_flame.png', rarity: 'epic' },
  berettas: { id: 'berettas', name: 'Berettas | Демон', img: 'images/berettas.png', rarity: 'rare' },
  ak_neon: { id: 'ak_neon', name: 'AK-47 | Неон', img: 'images/ak_neon.png', rarity: 'legendary' }
};

// ================= СИСТЕМА ВХОДА =================
let isLoginMode = true;
document.getElementById("tabLogin").addEventListener("click", () => {
  isLoginMode = true; document.getElementById("tabLogin").classList.add("active"); document.getElementById("tabRegister").classList.remove("active");
  document.getElementById("authSubmitBtn").textContent = "Войти"; document.getElementById("authError").textContent = "";
});
document.getElementById("tabRegister").addEventListener("click", () => {
  isLoginMode = false; document.getElementById("tabRegister").classList.add("active"); document.getElementById("tabLogin").classList.remove("active");
  document.getElementById("authSubmitBtn").textContent = "Создать аккаунт"; document.getElementById("authError").textContent = "";
});

document.getElementById("authSubmitBtn").addEventListener("click", async () => {
  const idInput = document.getElementById("authId").value.trim();
  const passInput = document.getElementById("authPass").value;
  const errorEl = document.getElementById("authError");

  if (!idInput || !passInput) { errorEl.textContent = "Заполни все поля!"; return; }
  const email = `${idInput}@nexus.chat`;
  const btn = document.getElementById("authSubmitBtn");
  btn.textContent = "Загрузка..."; btn.disabled = true;

  try {
    if (isLoginMode) {
      await auth.signInWithEmailAndPassword(email, passInput);
    } else {
      const nickCheck = await db.collection("nicknames").doc(idInput.toLowerCase()).get();
      if (nickCheck.exists) throw new Error("nick-taken");

      const userCredential = await auth.createUserWithEmailAndPassword(email, passInput);
      
      let newId; let isUnique = false;
      while (!isUnique) {
        newId = Math.floor(100000000000 + Math.random() * 900000000000).toString();
        const idCheck = await db.collection("users").where("displayId", "==", newId).get();
        if (idCheck.empty) isUnique = true;
      }

      await db.collection("users").doc(userCredential.user.uid).set({
        nickname: idInput, displayId: newId, avatar: "", equippedFrame: "", balance: 0, inventory: [], offers: [], forcedItem: null, lastSpinMonth: ""
      });
      await db.collection("nicknames").doc(idInput.toLowerCase()).set({ uid: userCredential.user.uid });
    }
  } catch (error) {
    btn.textContent = isLoginMode ? "Войти" : "Создать аккаунт"; btn.disabled = false;
    if (error.message === "nick-taken" || error.code === 'auth/email-already-in-use') errorEl.textContent = "Этот ID уже занят!";
    else if (error.code === 'auth/wrong-password') errorEl.textContent = "Неверный пароль!";
    else if (error.code === 'auth/user-not-found') errorEl.textContent = "Аккаунт не найден!";
    else errorEl.textContent = "Ошибка: " + error.message;
  }
});

document.getElementById("logoutBtn").addEventListener("click", () => { auth.signOut().then(() => window.location.reload()); });

// ================= АВТОРИЗАЦИЯ =================
auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    document.getElementById("authScreen").style.display = "none";
    
    db.collection("users").doc(user.uid).onSnapshot(doc => {
      if (doc.exists) {
        state = doc.data();
        
        // --- ФИКС: Автогенерация ID для старых аккаунтов (как твой otodus) ---
        if (!state.displayId) {
          let newId = Math.floor(100000000000 + Math.random() * 900000000000).toString();
          state.displayId = newId;
          db.collection("users").doc(user.uid).update({ displayId: newId });
        }
        // --------------------------------------------------------------------

        if (state.displayId === ADMIN_ID) {
          document.getElementById("navAdmin").style.display = "flex";
          populateAdminItems();
        }

        renderProfile(); renderInventory(); renderOffers(); checkMonthlySpin(); renderTradeSelection();
      }
    });
    setupTradeListeners();
  } else {
    currentUser = null;
    document.getElementById("authScreen").style.display = "flex";
  }
});

function saveState() { if (currentUser) db.collection("users").doc(currentUser.uid).update(state); }

// ================= ВКЛАДКИ =================
const pageTitles = { profile: "Профиль", roulette: "Рулетка", inventory: "Инвентарь", exchange: "Обмен", chat: "Чат", admin: "АДМИН ПАНЕЛЬ" };
document.querySelectorAll(".nav-item").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(s => s.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
    document.getElementById("pageTitle").textContent = pageTitles[btn.dataset.tab];
    if (btn.dataset.tab === "roulette") checkMonthlySpin();
  });
});

const $ = id => document.getElementById(id);
const currentMonthStr = new Date().getFullYear() + "-" + (new Date().getMonth() + 1);

function checkMonthlySpin() {
  if (state.lastSpinMonth === currentMonthStr) {
    $("spinFreeBtn1").disabled = true; $("spinFreeBtn1").textContent = "Уже открыто"; $("spinFreeBtn1").style.background = "#ccc";
  } else {
    $("spinFreeBtn1").disabled = false; $("spinFreeBtn1").textContent = "Бесплатно"; $("spinFreeBtn1").style.background = "";
  }
}

// ================= КЛИКЕР =================
$("clickerBtn").addEventListener("click", () => {
  state.balance = parseFloat((state.balance + 0.01).toFixed(2));
  saveState();
  $("balance").textContent = state.balance;
  $("miniBalance").textContent = state.balance;
});

// ================= ПРОФИЛЬ =================
function renderProfile() {
  $("nickname").value = state.nickname === "Гость" ? "" : state.nickname;
  $("heroId").textContent = state.displayId || "...";
  $("balance").textContent = state.balance; $("miniBalance").textContent = state.balance;
  $("miniName").textContent = state.nickname; $("heroName").textContent = state.nickname;

  if (state.avatar) {
    $("avatarImg").src = state.avatar; $("avatarImg").style.display = "block"; $("avatarPlaceholder").style.display = "none";
    $("miniAvatarImg").src = state.avatar; $("miniAvatarImg").style.display = "block"; $("miniAvatarPlaceholder").style.display = "none";
  } else {
    $("avatarImg").style.display = "none"; $("avatarPlaceholder").style.display = "block";
    $("miniAvatarImg").style.display = "none"; $("miniAvatarPlaceholder").style.display = "block";
    $("miniAvatarPlaceholder").textContent = (state.nickname[0] || "?").toUpperCase();
  }

  if (state.equippedFrame && state.avatar) {
    $("avatarFrameImg").src = state.equippedFrame; $("avatarFrameImg").style.display = "block"; $("removeFrameBtn").style.display = "inline-block";
    $("miniAvatarFrame").src = state.equippedFrame; $("miniAvatarFrame").style.display = "block";
  } else {
    $("avatarFrameImg").style.display = "none"; $("miniAvatarFrame").style.display = "none";
    $("removeFrameBtn").style.display = state.equippedFrame ? "inline-block" : "none";
  }
}

$("avatarFile").addEventListener("change", e => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => { state.avatar = ev.target.result; saveState(); renderProfile(); };
  reader.readAsDataURL(file);
});

$("saveProfile").addEventListener("click", async () => {
  const newNick = $("nickname").value.trim();
  if (!newNick) return;
  if (newNick.toLowerCase() !== state.nickname.toLowerCase()) {
    const check = await db.collection("nicknames").doc(newNick.toLowerCase()).get();
    if (check.exists) { alert("Этот ник уже занят!"); return; }
    await db.collection("nicknames").doc(state.nickname.toLowerCase()).delete();
    await db.collection("nicknames").doc(newNick.toLowerCase()).set({ uid: currentUser.uid });
  }
  state.nickname = newNick; saveState(); renderProfile();
  alert("Профиль сохранен!");
});

$("removeFrameBtn").addEventListener("click", () => { state.equippedFrame = ""; saveState(); renderProfile(); });

// ================= РУЛЕТКА =================
async function doSpin(caseType, isFree) {
  if (!isFree && state.balance < 50) { alert("Недостаточно алмазов! Нужно 50."); return; }
  
  try {
    await db.runTransaction(async (transaction) => {
      const userRef = db.collection("users").doc(currentUser.uid);
      const statsRef = db.collection("global_stats").doc("deagle_tracker");
      
      let droppedItem = null;
      let deagleCount = 0;

      if (state.forcedItem) {
        droppedItem = ITEMS[state.forcedItem.id];
        transaction.update(userRef, { forcedItem: null });
      } else {
        if (caseType === 'toxic') {
          const roll = Math.random() * 100;
          if (roll < 5) droppedItem = ITEMS.mp7_necro;
          else if (roll < 27.5) droppedItem = ITEMS.mp7_red;
          else if (roll < 50) droppedItem = ITEMS.ak_flame;
          else if (roll < 72.5) droppedItem = ITEMS.berettas;
          else droppedItem = ITEMS.ak_neon;
        } else {
          const statsDoc = await transaction.get(statsRef);
          deagleCount = statsDoc.exists ? statsDoc.data().count || 0 : 0;
          if (!statsDoc.exists) transaction.set(statsRef, { count: 0 });

          if (deagleCount < 3 && Math.random() < 1 / 10000000) {
            transaction.update(statsRef, { count: deagleCount + 1 });
            droppedItem = ITEMS.deagle;
          } else {
            const roll = Math.random() * 100;
            if (roll < 90) droppedItem = ITEMS.nothing;
            else if (roll < 92.5) droppedItem = ITEMS.frame1;
            else if (roll < 95) droppedItem = ITEMS.frame2;
            else if (roll < 97.5) droppedItem = ITEMS.frame3;
            else droppedItem = ITEMS.frame4;
          }
        }
      }

      const updates = {};
      if (!isFree) updates.balance = state.balance - 50;
      else updates.lastSpinMonth = currentMonthStr;

      if (droppedItem.id !== 'nothing') {
        const newInv = [...state.inventory, { ...droppedItem, uniqueId: Date.now() }];
        updates.inventory = newInv;
      }
      
      transaction.update(userRef, updates);

      checkMonthlySpin();
      
      const resultEl = $("spinResult");
      resultEl.className = "spin-result has-result";
      if (droppedItem.id === 'deagle') {
          resultEl.innerHTML = `<div style="font-size: 13px; color: red; font-weight: 800; margin-bottom: 5px;">!!! МИРОВОЙ ДРОП !!!</div><img src="${droppedItem.img}" style="max-height: 120px; margin: 0 auto 10px; display: block; filter: drop-shadow(0 0 20px gold);"><div style="margin-bottom: 4px; font-size: 22px;">🎉 Выпало: <span style="color: #ff0044;">${droppedItem.name}</span></div>`;
      } else if (droppedItem.id === 'nothing') {
          resultEl.innerHTML = `<img src="${droppedItem.img}" style="max-height: 80px; margin: 0 auto 10px; display: block; opacity: 0.5;"><div style="margin-bottom: 4px; color: var(--text-muted);">Увы, пусто.</div>`;
      } else {
          resultEl.innerHTML = `<img src="${droppedItem.img}" style="max-height: 100px; margin: 0 auto 10px; display: block;"><div style="margin-bottom: 4px;">🎉 Выпало: <span style="color: var(--accent);">${droppedItem.name}</span></div><div style="font-size: 13px; color: var(--text-muted);">Редкость: ${droppedItem.rarity}</div>`;
      }
    });
  } catch (error) {
    console.error(error);
    alert("Ошибка при крутке.");
  }
}

$("spinFreeBtn1").addEventListener("click", () => doSpin('standoff', true));
$("spinPaidBtn1").addEventListener("click", () => doSpin('standoff', false));
$("spinToxicBtn").addEventListener("click", () => doSpin('toxic', false));

// ================= ИНВЕНТАРЬ =================
function renderInventory() {
  const list = $("inventoryList"); list.innerHTML = "";
  if (state.inventory.length === 0) { list.innerHTML = `<div class="inv-empty">📦 Инвентарь пуст</div>`; return; }
  
  state.inventory.forEach(item => {
    const card = document.createElement("div");
    card.className = `item-card rarity-${item.rarity}`;
    const isFrame = item.id.startsWith('frame');

    card.innerHTML = `
      <button class="delete-btn" title="Удалить">✖</button>
      <div class="item-art"><img src="${item.img}" alt="${item.name}"></div>
      <div class="item-name">${item.name}</div>
      <div class="item-rarity-row"><span class="rarity-dot"></span><span>${item.rarity}</span></div>
      ${isFrame ? `<button class="equip-btn">Надеть</button>` : ''}
    `;

    card.querySelector('.delete-btn').onclick = (e) => {
      e.stopPropagation();
      if (confirm("Удалить предмет?")) {
        state.inventory = state.inventory.filter(i => i.uniqueId !== item.uniqueId);
        if (state.equippedFrame === item.img) state.equippedFrame = "";
        saveState(); renderProfile(); renderInventory(); renderTradeSelection();
      }
    };

    if (isFrame) {
        card.querySelector('.equip-btn').onclick = (e) => {
            e.stopPropagation(); state.equippedFrame = item.img; saveState(); renderProfile();
            e.target.textContent = "Надето!"; e.target.style.background = "#4caf50";
            setTimeout(() => { e.target.textContent = "Надеть"; e.target.style.background = ""; }, 1500);
        };
    }
    list.appendChild(card);
  });
}

// ================= ОБМЕН =================
function renderTradeSelection() {
  const list = $("myTradeItems"); list.innerHTML = "";
  if (state.inventory.length === 0) { list.innerHTML = `<p class="muted">Нет предметов.</p>`; return; }
  
  state.inventory.forEach(item => {
    const card = document.createElement("div");
    card.className = `item-card rarity-${item.rarity} selectable`;
    if (selectedTradeItems.includes(item.uniqueId)) card.classList.add("selected");

    card.innerHTML = `<div class="item-art"><img src="${item.img}"></div><div class="item-name">${item.name}</div>`;
    
    card.onclick = () => {
      if (selectedTradeItems.includes(item.uniqueId)) {
        selectedTradeItems = selectedTradeItems.filter(id => id !== item.uniqueId);
        card.classList.remove("selected");
      } else {
        selectedTradeItems.push(item.uniqueId);
        card.classList.add("selected");
      }
    };
    list.appendChild(card);
  });
}

$("sendTradeBtn").addEventListener("click", async () => {
  const targetInput = $("tradeTarget").value.trim();
  if (!targetInput) { alert("Введи ID или ник!"); return; }
  if (selectedTradeItems.length === 0) { alert("Выбери предметы!"); return; }

  let targetUid = null; let targetName = "";

  if (/^\d{12}$/.test(targetInput)) {
    const snap = await db.collection("users").where("displayId", "==", targetInput).get();
    if (!snap.empty) { targetUid = snap.docs[0].id; targetName = snap.docs[0].data().nickname; }
  } else {
    const targetDoc = await db.collection("nicknames").doc(targetInput.toLowerCase()).get();
    if (targetDoc.exists) { 
      targetUid = targetDoc.data().uid; 
      const uDoc = await db.collection("users").doc(targetUid).get();
      targetName = uDoc.data().nickname;
    }
  }

  if (!targetUid) { alert("Игрок не найден!"); return; }
  if (targetUid === currentUser.uid) { alert("Нельзя обмениваться с самим собой!"); return; }
  
  const itemsToSend = state.inventory.filter(i => selectedTradeItems.includes(i.uniqueId));

  await db.collection("trades").add({
    from: currentUser.uid, fromName: state.nickname, to: targetUid, toName: targetName,
    fromItems: itemsToSend, toItems: [], status: "pending", timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });

  alert("Предложение отправлено!");
  $("tradeTarget").value = ""; selectedTradeItems = []; renderTradeSelection();
});

function setupTradeListeners() {
  db.collection("trades").where("to", "==", currentUser.uid).where("status", "==", "pending")
    .onSnapshot(snapshot => {
      const list = $("tradeRequestsList"); list.innerHTML = "";
      const badge = $("tradeBadge"), card = $("tradeRequestsCard");
      if (snapshot.empty) { card.style.display = "none"; badge.style.display = "none"; } 
      else {
        card.style.display = "block"; badge.style.display = "flex";
        snapshot.forEach(doc => {
          const t = doc.data();
          list.innerHTML += `<div class="offer-item"><div><b>${t.fromName}</b> хочет обменяться!</div><div class="actions"><button class="btn btn-primary" style="padding: 6px 12px; font-size: 13px;" onclick="openTradeModal('${doc.id}')">Посмотреть</button></div></div>`;
        });
      }
  });

  db.collection("trades").where("from", "==", currentUser.uid).where("status", "==", "pending")
    .onSnapshot(snapshot => {
      const list = $("sentTradesList"); list.innerHTML = "";
      if (snapshot.empty) { list.innerHTML = `<p class="muted">Нет активных заявок.</p>`; return; }
      snapshot.forEach(doc => {
        const t = doc.data();
        list.innerHTML += `<div class="offer-item"><div>Ожидание от ${t.toName}...</div><div class="actions"><button class="btn btn-outline" style="padding: 6px 12px; font-size: 13px; color: red;" onclick="cancelTrade('${doc.id}')">Отменить</button></div></div>`;
      });
  });
}

window.openTradeModal = async (tradeId) => {
  currentTradeId = tradeId;
  $("tradeModal").style.display = "flex";
  $("waitingActions").style.display = "none"; $("tradeActions").style.display = "flex";
  $("theirTradeSideList").innerHTML = "";
  
  if (unsubTrade) unsubTrade();
  unsubTrade = db.collection("trades").doc(tradeId).onSnapshot(doc => {
    if (!doc.exists) { $("tradeModal").style.display = "none"; return; }
    const t = doc.data(); currentTradeData = t;
    $("tradePartnerName").textContent = t.fromName;

    const theirList = $("theirTradeSideList"); theirList.innerHTML = "";
    if (t.fromItems.length === 0) theirList.innerHTML = `<p class="muted" style="text-align:center; font-size:12px;">Пусто</p>`;
    t.fromItems.forEach(item => { theirList.innerHTML += `<div class="item-card rarity-${item.rarity}"><div class="item-art"><img src="${item.img}"></div><div class="item-name">${item.name}</div></div>`; });

    renderMyModalItems();
  });
};

function renderMyModalItems() {
  const myList = $("myTradeSideList"); myList.innerHTML = "";
  if (state.inventory.length === 0) { myList.innerHTML = `<p class="muted" style="text-align:center; font-size:12px;">Пусто</p>`; return; }
  
  state.inventory.forEach(item => {
    const isSelected = currentTradeData.toItems.find(i => i.uniqueId === item.uniqueId);
    const card = document.createElement("div");
    card.className = `item-card rarity-${item.rarity} selectable`;
    if (isSelected) card.classList.add("selected");
    card.innerHTML = `<div class="item-art"><img src="${item.img}"></div><div class="item-name">${item.name}</div>`;
    
    card.onclick = () => {
      const idx = currentTradeData.toItems.findIndex(i => i.uniqueId === item.uniqueId);
      if (idx > -1) currentTradeData.toItems.splice(idx, 1);
      else currentTradeData.toItems.push(item);
      db.collection("trades").doc(currentTradeId).update({ toItems: currentTradeData.toItems });
    };
    myList.appendChild(card);
  });
}

window.cancelTrade = async (tradeId) => { if (confirm("Отменить?")) await db.collection("trades").doc(tradeId).update({ status: "cancelled" }); };
$("declineTradeBtn").addEventListener("click", async () => { if (confirm("Отклонить?")) { await db.collection("trades").doc(currentTradeId).update({ status: "declined" }); $("tradeModal").style.display = "none"; } });
$("cancelTradeBtn").addEventListener("click", async () => { await db.collection("trades").doc(currentTradeId).update({ status: "cancelled" }); $("tradeModal").style.display = "none"; });

$("acceptTradeBtn").addEventListener("click", async () => {
  if (!currentTradeData) return;
  try {
    $("acceptTradeBtn").textContent = "Обмен..."; $("acceptTradeBtn").disabled = true;
    await db.runTransaction(async (transaction) => {
      const tradeRef = db.collection("trades").doc(currentTradeId);
      const tradeDoc = await transaction.get(tradeRef);
      if (tradeDoc.data().status !== "pending") throw new Error("Заявка уже неактивна!");

      const myRef = db.collection("users").doc(currentUser.uid);
      const theirRef = db.collection("users").doc(currentTradeData.from);
      const myDoc = await transaction.get(myRef);
      const theirDoc = await transaction.get(theirRef);

      let myInv = myDoc.data().inventory || [];
      let theirInv = theirDoc.data().inventory || [];

      myInv = myInv.filter(i => !currentTradeData.toItems.find(x => x.uniqueId === i.uniqueId));
      myInv.push(...currentTradeData.fromItems);
      theirInv = theirInv.filter(i => !currentTradeData.fromItems.find(x => x.uniqueId === i.uniqueId));
      theirInv.push(...currentTradeData.toItems);

      transaction.update(myRef, { inventory: myInv });
      transaction.update(theirRef, { inventory: theirInv });
      transaction.update(tradeRef, { status: "accepted" });
    });
    alert("Обмен успешно завершен!"); $("tradeModal").style.display = "none";
  } catch (error) {
    alert("Ошибка обмена: " + error.message);
    $("acceptTradeBtn").textContent = "Принять обмен"; $("acceptTradeBtn").disabled = false;
  }
});

// ================= АДМИН ПАНЕЛЬ =================
function populateAdminItems() {
  const sel = $("adminItemSelect"); sel.innerHTML = "";
  for (const key in ITEMS) {
    if (key === 'nothing') continue;
    const opt = document.createElement("option");
    opt.value = key; opt.textContent = ITEMS[key].name;
    sel.appendChild(opt);
  }
}

$("adminGiveDiamondsBtn").addEventListener("click", async () => {
  const targetId = $("adminTargetId").value.trim();
  const amount = parseFloat($("adminDiamonds").value);
  if (!targetId || isNaN(amount) || amount <= 0) { alert("Заполни все поля!"); return; }

  try {
    const snap = await db.collection("users").where("displayId", "==", targetId).get();
    if (snap.empty) { alert("Игрок не найден!"); return; }
    
    const userDoc = snap.docs[0];
    await db.collection("users").doc(userDoc.id).update({ balance: userDoc.data().balance + amount });
    $("adminLog").textContent = `✅ Выдано ${amount} алмазов игроку ${userDoc.data().nickname}`;
    $("adminDiamonds").value = "";
  } catch (e) { $("adminLog").textContent = "❌ Ошибка: " + e.message; }
});

$("adminGiveItemBtn").addEventListener("click", async () => {
  const targetId = $("adminTargetId").value.trim();
  const itemId = $("adminItemSelect").value;
  if (!targetId) { alert("Введи ID игрока!"); return; }

  try {
    const snap = await db.collection("users").where("displayId", "==", targetId).get();
    if (snap.empty) { alert("Игрок не найден!"); return; }
    
    const userDoc = snap.docs[0];
    await db.collection("users").doc(userDoc.id).update({ forcedItem: ITEMS[itemId] });
    $("adminLog").textContent = `✅ Игроку ${userDoc.data().nickname} выдан 100% шанс на ${ITEMS[itemId].name}!`;
  } catch (e) { $("adminLog").textContent = "❌ Ошибка: " + e.message; }
});

// ================= ЧАТ =================
db.collection("global_chat").orderBy("time", "asc").limitToLast(50).onSnapshot((snapshot) => {
  const box = $("chatBox"); box.innerHTML = "";
  snapshot.forEach((doc) => {
    const m = doc.data();
    box.innerHTML += `<div class="chat-msg"><div class="author">${m.author}</div><div>${m.text}</div></div>`;
  });
  box.scrollTop = box.scrollHeight;
});

async function sendMessage() {
  const input = $("chatInput"); const text = input.value.trim(); if (!text) return;
  input.value = ""; 
  await db.collection("global_chat").add({ author: state.nickname, text: text, time: firebase.firestore.FieldValue.serverTimestamp() });
}
$("sendMsg").addEventListener("click", sendMessage);
$("chatInput").addEventListener("keydown", e => { if (e.key === "Enter") sendMessage(); });