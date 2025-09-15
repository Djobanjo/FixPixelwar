(() => {
  // ===============================
  // 🔹 Configuration Firebase
  // ===============================
  const firebaseConfig = {
    apiKey: "AIzaSyCK_lMv34wFWLI8tH52_7mHYOOoh03_u_0",
    authDomain: "pixelwar-947d9.firebaseapp.com",
    projectId: "pixelwarfix",
    storageBucket: "pixelwarfix.firebasestorage.app",
    messagingSenderId: "870240954549",
    appId: "1:870240954549:web:e83aa53ef7f2b5271eb6fc",
    databaseURL: "https://pixelwarfix-default-rtdb.europe-west1.firebasedatabase.app/"
  };

  firebase.initializeApp(firebaseConfig);
  const db = firebase.database();

  // ===============================
  // 🔹 Auth anonyme
  // ===============================
  firebase.auth().signInAnonymously()
    .then(() => console.log("✅ Connecté en anonyme"))
    .catch(err => console.error("❌ Erreur Auth anonyme:", err));

  // ===============================
  // 🔹 Variables principales
  // ===============================
  const grid = document.getElementById("grid");
  const colorPicker = document.getElementById("colorPicker");
  const cooldownDisplay = document.getElementById("cooldown");

  let isLoading = true;
  let canDraw = true;
  const size = 70;
  const cooldownTime = 5000; 
  let activePopup = null;
  let cooldownInterval = null;
  let cooldownRemaining = 0;

  if (cooldownDisplay) cooldownDisplay.textContent = "⏳Chargement de la map⏳";

  // ===============================
  // 🔹 Création de la grille
  // ===============================
  for (let i = 0; i < size * size; i++) {
    const pixel = document.createElement("div");
    pixel.classList.add("pixel");
    pixel.dataset.index = i;
    pixel.style.background = "#FAFAFA";
    pixel.addEventListener("click", (e) => showPopup(i, e));
    grid.appendChild(pixel);
  }

  // ===============================
  // 🔹 Placer un pixel
  // ===============================
  async function placePixel(index) {
    const color = colorPicker.value;
    const user = firebase.auth().currentUser;

    if (!user) {
      alert("⚠️ Pas connecté à Firebase");
      return;
    }

    try {
      const token = await user.getIdToken(); // 🔑 Token sécurisé
      const res = await fetch("https://fixpixelwar.onrender.com/pixel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index, color, token })
      });

      const text = await res.text();
      console.log(text);
      if (res.ok) startCooldown();
      else alert(text);
    } catch (err) {
      console.error("❌ Erreur envoi pixel:", err);
    }
  }

  // ===============================
  // 🔹 Cooldown
  // ===============================
  function startCooldown() {
    canDraw = false;
    cooldownRemaining = cooldownTime / 1000;

    if (cooldownDisplay) {
      cooldownDisplay.style.color = "#b61a16";
      cooldownDisplay.textContent = `⏳Cooldown : ${cooldownRemaining}s⏳`;
    }

    if (cooldownInterval) clearInterval(cooldownInterval);

    cooldownInterval = setInterval(() => {
      cooldownRemaining--;
      if (cooldownDisplay) {
        cooldownDisplay.textContent =
          cooldownRemaining > 0
            ? `⏳Cooldown : ${cooldownRemaining}s⏳`
            : `✅Prêt à dessiner✅`;
        if (cooldownRemaining <= 0) cooldownDisplay.style.color = "#457028";
      }
      const popupCounter = document.getElementById("popupCooldown");
      if (popupCounter) popupCounter.textContent = Math.max(0, cooldownRemaining);
      if (cooldownRemaining <= 0) {
        clearInterval(cooldownInterval);
        canDraw = true;
      }
    }, 1000);
  }

  // ===============================
  // 🔹 Mise à jour temps réel
  // ===============================
  db.ref("pixels").on("value", snapshot => {
    const data = snapshot.val();
    if (!data) return;
    Object.keys(data).forEach(i => {
      grid.children[i].style.background = data[i];
    });
    isLoading = false;
    if (canDraw && cooldownDisplay) {
      cooldownDisplay.style.color = "#457028";
      cooldownDisplay.textContent = "✅Prêt à dessiner✅";
    }
  });

  // ===============================
  // 🔹 Les fonctions couleurs & popup restent identiques
  // ===============================
  
})();
