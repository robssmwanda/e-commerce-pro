document.addEventListener('DOMContentLoaded', () => {
  console.log("SCRIPT OK");

  // ==========================================
  // AFFICHAGE DU MESSAGE DE SUCCÈS APRÈS STRIPE
  // ==========================================
  if (window.location.pathname === '/success') {
    const badge = document.querySelector('.cart-count');
    if (badge) badge.style.display = 'none';
  }

  let updatingCart = false;

  // =========================
  // ALERTES FLASH
  // =========================
  const alertBox = document.querySelector('.alert');
  if (alertBox) {
    setTimeout(() => {
      alertBox.classList.add('hidden');
      setTimeout(() => alertBox.remove(), 500);
    }, 3000);
  }

  // =========================
  // ACTIONS SUR LES INPUTS FORMULAIRES
  // =========================
  const inputs = document.querySelectorAll('.input-field');
  const form = document.querySelector('form');

  inputs.forEach(input => {
    input.addEventListener('input', () => {
      input.classList.remove('input-error');
      if (form) form.classList.remove('shake');

      const msg = document.querySelector('.error-message');
      if (msg) msg.style.opacity = '0';
    });
  });

  // =========================
  // CHARGEMENT DU COMPTEUR DE PANIER (BADGE)
  // =========================
  async function loadCartCount() {
    try {
      if (updatingCart) return;

      const res = await fetch('/cart-page', { 
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) return;

      const data = await res.json();
      const badge = document.querySelector('.cart-count');

      if (badge && data.cart) {
        const totalQty = data.cart.reduce((acc, item) => acc + item.quantity, 0);
        badge.textContent = totalQty;
        badge.style.display = totalQty === 0 ? 'none' : 'inline-block';
      }

    } catch (err) {
      console.error('Erreur chargement panier:', err);
    }
  }

  loadCartCount();

  // =========================
  // BOUTON AJOUTER AU PANIER (CATALOGUE)
  // =========================
  const btns = document.querySelectorAll('.add-to-cart');

  btns.forEach(btn => {
    btn.addEventListener('click', async function () {
      if (this.disabled) return;

      this.disabled = true;
      updatingCart = true;

      this.style.opacity = "0.6";
      this.style.cursor = "not-allowed";

      try {
        const product = {
          productId: this.dataset.id,
          name: this.dataset.name,
          price: Number(this.dataset.price),
          image: this.dataset.image
        };

        const res = await fetch('/cart/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(product)
        });

        if (res.status === 401) {
          window.location.href = '/sign-in';
          return;
        }

        const data = await res.json();

        if (data.status === 'success') {
          const badge = document.querySelector('.cart-count');
          if (badge) {
            badge.textContent = data.totalQty;
            badge.style.display = data.totalQty === 0 ? 'none' : 'inline-block';
          }

          this.innerText = "Ajouté ✓";
          this.style.background = "#000";

          const toast = document.createElement('div');
          toast.textContent = 'Produit ajouté au panier 🛒';
          toast.className = 'toast';
          document.body.appendChild(toast);

          setTimeout(() => toast.classList.add('show'), 10);

          setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
          }, 2000);

          setTimeout(() => {
            this.innerText = "Ajouter au panier";
            this.style.background = "";
            this.style.opacity = "";
            this.style.cursor = "";
            this.disabled = false;
            updatingCart = false;
          }, 1500);

        } else {
          this.disabled = false;
          this.style.opacity = "";
          this.style.cursor = "";
          updatingCart = false;
        }

      } catch (err) {
        console.error('Erreur ajout panier:', err);
        this.disabled = false;
        this.style.opacity = "";
        this.style.cursor = "";
        updatingCart = false;
      }
    });
  });

  // =========================
  // BOUTON RENVOI DE L'EMAIL
  // =========================
  const resendBtn = document.getElementById('resendBtn');
  let sendingEmail = false;

  if (resendBtn) {
    resendBtn.addEventListener('click', () => {
      if (sendingEmail) return;
      sendingEmail = true;

      setTimeout(() => {
        resendBtn.disabled = true;
        resendBtn.innerText = "Envoi en cours...";
      }, 50);
    });
    
    resendBtn.addEventListener('click', () => {
       resendBtn.style.transform = "scale(0.98)";
    });
  }
});

