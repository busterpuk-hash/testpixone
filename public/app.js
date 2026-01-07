// Frontend logic (no frameworks)
const fmtBRL = (cents) => {
  const v = (cents / 100).toFixed(2).replace('.', ',');
  const [i, d] = v.split(',');
  return `R$ ${i.replace(/\B(?=(\d{3})+(?!\d))/g, '.')} ,${d}`.replace(' ,', ',');
};

const toCents = (str) => Math.round(Number(String(str).replace('.', '').replace(',', '.')) * 100);

const state = {
  qty: 1,
  productCents: 3790,
  bumpCents: 1590,
  discountCents: 200, // valor do cupom (-2,00)
  bumpOn: false,
  couponOn: true
};

const els = {
  qtyVal: document.getElementById('qtyVal'),
  subtotal: document.getElementById('subtotal'),
  discounts: document.getElementById('discounts'),
  totalTop: document.getElementById('totalTop'),
  totalBottom: document.getElementById('totalBottom'),
  bumpToggle: document.getElementById('bumpToggle'),
  bumpBox: document.getElementById('bumpBox'),
  btnBuy: document.getElementById('btnBuy'),
  toast: document.getElementById('toast'),
  countdown: document.getElementById('countdown'),
  countdown2: document.getElementById('countdown2'),
  modal: document.getElementById('qrModal'),
  modalClose: document.getElementById('modalClose'),
  modalX: document.getElementById('modalX'),
  btnClose2: document.getElementById('btnClose2'),
  qrImg: document.getElementById('qrImg'),
  qrText: document.getElementById('qrText'),
  secureUrl: document.getElementById('secureUrl'),
  btnCopy: document.getElementById('btnCopy'),
  useKeysFromEnv: document.getElementById('useKeysFromEnv'),
  sk: document.getElementById('sk'),
  pk: document.getElementById('pk'),
  cName: document.getElementById('cName'),
  cEmail: document.getElementById('cEmail'),
  cPhone: document.getElementById('cPhone'),
  cCpf: document.getElementById('cCpf'),
  couponRow: document.getElementById('couponRow'),
  couponTitle: document.getElementById('couponTitle'),
  couponSub: document.getElementById('couponSub'),
  couponIcon: document.getElementById('couponIcon')
};

function showToast(msg){
  els.toast.textContent = msg;
  els.toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(()=>els.toast.classList.remove('show'), 2200);
}

function calc(){
  const itemsCents = state.qty * state.productCents + (state.bumpOn ? state.bumpCents : 0);
  const discount = state.couponOn ? state.discountCents : 0;
  const totalCents = Math.max(0, itemsCents - discount);
  return { itemsCents, totalCents, discount };
}

function render(){
  els.qtyVal.textContent = String(state.qty);
  const { itemsCents, totalCents, discount } = calc();

  els.subtotal.textContent = fmtBRL(itemsCents);
  els.discounts.textContent = `- ${fmtBRL(state.discountCents)}`.replace('R$ ', 'R$ ');
  els.totalTop.textContent = fmtBRL(totalCents);
  els.totalBottom.textContent = fmtBRL(totalCents);

  els.bumpBox.classList.toggle('is-on', state.bumpOn);

  // Cupom UI
  if(els.couponSub && els.couponTitle && els.couponIcon){
    els.couponSub.style.display = state.couponOn ? 'flex' : 'none';
    els.couponTitle.textContent = state.couponOn ? 'Desconto do TikTok Shop' : 'Adicionar cupom';
    els.couponIcon.classList.toggle('is-on', state.couponOn);
  }
  document.querySelector('.footerTotal .muted').textContent = `Total (${state.qty} item${state.qty>1?'s':''})`;
}

document.getElementById('qtyMinus').addEventListener('click', ()=>{
  state.qty = Math.max(1, state.qty - 1);
  render();
});

document.getElementById('qtyPlus').addEventListener('click', ()=>{
  state.qty = Math.min(99, state.qty + 1);
  render();
});

els.bumpToggle.addEventListener('change', (e)=>{
  state.bumpOn = !!e.target.checked;
  render();
});

els.bumpBox.addEventListener('click', (e)=>{
  if(e.target.tagName.toLowerCase() === 'input') return;
  // toggle when clicking the box (except on links)
  state.bumpOn = !state.bumpOn;
  els.bumpToggle.checked = state.bumpOn;
  render();
});

function openModal(){
  els.modal.classList.add('show');
  els.modal.setAttribute('aria-hidden', 'false');
}
function closeModal(){
  els.modal.classList.remove('show');
  els.modal.setAttribute('aria-hidden', 'true');
}

els.modalClose.addEventListener('click', closeModal);
els.modalX.addEventListener('click', closeModal);
els.btnClose2.addEventListener('click', closeModal);

els.btnCopy.addEventListener('click', async ()=>{
  try{
    await navigator.clipboard.writeText(els.qrText.value);
    showToast('Código Pix copiado!');
  }catch{
    els.qrText.select();
    document.execCommand('copy');
    showToast('Código Pix copiado!');
  }
});

function validate(){
  const name = els.cName.value.trim();
  const email = els.cEmail.value.trim();
  const phone = els.cPhone.value.trim().replace(/\D/g,'');
  const cpf = els.cCpf.value.trim().replace(/\D/g,'');

  if(name.length < 5) return 'Informe seu nome completo';
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Informe um e-mail válido';
  if(phone.length < 10) return 'Informe seu telefone com DDD';
  if(cpf.length !== 11) return 'Informe um CPF válido (11 dígitos)';
  return null;
}

