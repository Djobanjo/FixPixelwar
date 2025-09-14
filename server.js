// server.js
const express = require("express");
const admin = require("firebase-admin");
const bodyParser = require("body-parser");

// ⚠️ Récupérer le JSON depuis la variable d'environnement FIREBASE_ADMIN_SDK
const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://pixelwar-947d9-default-rtdb.europe-west1.firebasedatabase.app"
});

const db = admin.database();
const app = express();
app.use(bodyParser.json());

const COOLDOWN_MS = 5000; // 5 secondes
let lastPixelTime = {};

const cors = require("cors");
app.use(cors({
  origin: "https://djobanjo.github.io"
}));


app.post("/pixel", async (req, res) => {
  const { index, color, userId } = req.body;

  if (!index || !color || !userId) return res.status(400).send("Paramètres manquants");

  const now = Date.now();
  if (lastPixelTime[userId] && now - lastPixelTime[userId] < COOLDOWN_MS) {
    return res.status(429).send("Cooldown actif");
  }

  // Validation du pixel
  if (index < 0 || index >= 70*70) return res.status(400).send("Index invalide");
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return res.status(400).send("Couleur invalide");

  // Écriture dans Firebase
  await db.ref("pixels/" + index).set(color);

  lastPixelTime[userId] = now;

  res.send("Pixel placé ✅");
});

// Utiliser le port fourni par Render ou 3000 en local
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
