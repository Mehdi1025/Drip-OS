# Drip OS

Application interne de gestion de production e-commerce (Next.js 14, Supabase, Shopify).

## Modules

- **Imposition** — file d'attente skins, génération de lots A4
- **Atelier** — contrôle découpe par lot
- **Scanner** — expédition par track code
- **Inventaire** — Smart Restock

## Développement local

```bash
npm install
cp .env.example .env.local
# Renseigner Supabase + SHOPIFY_WEBHOOK_SECRET
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

## Supabase

Exécuter les migrations dans `supabase/migrations/` (ordre 001 → 004).

## Webhook Shopify

`POST /api/webhooks/shopify` — événement `orders/create`.

Exemple production : `https://drip-os.vercel.app/api/webhooks/shopify`

Configurer dans **Shopify Admin → Notifications → Webhooks** (JSON, création de commande).

## Déploiement Vercel

Production : [drip-os.vercel.app](https://drip-os.vercel.app)

Variables d'environnement (Production) : voir `.env.example`.  
Chaque `git push` sur `main` redéploie automatiquement si le repo GitHub est connecté.
