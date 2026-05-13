document.addEventListener('DOMContentLoaded', () => {
  console.log("SCRIPT OK");

  // ==========================================
  // AFFICHAGE DU MESSAGE DE SUCCÈS APRÈS STRIPE
  // ==========================================
  // Si on est sur la page de succès, on force le badge du panier à s'effacer
      if (window.location.pathname === '/success') {
        const badge = document.querySelector('.cart-count');
        if (badge) badge.style.display = 'none';
      }

  // L'accolade fermante incorrecte a été supprimée ici 🛠️

  let updatingCart = false;

  // =========================
  // ALERT
  // =========================
  const alertBox = document.querySelector('.alert');
  if (alertBox) {
    setTimeout(() => {
      alertBox.classList.add('hidden');
      setTimeout(() => alertBox.remove(), 500);
    }, 3000);
  }

  // =========================
  // INPUTS
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
  // LOAD CART COUNT
  // =========================
  async function loadCartCount() {
    try {
      if (updatingCart) return;

      const res = await fetch('/cart', {
        credentials: 'include'
      });

      const data = await res.json();
      const badge = document.querySelector('.cart-count');

      if (badge && data.items) {
        const totalQty = data.items.reduce((acc, item) => acc + item.quantity, 0);

        badge.textContent = totalQty;
        badge.style.display = totalQty === 0
          ? 'none'
          : 'inline-block';
      }

    } catch (err) {
      console.error('Erreur chargement panier:', err);
    }
  }

  loadCartCount();

  // =========================
  // BUTTON ADD TO CART
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

        console.log('PRODUCT:', product);

        const res = await fetch('/cart/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(product)
        });

        if (res.status === 401) {
          window.location.href = '/sign-in';
          return;
        }

        const data = await res.json();
        console.log('ADD RESPONSE:', data);

        if (data.status === 'success') {

          const badge = document.querySelector('.cart-count');
          if (badge) {
            badge.textContent = data.totalQty;
            badge.style.display = data.totalQty === 0
              ? 'none'
              : 'inline-block';
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

}); // ✅ L'écouteur global DOMContentLoaded se ferme correctement ici maintenant

// ==========================================
// FONCTIONS GLOBALES (ACCESSIBLES VIA WINDOW)
// ==========================================
window.confirmDelete = async function (url, itemId) {
  const confirmAction = confirm("Voulez-vous supprimer cet élément ?");
  if (!confirmAction) return;

  try {
    const res = await fetch(url, { method: 'POST' });
    const data = await res.json();

    if (data.status === 'success') {
      const itemEl = document.querySelector(`#item-${itemId}`);
      if (itemEl) itemEl.remove();

      const totalEl = document.querySelector('#cart-total');
      if (totalEl) {
        totalEl.textContent = `Total: ${data.total}$`;
      }
    }
  } catch (err) {
    console.error(err);
  }
};

window.payWithStripe = async function () {
  try {
    console.log("CLICK OK");

    const res = await fetch('/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    const data = await res.json();
    console.log("STRIPE RESPONSE:", data);

    if (data.url) {
      // 🔥 FORCER REDIRECTION PROPRE
      window.location.assign(data.url);
      return;
    }

    alert(data.message || 'Erreur Stripe');

  } catch (err) {
    console.error(err);
  }
};