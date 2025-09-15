import express from "express";
import bodyParser from "body-parser";
import admin from "firebase-admin";

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: "https://pixelwarfix-default-rtdb.europe-west1.firebasedatabase.app/"
});

const db = admin.database();
const app = express();
app.use(bodyParser.json());

// ===============================
// 🔹 Config sécurité
// ===============================
const cooldownsByUid = {}; 
const cooldownsByIp = {}; 
const anonymousAccountsByIp = {}; 
const bannedIps = {}; 
const pixelHistoryByUid = {}; 

const COOLDOWN_MS_REAL = 5000; 
const COOLDOWN_MS_ANON = 20000; 
const MAX_ANON_PER_IP = 5; 
const MAX_PIXEL_DISTANCE = 15; 

// ===============================
// 🔹 Endpoint : placer un pixel
// ===============================
app.post("/pixel", async (req, res) => {
  try {
    const { index, color, token } = req.body;
    if (!token) return res.status(401).send("❌ Token manquant");

    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;
    const isAnonymous = decoded.firebase.sign_in_provider === "anonymous";

    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const now = Date.now();

    if (bannedIps[ip] && now < bannedIps[ip]) {
      return res.status(403).send("❌ IP temporairement bannie");
    }

    if (isAnonymous) {
      if (!anonymousAccountsByIp[ip]) anonymousAccountsByIp[ip] = [];
      anonymousAccountsByIp[ip] = anonymousAccountsByIp[ip].filter(ts => now - ts < 24*60*60*1000);
      anonymousAccountsByIp[ip].push(now);

      if (anonymousAccountsByIp[ip].length > MAX_ANON_PER_IP) {
        bannedIps[ip] = now + 60*60*1000;
        return res.status(429).send("❌ Trop de comptes anonymes créés, IP bannie 1h");
      }
    }

    const cooldown = isAnonymous ? COOLDOWN_MS_ANON : COOLDOWN_MS_REAL;
    if (cooldownsByUid[uid] && now - cooldownsByUid[uid] < cooldown) {
      const wait = Math.ceil((cooldown - (now - cooldownsByUid[uid])) / 1000);
      return res.status(429).send(`⏳ Cooldown UID : attends encore ${wait}s !`);
    }

    cooldownsByUid[uid] = now;

    if (cooldownsByIp[ip] && now - cooldownsByIp[ip] < COOLDOWN_MS_REAL) {
      const wait = Math.ceil((COOLDOWN_MS_REAL - (now - cooldownsByIp[ip])) / 1000);
      return res.status(429).send(`⏳ Cooldown IP : attends encore ${wait}s !`);
    }
    cooldownsByIp[ip] = now;

    if (!pixelHistoryByUid[uid]) pixelHistoryByUid[uid] = [];
    const history = pixelHistoryByUid[uid];
    const recent = history.filter(p => now - p.timestamp < 5000);
    if (recent.length > 0) {
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
    }
    recent.push({index, timestamp: now});
    pixelHistoryByUid[uid] = recent;

   
    if (typeof index !== "number" || index < 0 || index >= 70*70) {
      return res.status(400).send("❌ Index invalide !");
    }
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return res.status(400).send("❌ Couleur invalide !");
    }

    
    await db.ref("pixels").child(index).set(color);

    return res.send("✅ Pixel placé !");
  } catch (err) {
    console.error("Erreur:", err);
    return res.status(401).send("❌ Token invalide ou expiré");
  }
});

// ===============================
// 🔹 Lancer le serveur
// ===============================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Serveur actif sur http://localhost:${PORT}`));
