// Frontend logic (vanilla, production-safe)
// MOHAMED | FREITASBOOK | NUNCAMEXA

const fmtBRL = (cents) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((cents || 0) / 100);

const state = {
  qty: 1,
  productCents: 3790,
  bumpCents: 1590,
  discountCents: 200, // -R$ 2,00
  bumpOn: false,
  couponOn: true,
};

const els = {
  qtyVal: document.getElementById("qtyVal"),
  subtotal: document.getElementById("subtotal"),
  discounts: document.getElementById("discounts"),
  totalTop: document.getElementById("totalTop"),
  totalBottom: document.getElementById("totalBottom"),

  bumpToggle: document.getElementById("bumpToggle"),
  bumpBox: document.getElementById("bumpBox"),

  btnBuy: document.getElementById("btnBuy"),
  toast: document.getElementById("toast"),

  countdown: document.getElementById("countdown"),
  countdown2: document.getElementById("countdown2"),

  modal: document.getElementById("qrModal"),
  modalClose: document.getElementById("modalClose"),
  modalX: document.getElementById("modalX"),
  btnClose2: document.getElementById("btnClose2"),

  qrImg: document.getElementById("qrImg"),
  qrText: document.getElementById("qrText"),
  secureUrl: document.getElementById("secureUrl"),
  btnCopy: document.getElementById("btnCopy"),

  // Optional (if you add in future)
  useKeysFromEnv: document.getElementById("useKeysFromEnv"),
  sk: document.getElementById("sk"),
  pk: document.getElementById("pk"),

  cName: document.getElementById("cName"),
  cEmail: document.getElementById("cEmail"),
  cPhone: document.getElementById("cPhone"),
  cCpf: document.getElementById("cCpf"),

  couponRow: document.getElementById("couponRow"),
  couponTitle: document.getElementById("couponTitle"),
  couponSub: document.getElementById("couponSub"),
  couponIcon: document.getElementById("couponIcon"),
};

function showToast(msg) {
  if (!els.toast) return;
  els.toast.textContent = msg;
  els.toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => els.toast.classList.remove("show"), 2200);
}

function calc() {
  const itemsCents = state.qty * state.productCents + (state.bumpOn ? state.bumpCents : 0);
  const discount = state.couponOn ? state.discountCents : 0;
  const totalCents = Math.max(0, itemsCents - discount);
  return { itemsCents, totalCents, discount };
}

function render() {
  const { itemsCents, totalCents, discount } = calc();

  if (els.qtyVal) els.qtyVal.textContent = String(state.qty);
  if (els.subtotal) els.subtotal.textContent = fmtBRL(itemsCents);
  if (els.discounts) els.discounts.textContent = discount ? `- ${fmtBRL(discount)}` : `- ${fmtBRL(0)}`;
  if (els.totalTop) els.totalTop.textContent = fmtBRL(totalCents);
  if (els.totalBottom) els.totalBottom.textContent = fmtBRL(totalCents);

  if (els.bumpBox) els.bumpBox.classList.toggle("is-on", state.bumpOn);

  // Cupom UI
  if (els.couponSub && els.couponTitle && els.couponIcon) {
    els.couponSub.style.display = state.couponOn ? "flex" : "none";
    els.couponTitle.textContent = state.couponOn ? "Desconto do TikTok Shop" : "Adicionar cupom";
    els.couponIcon.classList.toggle("is-on", state.couponOn);
  }

  const footerLabel = document.querySelector(".footerTotal .muted");
  if (footerLabel) footerLabel.textContent = `Total (${state.qty} item${state.qty > 1 ? "s" : ""})`;
}

function openModal() {
  if (!els.modal) return;
  els.modal.classList.add("show");
  els.modal.setAttribute("aria-hidden", "false");
  setTimeout(() => els.qrText?.focus(), 50);
}

function closeModal() {
  if (!els.modal) return;
  els.modal.classList.remove("show");
  els.modal.setAttribute("aria-hidden", "true");
}

function validate() {
  const name = (els.cName?.value || "").trim();
  const email = (els.cEmail?.value || "").trim();
  const phone = (els.cPhone?.value || "").trim().replace(/\D/g, "");
  const cpf = (els.cCpf?.value || "").trim().replace(/\D/g, "");

  if (name.length < 5) return "Informe seu nome completo";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Informe um e-mail válido";
  if (phone.length < 10) return "Informe seu telefone com DDD";
  if (cpf.length !== 11) return "Informe um CPF válido (11 dígitos)";
  return null;
}

function buildPayload() {
  const { itemsCents, totalCents } = calc();

  const items = [
    {
      title: "365 dias amor com Deus",
      quantity: state.qty,
      tangible: false,
      unitPrice: state.productCents,
      product_image: location.origin + "/assets/produto.webp",
    },
  ];

  if (state.bumpOn) {
    items.push({
      title: "Bíblia leão de Judá",
      quantity: 1,
      tangible: false,
      unitPrice: state.bumpCents,
      product_image: location.origin + "/assets/orderbump.jpg",
    });
  }

  return {
    paymentMethod: "pix",
    pix: { expiresInDays: 1 },
    items,
    amount: totalCents,
    customer: {
      name: (els.cName?.value || "").trim(),
      email: (els.cEmail?.value || "").trim(),
      phone: (els.cPhone?.value || "").trim().replace(/\D/g, ""),
      document: { type: "cpf", number: (els.cCpf?.value || "").trim().replace(/\D/g, "") },
    },
    traceable: false,
    externalRef: "pedido_" + Date.now(),
    postbackUrl: location.origin + "/api/webhook/pixone",
    metadata: JSON.stringify({
      provider: "Pix One Checkout",
      order_items_cents: itemsCents,
      discount_cents: state.couponOn ? state.discountCents : 0,
      bump_on: state.bumpOn,
    }),
  };
}

