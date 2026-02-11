# 🚀 Frontend Deployment Guide

Deploy your TicketChain frontend so anyone can access it — no local setup required!

---

## Option 1: Vercel (Recommended — Easiest)

### Step 1: Push to GitHub
```bash
# From project root
git init
git add .
git commit -m "TicketChain MVP"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ticketchain.git
git push -u origin main
```

### Step 2: Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) → Sign up with GitHub
2. Click **"Add New Project"**
3. Import your `ticketchain` repository
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `projects/frontend`
   - **Build Command**: `pnpm build` (or `npm run build`)
   - **Output Directory**: `dist`
5. Add Environment Variables (click "Environment Variables"):
   ```
   VITE_ALGOD_SERVER=https://testnet-api.algonode.cloud
   VITE_ALGOD_PORT=443
   VITE_ALGOD_TOKEN=
   VITE_ALGOD_NETWORK=testnet
   VITE_INDEXER_SERVER=https://testnet-idx.algonode.cloud
   VITE_INDEXER_PORT=443
   VITE_INDEXER_TOKEN=
   ```
6. Click **"Deploy"**

Your app will be live at: `https://ticketchain-your-username.vercel.app`

---

## Option 2: Netlify

### Step 1: Build locally
```bash
cd projects/frontend
pnpm install
pnpm build
```

### Step 2: Deploy
1. Go to [netlify.com](https://netlify.com) → Sign up
2. Drag & drop the `dist` folder to deploy
3. Or connect GitHub repo for auto-deploys

### Netlify Configuration
Create `projects/frontend/netlify.toml`:
```toml
[build]
  command = "pnpm build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

## Option 3: GitHub Pages (Free)

### Step 1: Install gh-pages
```bash
cd projects/frontend
pnpm add -D gh-pages
```

### Step 2: Update package.json
Add to `scripts`:
```json
{
  "scripts": {
    "predeploy": "pnpm build",
    "deploy": "gh-pages -d dist"
  }
}
```

### Step 3: Update vite.config.ts
```typescript
export default defineConfig({
  base: '/ticketchain/', // Your repo name
  // ... rest of config
})
```

### Step 4: Deploy
```bash
pnpm deploy
```

Your app will be live at: `https://YOUR_USERNAME.github.io/ticketchain/`

---

## ⚙️ Environment Variables

Create `.env.production` in `projects/frontend/`:

```env
# Algorand TestNet (AlgoNode - no API key needed)
VITE_ALGOD_SERVER=https://testnet-api.algonode.cloud
VITE_ALGOD_PORT=443
VITE_ALGOD_TOKEN=
VITE_ALGOD_NETWORK=testnet

VITE_INDEXER_SERVER=https://testnet-idx.algonode.cloud
VITE_INDEXER_PORT=443
VITE_INDEXER_TOKEN=
```

---

## 🔒 Important: Update Config Before Deploying

Make sure `src/config/organizerConfig.ts` has your actual values:

```typescript
// Your Pera wallet address
export const ORGANIZER_ADDRESS = 'YOUR_ACTUAL_WALLET_ADDRESS'

// Your deployed contract App ID
export const HARDCODED_APP_ID = BigInt(755374233) // Your actual ID

// Keep this true for production
export const SINGLE_ORGANIZER_MODE = true
```

---

## 🌐 Share With Friends

After deploying, share the URL:
- **Vercel**: `https://ticketchain.vercel.app`
- **Netlify**: `https://ticketchain.netlify.app`
- **GitHub Pages**: `https://username.github.io/ticketchain`

Your friends can:
1. Open the URL
2. Connect their Pera wallet
3. Buy tickets directly!

---

## 📱 Testing on Mobile

The deployed app works on mobile browsers:
1. Share the URL via WhatsApp/SMS
2. Open in mobile browser
3. Connect Pera Wallet (it will open the Pera app)
4. Approve transactions from the app

---

## 🔄 Continuous Deployment

With Vercel/Netlify connected to GitHub:
- Every `git push` to `main` triggers auto-deploy
- Preview deployments for pull requests
- Rollback to previous versions easily
