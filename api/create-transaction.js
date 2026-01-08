export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { payload, auth } = req.body || {};
    if (!payload) return res.status(400).json({ error: "payload é obrigatório" });

    const envSK = process.env.PIXONE_SK || "";
    const envPK = process.env.PIXONE_PK || "";
    const sk = auth?.sk || envSK;
    const pk = auth?.pk || envPK;

    if (!sk || !pk) {
      return res.status(400).json({
        error: "Chaves ausentes: configure PIXONE_SK/PIXONE_PK na Vercel (Environment Variables).",
      });
    }

    // IP best-effort (Vercel)
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

    // Timeout controlado (evita 504 da Vercel em upstream lento)
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);

    const upstream = await fetch(PIXONE_TX_URL, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).finally(() => clearTimeout(t));

    const data = await upstream.json().catch(() => null);

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: "PixOne error",
        message: data?.message || data?.error || "Falha ao criar transação",
      });
    }

    // Normalização: garantir que o frontend receba SEMPRE qrcodeText (Pix copia/cola)
    const tx = data?.data || data;
    const pix = tx?.pix || data?.pix;

    const pick = (v) => (typeof v === "string" ? v.trim() : "");
    const qrcodeText =
      pick(pix?.qrcodeText) ||
      pick(pix?.qrcode_text) ||
      // ⚠️ Em alguns retornos/webhook, o "copia e cola" vem em pix.qrcode (não é imagem)
      (() => {
        const q = pick(pix?.qrcode);
        return q && q.startsWith("000201") ? q : "";
      })() ||
      pick(tx?.qrcodeText) ||
      pick(tx?.qrcode_text) ||
      (() => {
        const q = pick(tx?.qrcode);
        return q && q.startsWith("000201") ? q : "";
      })();

    if (!qrcodeText) {
      return res.status(502).json({
        error: "missing_qrcodeText",
        message: "Transação criada, mas o Pix COPIA/COLA não veio no retorno da PixOne.",
        // Dica de debug (não inclui base64 pesado)
        hint: "Verifique se o retorno possui pix.qrcodeText ou se o copia/cola vem em pix.qrcode.",
      });
    }

    return res.status(200).json({
      success: true,
      qrcodeText,
      // opcional: id para logs
      transactionId: tx?.id ?? null,
      status: tx?.status ?? null,
    });
  } catch (e) {
    if (String(e?.name) === "AbortError") {
      return res.status(504).json({
        error: "timeout",
        message: "A PixOne demorou para responder. Tente novamente.",
      });
    }
    return res.status(500).json({
      error: "server_error",
      message: String(e?.message || e),
    });
  }
}

/* MOHAMED | FREITASBOOK | NUNCAMEXA */
