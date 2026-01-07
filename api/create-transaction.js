export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { payload, auth } = req.body || {};
    if (!payload) return res.status(400).json({ error: "payload é obrigatório" });

    const envSK = process.env.PIXONE_SK || "";
    const envPK = process.env.PIXONE_PK || "";
    const sk = auth?.sk || envSK;
    const pk = auth?.pk || envPK;

    if (!sk || !pk) {
      return res.status(400).json({
        error: "Chaves ausentes: configure PIXONE_SK/PIXONE_PK nas variáveis do Vercel ou envie em auth."
      });
    }

    const ip =
      (req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
        req.socket?.remoteAddress ||
        "")
        .trim();
    payload.ip = payload.ip || ip || "0.0.0.0";

    payload.paymentMethod = "pix";
    payload.traceable = payload.traceable ?? false;
    payload.pix = payload.pix || { expiresInDays: 1 };

    const PIXONE_TX_URL = "https://api.pixone.com.br/api/v1/transactions";
    const authHeader = "Basic " + Buffer.from(`${sk}:${pk}`, "utf8").toString("base64");

    const upstream = await fetch(PIXONE_TX_URL, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await upstream.json().catch(() => null);

if (!upstream.ok) {
  return res.status(upstream.status).json({
    error: "PixOne error",
    message: data?.message || data?.error || "Falha ao criar transação",
    details: data
  });
}

// 🔥 NORMALIZAÇÃO: devolve sempre qrcodeText no topo
const tx = data?.data || data;
const pix = tx?.pix || data?.pix;

const qrcodeText =
  pix?.qrcodeText ||
  pix?.qrcode_text ||
  pix?.copyPaste ||
  pix?.copy_paste ||
  tx?.qrcodeText ||
  tx?.qrcode_text ||
  data?.qrcodeText ||
  data?.qrcode_text ||
  "";

const secureUrl =
  tx?.secureUrl ||
  tx?.secure_url ||
  data?.secureUrl ||
  data?.secure_url ||
  "";

return res.status(200).json({
  success: true,
  qrcodeText,
  secureUrl,
  raw: data // mantém o retorno original pra debug
});


/* MOHAMED | FREITASBOOK | NUNCAMEXA 