// ==========================================
// FONCTIONS GLOBALES (ACCESSIBLES VIA WINDOW)
// ==========================================

// 🔥 GESTION DYNAMIQUE DES QUANTITÉS ET DU STOCK EN DIRECT (CORRIGÉE)
window.updateCart = async function (url, itemId) {
  try {
    const errorContainer = document.getElementById('stock-error-container');
    const errorText = document.getElementById('stock-error-text');
    const btnInc = document.getElementById(`btn-inc-${itemId}`);

    const res = await fetch(url, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (res.redirected) {
      window.location.href = res.url;
      return;
    }

    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      console.log("Réponse HTML reçue au lieu de JSON.");
      window.location.reload();
      return;
    }

    const data = await res.json();

    if (!res.ok) {
      if (errorContainer && errorText) {
        errorText.innerText = data.message || "Limite de stock atteinte.";
        errorContainer.style.display = 'block';
      }
      if (btnInc) {
        btnInc.disabled = true;
        btnInc.style.cursor = 'not-allowed';
        btnInc.style.opacity = '0.5';
      }
      return;
    }

    if (errorContainer) errorContainer.style.display = 'none';

    if (data.total === 0 || data.cartLength === 0) {
      window.location.reload();
      return;
    }

    const qtyEl = document.getElementById(`qty-${itemId}`);
    if (qtyEl && data.newItemQty !== undefined) {
      qtyEl.textContent = data.newItemQty;

      if (data.newItemQty === 0) {
        const itemEl = document.querySelector(`#item-${itemId}`);
        if (itemEl) itemEl.remove();
      }
    }

    if (btnInc && data.newItemQty !== undefined) {
      const maxStock = parseInt(btnInc.getAttribute('data-stock'), 10) || 0;
      const currentQty = parseInt(data.newItemQty, 10);

      if (currentQty >= maxStock) {
        btnInc.disabled = true;
        btnInc.style.cursor = 'not-allowed';
        btnInc.style.opacity = '0.5';
      } else {
        btnInc.disabled = false;
        btnInc.style.cursor = '';
        btnInc.style.opacity = '';
      }
    }

    const totalEl = document.querySelector('#cart-total');
    if (totalEl && data.total !== undefined) {
      totalEl.textContent = `Total: ${data.total}$`;
    }

  } catch (err) {
    console.error("Erreur interceptée :", err);
  }
};

// 🔥 ACTION DE SUPPRESSION D'UN ARTICLE
window.confirmDelete = async function (url, itemId) {
  const confirmAction = confirm("Voulez-vous supprimer cet élément ?");
  if (!confirmAction) return;

  try {
    const res = await fetch(url, { method: 'POST' });
    const data = await res.json();

    if (data.status === 'success') {
      const itemEl = document.querySelector(`#item-${itemId}`);
      if (itemEl) itemEl.remove();

      if (data.total === 0) {
        window.location.reload();
        return;
      }

      const totalEl = document.querySelector('#cart-total');
      if (totalEl) totalEl.textContent = `Total: ${data.total}$`;
    }
  } catch (err) {
    console.error(err);
  }
};

// 🔥 SÉCURITÉ STRIPE : FONCTION AJOUTÉE POUR INITIALISER LE PAIEMENT
window.payWithStripe = async function() {
  try {
    const btn = document.querySelector('.checkout-btn');
    if (btn) {
      btn.disabled = true;
      btn.innerText = "Redirection vers Stripe...";
    }

    // Assurez-vous que l'URL d'appel correspond exactment à votre route de paiement Stripe
    const res = await fetch('/create-checkout-session', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (res.redirected) {
      window.location.href = res.url;
      return;
    }

    const data = await res.json();

    if (data.url) {
      window.location.href = data.url; // Redirection vers Stripe Checkout
    } else {
      alert("Erreur de session de paiement. Vérifiez vos clés Stripe ou logs serveur.");
      if (btn) {
        btn.disabled = false;
        btn.innerText = "Passer la commande";
      }
    }

  } catch (err) {
    console.error("Erreur Stripe :", err);
    alert("Une erreur technique est survenue.");
    const btn = document.querySelector('.checkout-btn');
    if (btn) {
      btn.disabled = false;
      btn.innerText = "Passer la commande";
    }
  }
};