function extractCopiaCola(resp) {
  const tx = resp?.data || resp;
  const pix = tx?.pix || resp?.pix;

  const qrcodeText =
    pix?.qrcodeText ||
    pix?.qrcode_text ||
    tx?.qrcodeText ||
    tx?.qrcode_text ||
    resp?.qrcodeText ||
    resp?.qrcode_text ||
    "";

  const secureUrl =
    tx?.secureUrl || tx?.secure_url || resp?.secureUrl || resp?.secure_url || "";

  return { qrcodeText: String(qrcodeText || "").trim(), secureUrl: String(secureUrl || "").trim() };
}

async function createTransaction() {
  const err = validate();
  if (err) return showToast(err);

  const payload = buildPayload();

  const useEnv = els.useKeysFromEnv ? !!els.useKeysFromEnv.checked : true;
  const sk = els.sk ? (els.sk.value || "").trim() : "";
  const pk = els.pk ? (els.pk.value || "").trim() : "";

  if (!useEnv && (!sk || !pk)) {
    showToast('Preencha sk/pk ou marque "Usar chaves do servidor"');
    return;
  }

  els.btnBuy.disabled = true;
  els.btnBuy.textContent = "GERANDO PIX...";

  try {
    const body = { payload, ...(useEnv ? {} : { auth: { sk, pk } }) };

    const res = await fetch("/api/create-transaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const msg = data?.message || data?.error || "Não foi possível gerar o Pix.";
      throw new Error(msg);
    }

    const { qrcodeText, secureUrl } = extractCopiaCola(data);

    // Copia & Cola é obrigatório
    if (!qrcodeText) {
      // fallback: se vier só link seguro
      if (secureUrl) {
        els.qrImg && (els.qrImg.style.display = "none");
        els.qrText && (els.qrText.value = "");
        if (els.secureUrl) {
          els.secureUrl.href = secureUrl;
          els.secureUrl.style.display = "flex";
        }
        openModal();
        showToast("Pix gerado! Abra o link seguro para pagar.");
        return;
      }
      throw new Error("Pix copia e cola não retornado. Verifique sua integração.");
    }

    // UI
    if (els.qrImg) els.qrImg.style.display = "none";
    if (els.qrText) els.qrText.value = qrcodeText;

    if (els.secureUrl) {
      els.secureUrl.href = secureUrl || "#";
      els.secureUrl.style.display = secureUrl ? "flex" : "none";
    }

    openModal();
    showToast("Pix gerado! Copie e cole para pagar.");
  } catch (e) {
    showToast(e?.message || "Erro ao gerar Pix");
  } finally {
    els.btnBuy.disabled = false;
    els.btnBuy.textContent = "COMPRAR";
  }
}

/* Events */
document.getElementById("qtyMinus")?.addEventListener("click", () => {
  state.qty = Math.max(1, state.qty - 1);
  render();
});

document.getElementById("qtyPlus")?.addEventListener("click", () => {
  state.qty = Math.min(99, state.qty + 1);
  render();
});

els.bumpToggle?.addEventListener("change", (e) => {
  state.bumpOn = !!e.target.checked;
  render();
});

els.bumpBox?.addEventListener("click", (e) => {
  if (e.target.tagName.toLowerCase() === "input" || e.target.closest("button,a")) return;
  state.bumpOn = !state.bumpOn;
  if (els.bumpToggle) els.bumpToggle.checked = state.bumpOn;
  render();
});

els.modalClose?.addEventListener("click", closeModal);
els.modalX?.addEventListener("click", closeModal);
els.btnClose2?.addEventListener("click", closeModal);

els.btnCopy?.addEventListener("click", async () => {
  const text = (els.qrText?.value || "").trim();
  if (!text) return showToast("Nada para copiar.");
  try {
    await navigator.clipboard.writeText(text);
    showToast("Código Pix copiado!");
  } catch {
    try {
      els.qrText?.select();
      document.execCommand("copy");
      showToast("Código Pix copiado!");
    } catch {
      showToast("Não foi possível copiar automaticamente.");
    }
  }
});

els.btnBuy?.addEventListener("click", createTransaction);

// Countdown (6:00)
let remaining = 6 * 60;
setInterval(() => {
  remaining = Math.max(0, remaining - 1);
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const t = `${mm}:${ss}`;
  if (els.countdown) els.countdown.textContent = t;
  if (els.countdown2) els.countdown2.textContent = t;
}, 1000);

function toggleCoupon() {
  state.couponOn = !state.couponOn;
  render();
  showToast(state.couponOn ? "Cupom aplicado!" : "Cupom removido");
}

if (els.couponRow) {
  els.couponRow.addEventListener("click", toggleCoupon);
  els.couponRow.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleCoupon();
    }
  });
}

render();
