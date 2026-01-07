import 'dotenv/config';
/**
* Servidor de finalização de compra PixOne (Velfy)
* - Serve o frontend estático
* - Cria transações Pix com segurança usando autenticação básica
 */
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json({ limit: "2mb" }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Static
app.use(express.static(__dirname));

// Saúde/status (chama o endpoint de status do PixOne se você quiser monitorar)
// OBSERVAÇÃO: a documentação menciona um endpoint de status, mas não incluiu o caminho exato no trecho de código fornecido.
// Vamos expor um endpoint de status local; você pode alterar PIXONE_STATUS_URL abaixo, se necessário.
const PIXONE_BASE = "https://api.pixone.com.br";
const PIXONE_TX_URL = PIXONE_BASE + "/api/v1/transactions";
const PIXONE_STATUS_URL = PIXONE_BASE + "/api/v1/status"; // adjust if your doc differs

const envSK = process.env.PIXONE_SK || "";
const envPK = process.env.PIXONE_PK || "";

function b64(str){
  return Buffer.from(str, "utf8").toString("base64");
}

function buildAuthHeader(sk, pk){
  return "Basic " + b64(`${sk}:${pk}`);
}

app.get("/api/status", async (req, res) => {
  try{
    const r = await fetch(PIXONE_STATUS_URL, { method: "GET" });
    const data = await r.json().catch(()=>({ ok: r.ok }));
    res.status(r.status).json({ upstream: data, ok: r.ok });
  }catch(e){
    res.status(503).json({ ok:false, error: String(e?.message || e) });
  }
});

app.post("/create-transaction", async (req, res) => {
  try{
    const { payload, auth } = req.body || {};
    if(!payload) return res.status(400).json({ error: "payload é obrigatório" });

    const sk = auth?.sk || envSK;
    const pk = auth?.pk || envPK;
    if(!sk || !pk) return res.status(400).json({ error: "Chaves ausentes: configure PIXONE_SK/PIXONE_PK no .env ou envie em auth." });

  // Anexar IP da solicitação
    const ip = (req.headers["x-forwarded-for"]?.toString().split(",")[0] || req.socket.remoteAddress || "").trim();
    payload.ip = payload.ip || ip || "0.0.0.0";

    // Verifique se os campos são obrigatórios.
    payload.paymentMethod = "pix";
    payload.traceable = payload.traceable ?? false;
    payload.pix = payload.pix || { expiresInDays: 1 };

    const upstream = await fetch(PIXONE_TX_URL, {
      method: "POST",
      headers: {
        "Authorization": buildAuthHeader(sk, pk),
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await upstream.json().catch(()=>null);

    if(!upstream.ok){
      return res.status(upstream.status).json({
        error: "PixOne error",
        message: data?.message || data?.error || "Falha ao criar transação",
        details: data
      });
    }

    res.status(200).json(data);
  }catch(e){
    res.status(500).json({ error: "server_error", message: String(e?.message || e) });
  }
});

// Exemplo de receptor de webhook (configure seu URL em PixOne request postbackUrl)
app.post("/webhook/pixone", (req, res) => {
  // Aqui você deve validar a origem/assinatura, caso a PixOne a forneça, e então atualizar o status do seu pedido no banco de dados.
  console.log("PIXONE WEBHOOK:", JSON.stringify(req.body));
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Checkout rodando: http://localhost:${PORT}`);
});



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
