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
  const size = 70;

  let canDraw = true;
  let cooldownInterval = null;
  let activePopup = null;

  if (cooldownDisplay) cooldownDisplay.textContent = "⏳Chargement de la map⏳";

  // ===============================
  // 🔹 Création de la grille
  // ===============================
  for (let i = 0; i < size * size; i++) {
    const pixel = document.createElement("div");
    pixel.classList.add("pixel");
    pixel.dataset.index = i;
    pixel.addEventListener("click", () => showPopup(i));
    grid.appendChild(pixel);
  }

  // ===============================
  // 🔹 Fonctions couleur
  // ===============================
  function clampInt(v) { return Math.max(0, Math.min(255, Math.round(Number(v)||0))); }
  function rgbToHex(r,g,b) { return "#" + [r,g,b].map(x=>parseInt(x,10).toString(16).padStart(2,"0")).join(""); }
  function hexToRgb(hex) {
    hex=hex.replace(/^#/,"");
    if(hex.length===3) hex=hex.split("").map(c=>c+c).join("");
    const bigint=parseInt(hex,16);
    return { r:(bigint>>16)&255, g:(bigint>>8)&255, b:bigint&255 };
  }

  // ===============================
  // 🔹 Popup de confirmation
  // ===============================
function showPopup(index) {
  if (activePopup) {
    activePopup.remove();
    document.querySelectorAll(".pixel.pending").forEach(p=>p.classList.remove("pending"));
  }

  const pixel = grid.children[index];
  pixel.classList.add("pending");

  const popup = document.createElement("div");
  popup.classList.add("popup");
  document.body.appendChild(popup);
  activePopup = popup;

  const {r,g,b} = hexToRgb(window.getComputedStyle(pixel).backgroundColor);

  const cleanup = () => { 
    pixel.classList.remove("pending"); 
    popup.remove(); 
    activePopup=null; 
  };

  if (canDraw) {
    popup.innerHTML = `
      <div>Valider ?</div>
      <div class="buttons">
        <button class="confirm">Oui</button>
        <button class="cancel">Non</button>
      </div>
      <button class="select">Sélectionner🎨</button>
    `;

    popup.querySelector(".confirm").addEventListener("click", () => { placePixel(index); cleanup(); });
    popup.querySelector(".cancel").addEventListener("click", cleanup);
    popup.querySelector(".select").addEventListener("click", () => { colorPicker.value = rgbToHex(r,g,b); });
  } else {
    popup.innerHTML = `
      <div>⏳ Cooldown actif</div>
      <div class="buttons">
        <button class="cancel">Annuler</button>
      </div>
      <button class="select">Sélectionner🎨</button>
    `;

    popup.querySelector(".cancel").addEventListener("click", cleanup);
    popup.querySelector(".select").addEventListener("click", () => { colorPicker.value = rgbToHex(r,g,b); });
  }

  const rect = pixel.getBoundingClientRect();
  popup.style.left = `${rect.left + window.scrollX}px`;
  popup.style.top = `${rect.top + window.scrollY - 70}px`;
}


  // ===============================
  // 🔹 Placer un pixel via backend sécurisé
  // ===============================
  async function placePixel(index) {
    if (!canDraw) return;
    const color = colorPicker.value;
    const user = firebase.auth().currentUser;
    if (!user) { alert("⚠️ Pas connecté à Firebase"); return; }

    try {
      const token = await user.getIdToken();
      const res = await fetch("https://fixpixelwar.onrender.com/pixel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index, color, token })
      });

      const data = await res.json().catch(() => null);
      if (res.ok) {
        const cooldown = data?.cooldownMs || 5000;
        startCooldown(cooldown);
      } else {
        alert(data?.message || "Erreur serveur");
        console.warn("Serveur :", data);
      }
    } catch (err) { console.error("❌ Erreur envoi pixel:", err); }
  }

  // ===============================
  // 🔹 Cooldown côté client synchronisé
  // ===============================
  function startCooldown(duration=5000) {
    canDraw=false;
    let remaining = Math.ceil(duration/1000);
    if(cooldownDisplay) cooldownDisplay.textContent=`⏳Cooldown : ${remaining}s⏳`;

    if(cooldownInterval) clearInterval(cooldownInterval);

    cooldownInterval=setInterval(()=>{
      remaining--;
      if(cooldownDisplay) cooldownDisplay.textContent = remaining>0 ? `⏳Cooldown : ${remaining}s⏳` : "✅Prêt à dessiner✅";
      if(remaining<=0){ clearInterval(cooldownInterval); canDraw=true; }
    },1000);
  }

  // ===============================
  // 🔹 Mise à jour temps réel
  // ===============================
  db.ref("pixels").on("value", snapshot => {
    const data = snapshot.val();
    if(!data) return;
    Object.keys(data).forEach(i=>grid.children[i].style.background = data[i]);
    if(canDraw && cooldownDisplay) cooldownDisplay.textContent="✅Prêt à dessiner✅";
  });

})();
