  (() => {
    // ===============================
    // 🔹 Configuration Firebase (inchangée)
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
    // 🔹 Variables principales
    // ===============================
    const grid = document.getElementById("grid");
    const colorPicker = document.getElementById("colorPicker");
    const cooldownDisplay = document.getElementById("cooldown");

    let isLoading = true;
    let canDraw = true;
    const size = 70;
    const cooldownTime = 5000; // ms

    let activePopup = null;
    let cooldownInterval = null;
    let cooldownRemaining = 0;

    // ✅ Message au démarrage
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
    // 🔹 Utilitaires couleur / conversions
    // ===============================
    function clampInt(v) {
      const n = Number(v) || 0;
      return Math.max(0, Math.min(255, Math.round(n)));
    }

    function rgbToHex(r, g, b) {
      return "#" + [r, g, b]
        .map(x => {
          const hex = parseInt(x, 10).toString(16);
          return hex.length === 1 ? "0" + hex : hex;
        })
        .join("");
    }

    function hexToRgb(hex) {
      if (!hex) return { r: 0, g: 0, b: 0 };
      hex = hex.replace(/^#/, "");
      if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
      const bigint = parseInt(hex, 16);
      return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
      };
    }

    // convertit une couleur CSS (rgb(), rgba(), #fff, #ffffff) en #rrggbb
    function cssColorToHex(color) {
      if (!color) return "#000000";
      color = color.trim();

      // si déjà hex
      if (color[0] === "#") {
        if (color.length === 4) {
          // #rgb -> #rrggbb
          return "#" + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
        }
        return color.length === 7 ? color.toLowerCase() : ("#" + color.slice(1).padStart(6, "0")).toLowerCase();
      }

      // si rgb(...) or rgba(...)
      let m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
      if (m) return rgbToHex(m[1], m[2], m[3]).toLowerCase();

      // dernier recours : laisser le navigateur interpréter (permet ex 'red')
      const tmp = document.createElement("div");
      tmp.style.color = color;
      document.body.appendChild(tmp);
      const computed = getComputedStyle(tmp).color;
      document.body.removeChild(tmp);
      m = computed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
      if (m) return rgbToHex(m[1], m[2], m[3]).toLowerCase();

      return "#000000";
    }

    // ===============================
    // 🔹 Afficher popup dynamique (modifié pour bien lire la couleur actuelle)
    // ===============================
    function showPopup(index, event) {
      if (isLoading) return;

      // Fermer l'ancienne popup
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

      // Couleur actuelle du pixel (R,G,B)
      const computed = getComputedStyle(pixel).backgroundColor; // "rgb(r, g, b)"
      const nums = (computed.match(/\d+/g) || []).map(Number);
      const r = nums[0] ?? 0, g = nums[1] ?? 0, b = nums[2] ?? 0;

      // petit util pour fermer proprement + clean interval local
      let popupWatcher = null;
      const cleanup = () => {
        pixel.classList.remove("pending");
        if (popupWatcher) clearInterval(popupWatcher);
        if (popup) popup.remove();
        activePopup = null;
      };

      // Rendu de la version "cooldown" (avec compteur live)
      const renderCooldown = () => {
        popup.innerHTML = `
          <span id="popupText" style="text-align:center;display:inline-block;">
            ⏳ Attendez <span id="popupCooldown">${cooldownRemaining}</span>s <br>
            <div style="margin-bottom:3px; margin-top:3px;">
              <button class="cancel" style="width:107px">Annuler</button>
            </div>
            <div>
              <button class="select";">Sélectionner🎨</button>
            </div>
          </span>
        `;

        // Boutons (ré-attacher à chaque rendu)
        popup.querySelectorAll(".cancel").forEach(btn => btn.addEventListener("click", cleanup));
        const selectBtn = popup.querySelector(".select");
        if (selectBtn) {
          selectBtn.addEventListener("click", () => {
            colorPicker.value = rgbToHex(r, g, b);
            // Si tu as des inputs R/G/B, on les sync
            const rIn = document.getElementById("rValue");
            const gIn = document.getElementById("gValue");
            const bIn = document.getElementById("bValue");
            if (rIn && gIn && bIn) {
              rIn.value = r; gIn.value = g; bIn.value = b;
            }
          });
        }
      };

      // Rendu de la version "valider ?"
      const renderValidate = () => {
        popup.innerHTML = `
          <span id="popupText" style="text-align:center;display:inline-block;">
            Valider ?
            <div style="margin-bottom:3px; margin-top:3px;">
              <button class="confirm" style="width:52px">Oui</button>
              <button class="cancel" style="width:52px">Non</button>
            </div>
            <div>
              <button class="select";">Sélectionner🎨</button>
            </div>
          </span>
        `;

        popup.querySelectorAll(".cancel").forEach(btn => btn.addEventListener("click", cleanup));

        const confirmBtn = popup.querySelector(".confirm");
        if (confirmBtn) {
          confirmBtn.addEventListener("click", () => { placePixel(index); cleanup(); });
        }

        const selectBtn = popup.querySelector(".select");
        if (selectBtn) {
          selectBtn.addEventListener("click", () => {
            colorPicker.value = rgbToHex(r, g, b);
            const rIn = document.getElementById("rValue");
            const gIn = document.getElementById("gValue");
            const bIn = document.getElementById("bValue");
            if (rIn && gIn && bIn) {
              rIn.value = r; gIn.value = g; bIn.value = b;
            }
          });
        }
      };

      // Choisir la vue initiale
      if (!canDraw) renderCooldown(); else renderValidate();

      // Positionner la popup
      const rect = pixel.getBoundingClientRect();
      popup.style.left = `${rect.left + window.scrollX + 20}px`;
      popup.style.top = `${rect.top + window.scrollY - 75}px`;

      // 👀 Petit watcher local : dès que canDraw repasse à true, on bascule vers "Valider ?"
      // (on ne touche PAS au compteur ici ; il est mis à jour par startCooldown())
      popupWatcher = setInterval(() => {
        if (canDraw && activePopup === popup) {
          renderValidate();
          clearInterval(popupWatcher);
          popupWatcher = null;
        }
        // si la popup a été fermée autrement
        if (!document.body.contains(popup)) {
          clearInterval(popupWatcher);
          popupWatcher = null;
        }
      }, 300);
    }


    // ===============================
    // 🔹 Placer un pixel
    // ===============================
    async function placePixel(index) {
      const color = colorPicker.value;
      const userId = "USER123"; // peut être généré côté client

      try {
        const res = await fetch("https://fixpixelwar.onrender.com/pixel", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ index, color, userId })
        });

        const text = await res.text();
        console.log(text);

        if (res.ok) startCooldown();
        else alert(text); // affichage message si cooldown actif ou erreur
      } catch (err) {
        console.error(err);
      }
    }



    // ===============================
    // 🔹 Gestion du cooldown
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

        // Maj du bandeau global
        if (cooldownDisplay) {
          if (cooldownRemaining > 0) {
            cooldownDisplay.textContent = `⏳Cooldown : ${cooldownRemaining}s⏳`;
          } else {
            cooldownDisplay.style.color = "#457028";
            cooldownDisplay.textContent = `✅Prêt à dessiner✅`;
          }
        }

        // ✅ Maj du compteur dans la popup si elle est ouverte
        const popupCounter = document.getElementById("popupCooldown");
        if (popupCounter) popupCounter.textContent = Math.max(0, cooldownRemaining);

        // Fin du cooldown
        if (cooldownRemaining <= 0) {
          clearInterval(cooldownInterval);
          canDraw = true;
        }
      }, 1000);
    }


    // ===============================
    // 🔹 Mise à jour en temps réel
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

    // ======================
    // 🔹 Gestion du Mode RGB (toggle + validation + synchro)
    // ======================
    // toggle button
    const toggleBtn = document.getElementById("toggleRgb");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        const rgbControls = document.getElementById("rgbControls");
        if (!rgbControls) return;
        rgbControls.style.display = (rgbControls.style.display === "none" || rgbControls.style.display === "") ? "block" : "none";
      });
    }

    // validate RGB button
    const validateBtn = document.getElementById("validateRgb");
    if (validateBtn) {
      validateBtn.addEventListener("click", () => {
        const r = clampInt(document.getElementById("rValue")?.value);
        const g = clampInt(document.getElementById("gValue")?.value);
        const b = clampInt(document.getElementById("bValue")?.value);
        const hex = rgbToHex(r, g, b);
        colorPicker.value = hex;
      });
    }

    // synchro colorPicker -> rgb inputs
    if (colorPicker) {
      colorPicker.addEventListener("input", () => {
        const hex = colorPicker.value;
        const rgb = hexToRgb(hex);
        const rIn = document.getElementById("rValue");
        const gIn = document.getElementById("gValue");
        const bIn = document.getElementById("bValue");
        if (rIn && gIn && bIn) {
          rIn.value = rgb.r;
          gIn.value = rgb.g;
          bIn.value = rgb.b;
        }
      });
    }

    // ======================
    // 🔹 usePixelColor (sélectionner la couleur du pixel dans le picker)
    // ======================
    function usePixelColor(index) {
      const pixel = grid.children[index];
      if (!pixel) return;
      const computed = getComputedStyle(pixel).backgroundColor;
      const hex = cssColorToHex(computed);
      colorPicker.value = hex;
      // mettre à jour également les inputs R/G/B si présents
      const rgb = hexToRgb(hex);
      const rIn = document.getElementById("rValue");
      const gIn = document.getElementById("gValue");
      const bIn = document.getElementById("bValue");
      if (rIn && gIn && bIn) {
        rIn.value = rgb.r;
        gIn.value = rgb.g;
        bIn.value = rgb.b;
      }
    }

    // Expose usePixelColor si tu veux l'appeler depuis la popup HTML inline (optionnel)
    window.usePixelColor = usePixelColor;

  })();
