(() => {
  // Prevent double-init (avoids duplicated listeners / redeclarations)
  if (window.__TIKTOK_CHECKOUT_INITED__) return;
  window.__TIKTOK_CHECKOUT_INITED__ = true;

  // Prices (cents)
  const PRODUCT_CENTS = 3790;
  const BUMP_CENTS = 1590;
  const COUPON_DISCOUNT_CENTS = 200; // -R$ 2,00

  const state = {
    qty: 1,
    bumpOn: false,
    couponOn: true, // deixa ativo pra bater com seu resumo/total
  };

  const els = {
    // Qty
    qtyMinus: document.getElementById("qtyMinus"),
    qtyPlus: document.getElementById("qtyPlus"),
    qtyVal: document.getElementById("qtyVal"),

    // Totals
    subtotal: document.getElementById("subtotal"),
    discounts: document.getElementById("discounts"),
    totalTop: document.getElementById("totalTop"),
    totalBottom: document.getElementById("totalBottom"),

    // Coupon row
    couponRow: document.getElementById("couponRow"),
    couponTitle: document.getElementById("couponTitle"),
    couponSub: document.getElementById("couponSub"),
    couponIcon: document.getElementById("couponIcon"),

    // Bump
    bumpBox: document.getElementById("bumpBox"),
    bumpToggle: document.getElementById("bumpToggle"),

    // Customer
    cName: document.getElementById("cName"),
    cEmail: document.getElementById("cEmail"),
    cPhone: document.getElementById("cPhone"),
    cCpf: document.getElementById("cCpf"),

    // CTA
    btnBuy: document.getElementById("btnBuy"),
    toast: document.getElementById("toast"),

    // Countdown
    countdown: document.getElementById("countdown"),
    countdown2: document.getElementById("countdown2"),

    // Modal
    modal: document.getElementById("qrModal"),
    modalClose: document.getElementById("modalClose"),
    modalX: document.getElementById("modalX"),
    btnClose2: document.getElementById("btnClose2"),

    qrBox: document.querySelector(".qrbox"),
    qrImg: document.getElementById("qrImg"),
    qrText: document.getElementById("qrText"),
    btnCopy: document.getElementById("btnCopy"),
  };

  const fmtBRL = (cents) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((cents || 0) / 100);

  function showToast(msg) {
    if (!els.toast) return;
    els.toast.textContent = msg;
    els.toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => els.toast.classList.remove("show"), 2200);
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

  function calc() {
    const itemsCents = state.qty * PRODUCT_CENTS + (state.bumpOn ? BUMP_CENTS : 0);
    const discount = state.couponOn ? COUPON_DISCOUNT_CENTS : 0;
    const totalCents = Math.max(0, itemsCents - discount);
    return { itemsCents, discount, totalCents };
  }

  function render() {
    const { itemsCents, discount, totalCents } = calc();

    if (els.qtyVal) els.qtyVal.textContent = String(state.qty);

    if (els.subtotal) els.subtotal.textContent = fmtBRL(itemsCents);
    if (els.discounts) els.discounts.textContent = `- ${fmtBRL(discount)}`;
    if (els.totalTop) els.totalTop.textContent = fmtBRL(totalCents);
    if (els.totalBottom) els.totalBottom.textContent = fmtBRL(totalCents);

    // Cupom UI
    if (els.couponSub) els.couponSub.style.display = state.couponOn ? "flex" : "none";
    if (els.couponTitle) els.couponTitle.textContent = "Desconto do TikTok Shop";
    if (els.couponIcon) els.couponIcon.style.opacity = state.couponOn ? "1" : "0.6";

    // Bump UI
    if (els.bumpBox) els.bumpBox.classList.toggle("is-on", state.bumpOn);
    if (els.bumpToggle) els.bumpToggle.checked = state.bumpOn;
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
    const { totalCents, itemsCents, discount } = calc();

    const items = [
      {
        title: "365 dias amor com Deus",
        quantity: state.qty,
        tangible: false,
        unitPrice: PRODUCT_CENTS,
        product_image: location.origin + "/assets/produto.webp",
      },
    ];

    if (state.bumpOn) {
      items.push({
        title: "Bíblia leão de Judá",
        quantity: 1,
        tangible: false,
        unitPrice: BUMP_CENTS,
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
      metadata: JSON.stringify({
        provider: "Pix One Checkout",
        order_items_cents: itemsCents,
        discount_cents: discount,
        bump_on: state.bumpOn,
      }),
      traceable: false,
      externalRef: "pedido_" + Date.now(),
      postbackUrl: location.origin + "/api/webhook/pixone",
    };
  }

  // Finds EMV BRCode anywhere in response (starts with 000201)
  function deepFindPixCode(obj) {
    const seen = new Set();
    const stack = [obj];
    while (stack.length) {
      const cur = stack.pop();
      if (!cur) continue;

      if (typeof cur === "string") {
        const s = cur.trim();
        if (s.startsWith("000201")) return s;
        continue;
      }
      if (typeof cur !== "object") continue;
      if (seen.has(cur)) continue;
      seen.add(cur);

      if (Array.isArray(cur)) {
        for (const v of cur) stack.push(v);
      } else {
        for (const k of Object.keys(cur)) stack.push(cur[k]);
      }
    }
    return "";
  }

  // Extract only "copia e cola"
  function extractPixCopyPaste(resp) {
    // 1) backend normalizado (ideal)
    const direct = String(resp?.qrcodeText || "").trim();
    if (direct) return direct;

    // 2) caminhos comuns (caso backend ainda retorne cru)
    const tx = resp?.data || resp;
    const pix = tx?.pix || resp?.pix;

    const candidates = [
      pix?.qrcodeText,
      pix?.qrcode_text,
      pix?.emv,
      pix?.brcode,
      pix?.payload,
      tx?.qrcodeText,
      tx?.qrcode_text,
      resp?.qrcodeText,
      resp?.qrcode_text,
    ]
      .filter(Boolean)
      .map((v) => String(v).trim());

    for (const c of candidates) {
      if (c) return c;
    }

    // 3) fallback definitivo: varre tudo e pega BRCode
    return deepFindPixCode(resp);
  }

  async function createTransaction() {
    const err = validate();
    if (err) return showToast(err);

    const payload = buildPayload();

    els.btnBuy.disabled = true;
    els.btnBuy.textContent = "GERANDO PIX...";

    try {
      const res = await fetch("/api/create-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || data?.error || "Falha ao gerar Pix.");
      }

      const pixCode = extractPixCopyPaste(data);

      if (!pixCode) {
        // deixa um log útil para debug sem travar UI
        console.log("API RESPONSE (no pix code):", data);
        throw new Error("Pix COPIA/COLA não retornou. Verifique o retorno da API.");
      }

      // UI: só copia/cola — oculta QR
      if (els.qrBox) els.qrBox.style.display = "none";
      if (els.qrImg) els.qrImg.style.display = "none";

      els.qrText.value = pixCode;
      openModal();
      showToast("Pix gerado! Copie e cole para pagar.");
    } catch (e) {
      showToast(e?.message || "Erro ao gerar Pix");
      console.error(e);
    } finally {
      els.btnBuy.disabled = false;
      els.btnBuy.textContent = "COMPRAR";
    }
  }

  // Events
  els.qtyMinus?.addEventListener("click", () => {
    state.qty = Math.max(1, state.qty - 1);
    render();
  });
  els.qtyPlus?.addEventListener("click", () => {
    state.qty = Math.min(99, state.qty + 1);
    render();
  });

  els.bumpToggle?.addEventListener("change", (e) => {
    state.bumpOn = !!e.target.checked;
    render();
  });
  els.bumpBox?.addEventListener("click", (e) => {
    if (e.target.tagName.toLowerCase() === "input") return;
    state.bumpOn = !state.bumpOn;
    render();
  });

  els.couponRow?.addEventListener("click", () => {
    state.couponOn = !state.couponOn;
    render();
    showToast(state.couponOn ? "Cupom aplicado!" : "Cupom removido!");
  });

  els.btnBuy?.addEventListener("click", createTransaction);

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

  // Countdown 06:00
  let remaining = 6 * 60;
  setInterval(() => {
    remaining = Math.max(0, remaining - 1);
    const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
    const ss = String(remaining % 60).padStart(2, "0");
    const t = `${mm}:${ss}`;
    if (els.countdown) els.countdown.textContent = t;
    if (els.countdown2) els.countdown2.textContent = t;
  }, 1000);

  render();
})();
