export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Log do webhook (ver em Vercel -> Functions Logs)
  try {
    const body = req.body || {};
    console.log("PIXONE WEBHOOK:", JSON.stringify(body));
  } catch {}

  return res.status(200).json({ ok: true });
}
