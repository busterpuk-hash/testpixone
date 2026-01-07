# Checkout Pix (PixOne) — estilo TikTok Shop

## Como rodar (local)
1) Instale o Node.js 18+  
2) No terminal, dentro da pasta do projeto:

```bash
npm install
cp .env.example .env
# edite o .env com suas chaves
npm run dev
```

Abra: http://localhost:3000

## Colocar as chaves
- Recomendado: **servidor** (arquivo `.env`)  
  - `PIXONE_SK=sk_userKey`
  - `PIXONE_PK=pk_userKey`

- Para testes: você pode preencher no próprio checkout (campos Secret/Public).  
  ⚠️ Em produção, **não** faça isso.

## O que já está implementado
- Layout moderno inspirado no TikTok Shop (mobile-first)
- Resumo do pedido, desconto visual, contador, quantidade
- **Orderbump** (Bíblia leão de Judá) acima do método de pagamento
- Integração com PixOne via endpoint do servidor: `POST /create-transaction`
- Modal com QR Code + Copia e Cola

## Webhook (postbackUrl)
O checkout envia `postbackUrl` como:
`/webhook/pixone`

Você pode substituir por sua URL real e tratar o status do pedido no backend.


## PRODUÇÃO (recomendado)
- Coloque suas chaves no servidor via variáveis de ambiente:
  - `PIXONE_SK` (secret)
  - `PIXONE_PK` (public)
- Se você **preferir colocar manualmente** no checkout, deixe o checkbox "Usar chaves do servidor" **desmarcado** e preencha os campos.
  - **Atenção:** isso expõe suas chaves no navegador. Use apenas se você aceitar esse risco.

### Deploy rápido (exemplos)
- Render / Railway / Fly.io / VPS com PM2
- Configure variáveis de ambiente no painel do provedor.


## Deploy na Vercel (rápido)
1) Suba esta pasta para um repositório (GitHub) ou importe direto no Vercel.
2) No painel do Vercel, configure as variáveis de ambiente:
   - `PIXONE_SK` (secret)
   - `PIXONE_PK` (public)
3) Deploy.

### Rotas no Vercel
- Frontend: `/` (serve `public/index.html`)
- Criar Pix: `POST /api/create-transaction`
- Webhook: `POST /api/webhook/pixone`
