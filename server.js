// server.js
const express = require("express");
const admin = require("firebase-admin");
const bodyParser = require("body-parser");
const cors = require("cors");

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://pixelwarfix-default-rtdb.europe-west1.firebasedatabase.app"
});

const db = admin.database();
const app = express();

app.use(bodyParser.json());

// 🔹 Autoriser uniquement ton frontend
app.use(cors({
  origin: "https://djobanjo.github.io",
  credentials: true,
}));

// ===============================
// 🔹 Configuration sécurité
// ===============================
const cooldownsByUid = {};
const cooldownsByIp = {};
const anonymousAccountsByIp = {};
const bannedIps = {};
const pixelHistoryByUid = {};

const COOLDOWN_MS_REAL = 5000;   // 5s comptes réels
const COOLDOWN_MS_ANON = 5000;  // 20s comptes anonymes
const MAX_ANON_PER_IP = 5;
const MAX_PIXEL_DISTANCE = 15;

setInterval(() => {
  const now = Date.now();

  for (let uid in cooldownsByUid) {
    if (now - cooldownsByUid[uid] > 60 * 1000) delete cooldownsByUid[uid];
  }
  for (let ip in cooldownsByIp) {
    if (now - cooldownsByIp[ip] > 60 * 1000) delete cooldownsByIp[ip];
  }
  for (let uid in pixelHistoryByUid) {
    pixelHistoryByUid[uid] = pixelHistoryByUid[uid].filter(p => now - p.timestamp < 60 * 1000);
    if (pixelHistoryByUid[uid].length === 0) delete pixelHistoryByUid[uid];
  }
  for (let ip in anonymousAccountsByIp) {
    anonymousAccountsByIp[ip] = anonymousAccountsByIp[ip].filter(ts => now - ts < 24 * 60 * 60 * 1000);
    if (anonymousAccountsByIp[ip].length === 0) delete anonymousAccountsByIp[ip];
  }
  for (let ip in bannedIps) {
    if (now > bannedIps[ip]) delete bannedIps[ip];
  }
}, 60 * 1000); // toutes les 60s

// ===============================
// 🔹 Endpoint : placer un pixel
// ===============================
app.post("/pixel", async (req, res) => {
  const { index, color, token } = req.body;

  if (!token || index === undefined || !color) {
    return res.status(400).json({ message: "Paramètres manquants" });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;
    const isAnonymous = decoded.firebase.sign_in_provider === "anonymous";

    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const now = Date.now();


    if (bannedIps[ip] && now < bannedIps[ip]) {
      return res.status(403).json({ message: "IP temporairement bannie" });
    }


    if (isAnonymous) {
      if (!anonymousAccountsByIp[ip]) anonymousAccountsByIp[ip] = [];
      anonymousAccountsByIp[ip] = anonymousAccountsByIp[ip].filter(ts => now - ts < 24*60*60*1000);
      anonymousAccountsByIp[ip].push(now);

      if (anonymousAccountsByIp[ip].length > MAX_ANON_PER_IP) {
        bannedIps[ip] = now + 60*60*1000; // ban 1h
        return res.status(429).json({ message: "Trop de comptes anonymes, IP bannie 1h" });
      }
    }


    const cooldown = isAnonymous ? COOLDOWN_MS_ANON : COOLDOWN_MS_REAL;
    const last = cooldownsByUid[uid] || 0;
    if (now - last < cooldown) {
      const wait = cooldown - (now - last);
      return res.status(429).json({ message: `Cooldown UID`, cooldownMs: wait });
    }
    cooldownsByUid[uid] = now;


    const lastIp = cooldownsByIp[ip] || 0;
    if (now - lastIp < COOLDOWN_MS_REAL) {
      const wait = COOLDOWN_MS_REAL - (now - lastIp);
      return res.status(429).json({ message: `Cooldown IP`, cooldownMs: wait });
    }
    cooldownsByIp[ip] = now;


    if (!pixelHistoryByUid[uid]) pixelHistoryByUid[uid] = [];
    const history = pixelHistoryByUid[uid];
    const recent = history.filter(p => now - p.timestamp < 5000);
    for (let p of recent) {
      const prevX = p.index % 70;
      const prevY = Math.floor(p.index / 70);
      const currX = index % 70;
      const currY = Math.floor(index / 70);
      const distance = Math.sqrt((currX-prevX)**2 + (currY-prevY)**2);
      if (distance > MAX_PIXEL_DISTANCE) {
        console.warn(`⚠️ Flag UID ${uid} pour pixels dispersés`);
      }
    }
    recent.push({ index, timestamp: now });
    pixelHistoryByUid[uid] = recent;


    if (index < 0 || index >= 70*70) return res.status(400).json({ message: "Index invalide" });
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) return res.status(400).json({ message: "Couleur invalide" });


    await db.ref("pixels/" + index).set(color);

  
    res.json({ message: "Pixel placé ✅", cooldownMs: cooldown });

  } catch (err) {
    console.error(err);
    return res.status(401).json({ message: "Token invalide ou expiré" });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
