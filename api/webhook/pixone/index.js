export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    console.log("PIXONE WEBHOOK:", JSON.stringify(req.body));
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(200).json({ ok: true });
  }
}

/* MOHAMED | FREITASBOOK | NUNCAMEXA */