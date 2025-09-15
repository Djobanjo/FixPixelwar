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
  firebase.auth().onAuthStateChanged(user => {
    if (!user) {
      firebase.auth().signInAnonymously()
        .then(u => console.log("✅ Anonyme connecté", u.user.uid))
        .catch(err => console.error("❌ Erreur auth anonyme:", err));
    } else {
      console.log("✅ Utilisateur déjà connecté", user.uid);
    }
  });

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
    pixel.addEventListener("click", () => showPopup(i));
    grid.appendChild(pixel);
  }

  // ===============================
  // 🔹 Utilitaires couleur / conversions
  // ===============================
  function clampInt(v) {
    const n = Number(v) || 0;
    return Math.max(0, Math.min(255, Math.round(n)));
  }

  function rgbToHex(r, g, b) {
    return "#" + [r, g, b].map(x => {
      const hex = parseInt(x, 10).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    }).join("");
  }

  function hexToRgb(hex) {
    if (!hex) return { r: 0, g: 0, b: 0 };
    hex = hex.replace(/^#/, "");
    if (hex.length === 3) hex = hex.split("").map(c => c+c).join("");
    const bigint = parseInt(hex, 16);
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
  }

  // ===============================
  // 🔹 Afficher popup dynamique
  // ===============================
  function showPopup(index) {
    if (isLoading) return;

    if (activePopup) {
      activePopup.remove();
      document.querySelectorAll(".pixel.pending").forEach(p => p.classList.remove("pending"));
    }

    const pixel = grid.children[index];
    pixel.classList.add("pending");

    const popup = document.createElement("div");
    popup.classList.add("popup");
    document.body.appendChild(popup);
    activePopup = popup;

    const computed = getComputedStyle(pixel).backgroundColor;
    const nums = (computed.match(/\d+/g) || []).map(Number);
    const r = nums[0] ?? 0, g = nums[1] ?? 0, b = nums[2] ?? 0;

    const cleanup = () => {
      pixel.classList.remove("pending");
      if (popup) popup.remove();
      activePopup = null;
    };

    const renderValidate = () => {
      popup.innerHTML = `
        <span id="popupText" style="text-align:center;display:inline-block;">
          Valider ?
          <div style="margin:3px 0;">
            <button class="confirm" style="width:52px">Oui</button>
            <button class="cancel" style="width:52px">Non</button>
          </div>
          <div>
            <button class="select">Sélectionner🎨</button>
          </div>
        </span>
      `;
      popup.querySelector(".cancel")?.addEventListener("click", cleanup);
      popup.querySelector(".confirm")?.addEventListener("click", () => { placePixel(index); cleanup(); });
      popup.querySelector(".select")?.addEventListener("click", () => {
        colorPicker.value = rgbToHex(r, g, b);
        const rIn = document.getElementById("rValue");
        const gIn = document.getElementById("gValue");
        const bIn = document.getElementById("bValue");
        if (rIn && gIn && bIn) { rIn.value = r; gIn.value = g; bIn.value = b; }
      });
    };

    if (!canDraw) {
      popup.innerHTML = `
        <span id="popupText" style="text-align:center;display:inline-block;">
          ⏳ Cooldown actif <br>
          <div style="margin:3px 0;">
            <button class="cancel" style="width:107px">Annuler</button>
          </div>
          <div>
            <button class="select">Sélectionner🎨</button>
          </div>
        </span>
      `;
      popup.querySelector(".cancel")?.addEventListener("click", cleanup);
      popup.querySelector(".select")?.addEventListener("click", () => {
        colorPicker.value = rgbToHex(r, g, b);
      });
    } else renderValidate();

    const rect = pixel.getBoundingClientRect();
    popup.style.left = `${rect.left + window.scrollX + 20}px`;
    popup.style.top = `${rect.top + window.scrollY - 75}px`;
  }

  // ===============================
  // 🔹 Placer un pixel via backend sécurisé
  // ===============================
  async function placePixel(index) {
    const user = firebase.auth().currentUser;
    if (!user) { alert("⚠️ Pas connecté à Firebase"); return; }

    const color = colorPicker.value;
    try {
      const token = await user.getIdToken();
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
  // 🔹 Cooldown côté UI
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
  // 🔹 Toggle RGB
  // ===============================
  const toggleBtn = document.getElementById("toggleRgb");
  toggleBtn?.addEventListener("click", () => {
    const rgbControls = document.getElementById("rgbControls");
    if (!rgbControls) return;
    rgbControls.style.display = (rgbControls.style.display === "none" || rgbControls.style.display === "") ? "block" : "none";
  });

  const validateBtn = document.getElementById("validateRgb");
  validateBtn?.addEventListener("click", () => {
    const r = clampInt(document.getElementById("rValue")?.value);
    const g = clampInt(document.getElementById("gValue")?.value);
    const b = clampInt(document.getElementById("bValue")?.value);
    colorPicker.value = rgbToHex(r,g,b);
  });

  colorPicker?.addEventListener("input", () => {
    const rgb = hexToRgb(colorPicker.value);
    const rIn = document.getElementById("rValue");
    const gIn = document.getElementById("gValue");
    const bIn = document.getElementById("bValue");
    if (rIn && gIn && bIn) { rIn.value=rgb.r; gIn.value=rgb.g; bIn.value=b.rgb; }
  });
})();