function buildPayload(){
  const { itemsCents, totalCents, discount } = calc();

  const items = [
    {
      title: "365 dias amor com Deus",
      quantity: state.qty,
      tangible: false,
      unitPrice: state.productCents,
      product_image: location.origin + "/assets/produto.webp"
    }
  ];

  if(state.bumpOn){
    items.push({
      title: "Bíblia leão de Judá",
      quantity: 1,
      tangible: false,
      unitPrice: state.bumpCents,
      product_image: location.origin + "/assets/orderbump.jpg"
    });
  }

  // externalRef uniquely identifies the order
  const externalRef = "pedido_" + Date.now();

  return {
    paymentMethod: "pix",
    pix: { expiresInDays: 1 },
    items,
    amount: totalCents,
    customer: {
      name: els.cName.value.trim(),
      email: els.cEmail.value.trim(),
      phone: els.cPhone.value.trim().replace(/\D/g,''),
      document: { type: "cpf", number: els.cCpf.value.trim().replace(/\D/g,'') }
    },
    traceable: false,
    externalRef,
    // set your webhook URL on server; but keep placeholder for convenience
    postbackUrl: location.origin + "/api/webhook/pixone",
    metadata: JSON.stringify({
      provider: "Pix One Checkout",
      order_items_cents: itemsCents,
      discount_cents: state.discountCents,
      bump_on: state.bumpOn
    })
  };
}

async function createTransaction(){
  const err = validate();
  if(err){ showToast(err); return; }

  const payload = buildPayload();

  // Keys: prefer server env, but optionally send from UI for testing
const useEnv = els.useKeysFromEnv ? els.useKeysFromEnv.checked : true;

const sk = els.sk ? els.sk.value.trim() : "";
const pk = els.pk ? els.pk.value.trim() : "";

const keyBlock = (!useEnv && (!sk || !pk))
  ? 'Preencha sk/pk ou marque "Usar chaves do servidor"'
  : null;

if(keyBlock){ showToast(keyBlock); return; }

els.btnBuy.disabled = true;
els.btnBuy.textContent = "GERANDO PIX...";

try{
  const body = {
    payload,
    ...(useEnv ? {} : { auth: { sk, pk } })
  };

  const res = await fetch("/api/create-transaction", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = await res.json().catch(()=>null);
  if(!res.ok){
    const msg = data?.message || data?.error || "Não foi possível gerar o Pix.";
    throw new Error(msg);
  }


    const t = data?.data || data;
    const qrcode = t?.pix?.qrcode;
    const qrcodeText = t?.pix?.qrcodeText;
    const secureUrl = t?.secureUrl;

   // Normaliza resposta: aceita {data:{...}} ou {...}
const tx = data?.data || data;
const pix = tx?.pix || data?.pix;

// Pega SOMENTE o copia e cola
const qrcodeText = pix?.qrcodeText || tx?.qrcodeText || data?.qrcodeText;
const secureUrl = tx?.secureUrl || tx?.secure_url || data?.secureUrl || data?.secure_url;

// Exige apenas o copia e cola
if(!qrcodeText){
  throw new Error("Pix copia e cola não retornado. Verifique sua integração.");
}

// Oculta QR Code em imagem (caso exista no HTML)
if(els.qrImg){
  els.qrImg.style.display = "none";
}

// Preenche o campo de copia e cola
els.qrText.value = qrcodeText;

// Link externo (opcional)
els.secureUrl.href = secureUrl || "#";
els.secureUrl.style.display = secureUrl ? "flex" : "none";

// Abre modal
openModal();
showToast("Pix gerado! Copie e cole para pagar.");


els.btnBuy.addEventListener('click', createTransaction);

// mini countdown 6:00
let remaining = 6 * 60;
setInterval(()=>{
  remaining = Math.max(0, remaining - 1);
  const mm = String(Math.floor(remaining / 60)).padStart(2,'0');
  const ss = String(remaining % 60).padStart(2,'0');
  const t = `${mm}:${ss}`;
  els.countdown.textContent = t;
  els.countdown2.textContent = t;
}, 1000);

render();


function toggleCoupon(){
  state.couponOn = !state.couponOn;
  render();
  showToast(state.couponOn ? "Cupom aplicado!" : "Cupom removido");
}

if(els.couponRow){
  els.couponRow.addEventListener("click", toggleCoupon);
  els.couponRow.addEventListener("keydown", (e)=>{
    if(e.key === "Enter" || e.key === " "){
      e.preventDefault();
      toggleCoupon();
    }
  });
}




/*
  ███╗   ███╗ ██████╗ ██╗  ██╗ █████╗ ███╗   ███╗███████╗██████╗ 
  ████╗ ████║██╔═══██╗██║  ██║██╔══██╗████╗ ████║██╔════╝██╔══██╗
  ██╔████╔██║██║   ██║███████║███████║██╔████╔██║█████╗  ██║  ██║
  ██║╚██╔╝██║██║   ██║██╔══██║██╔══██║██║╚██╔╝██║██╔══╝  ██║  ██║
  ██║ ╚═╝ ██║╚██████╔╝██║  ██║██║  ██║██║ ╚═╝ ██║███████╗██████╔╝
  ╚═╝     ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝╚═════╝

  MOHAMED | FREITASBOOK
  NUNCAMEXA
*/
