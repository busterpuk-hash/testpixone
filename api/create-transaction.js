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
        error: "Chaves ausentes: configure PIXONE_SK/PIXONE_PK na Vercel.",
      });
    }

    // IP best-effort
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
    const authHeader =
      "Basic " + Buffer.from(`${sk}:${pk}`, "utf8").toString("base64");

    // ✅ Timeout controlado (evita 504 da Vercel)
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000); // 8s

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

    // ✅ Pega SÓ o copia e cola, ignora a imagem base64 do QR
    const tx = data?.data || data;
    const pix = tx?.pix || data?.pix;

    const qrcodeText =
      pix?.qrcodeText ||
      pix?.qrcode_text ||
      tx?.qrcodeText ||
      tx?.qrcode_text ||
      data?.qrcodeText ||
      data?.qrcode_text ||
      "";

    // Se o gateway não mandar o copia/cola, retorna erro claro
    if (!qrcodeText) {
      return res.status(502).json({
        error: "missing_qrcodeText",
        message:
          "Transação criada, mas o Pix COPIA/COLA não veio no retorno da PixOne.",
      });
    }

    // ✅ Resposta mínima e rápida (produção)
    return res.status(200).json({
      success: true,
      qrcodeText: String(qrcodeText).trim(),
    });
  } catch (e) {
    // AbortController timeout cai aqui
    if (String(e?.name) === "AbortError") {
      return res.status(504).json({
        error: "timeout",
        message:
          "A PixOne demorou para responder. Tente novamente (a transação pode ter sido criada).",
      });
    }

    return res.status(500).json({
      error: "server_error",
      message: String(e?.message || e),
    });
  }
}
