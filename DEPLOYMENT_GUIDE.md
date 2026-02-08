# 🚀 Quick Deployment Setup Guide

## Your Question: "Do I have to update .env?"

**YES! You need to update `projects/contracts/.env` with your wallet mnemonic.**

---

## Step-by-Step: Getting Your DEPLOYER_MNEMONIC

### 1️⃣ Create or Access Algorand Wallet

**Option A: Pera Wallet (Mobile)**
- Download from App Store/Play Store
- Create new wallet
- **Save recovery phrase securely!**

**Option B: Defly Wallet (Browser Extension)**
- Install from Chrome Web Store
- Create new wallet
- **Save recovery phrase securely!**

### 2️⃣ Get TestNet ALGO (Free!)

1. Open your wallet and copy your address
   - Pera: Tap your account → Copy address
   - Defly: Click address to copy

2. Visit TestNet Dispenser:
   ```
   https://bank.testnet.algorand.network/
   ```

3. Paste your address and click "Dispense"

4. Wait 10-20 seconds - you'll receive 10 TestNet ALGO

### 3️⃣ Get Your 25-Word Mnemonic

**Pera Wallet:**
```
Settings → Backup Account → Show Recovery Phrase → Copy
```

**Defly Wallet:**
```
Settings → Account → Show Secret Phrase → Copy
```

**You'll get something like:**
```
abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon invest
```

### 4️⃣ Update .env File

```powershell
# Open the file
cd projects/contracts
notepad .env

# Add your mnemonic (keep the quotes!)
DEPLOYER_MNEMONIC="your 25 word mnemonic phrase goes here"

# Save (Ctrl+S) and close
```

**Your .env should look like:**
```env
DEPLOYER_MNEMONIC="word1 word2 word3 word4 word5 ... word25"
ALGOD_SERVER=https://testnet-api.algonode.cloud
ALGOD_PORT=443
INDEXER_SERVER=https://testnet-idx.algonode.cloud
INDEXER_PORT=443
```

### 5️⃣ Deploy!

```powershell
# Now you can deploy
algokit project deploy testnet
```

**Expected Output:**
```
Loading deployment environment variables...
DEPLOYER_MNEMONIC: ✅ Found
Deploying TicketContract...
✅ Deployed with App ID: 123456789
```

**SAVE THE APP ID FOR FRONTEND!**

---

## ⚠️ CRITICAL SECURITY NOTES

### ✅ What IS Safe:
- Sharing your **wallet address** (public)
- Sharing your **App ID** (public on blockchain)
- Committing `.env.example` to GitHub

### ❌ NEVER Share:
- Your **25-word mnemonic phrase**
- Your **private keys**
- Your **actual .env file**

### 🛡️ Security Checklist:
- [ ] `.env` is listed in `.gitignore` ✅ (already done)
- [ ] Never commit `.env` to GitHub
- [ ] Never paste mnemonic in public chat/Discord
- [ ] Keep backup of mnemonic in secure location (password manager)

---

## 🤝 Sharing Project with Team

### What to Share:
1. **GitHub Repository URL**
2. **App ID** (after deployment)
3. **This README.md**

### What Each Team Member Needs:
- Their own wallet with TestNet ALGO
- Their own `.env` file with their own mnemonic
- Copy `.env.example` to `.env` and add their mnemonic

### Workflow:
```powershell
# Team member clones repo
git clone <your-github-url>

# They create their own .env
cd projects/contracts
cp .env.example .env
notepad .env  # Add their own mnemonic

# They can now deploy their own test instance OR
# Use your deployed App ID (you share it with them)
```

---

## 📤 Uploading to GitHub

```powershell
# Initialize git (if not done)
cd TicketChain
git init

# Add files (DO NOT MANUALLY ADD .env!)
git add .

# Commit
git commit -m "TicketChain - Complete implementation with NFT tickets"

# Create GitHub repo (via github.com UI)
# Then connect:
git remote add origin https://github.com/yourusername/TicketChain.git
git branch -M main
git push -u origin main
```

## ✅ Verify .gitignore

Check that `.env` is protected:

```powershell
# Should show .env is ignored
git status

# .env should NOT appear in untracked files
# If it does, check .gitignore has:
# .env
# *.env
```

---

## 🔄 Updating Deployed Contract

If you modify `contract.py`:

```powershell
# 1. Rebuild
cd projects/contracts
poetry shell
algokit project run build

# 2. Redeploy (creates NEW app)
algokit project deploy testnet

# 3. Get new App ID
# 4. Update frontend files with new App ID
# 5. Re-initialize event with create_event()
```

---

## 📋 Next Steps After Deployment

1. ✅ Copy App ID from deployment output
2. ✅ Call `create_event()` to initialize (see README.md)
3. ✅ Update frontend component files with App ID
4. ✅ Generate TypeScript client: `pnpm run generate:client`
5. ✅ Uncomment TODO sections in MintNFT, Bank, Transact
6. ✅ Test on TestNet
7. ✅ Share App ID with team (they use same deployed contract)

---

## 🆘 Common Errors

### "Error: DEPLOYER_MNEMONIC not found"
**Fix:** Ensure `.env` has mnemonic in quotes

### "Error: Insufficient funds"
**Fix:** Get more TestNet ALGO from dispenser

### "Error: Invalid mnemonic"
**Fix:** 
- Must be exactly 25 words
- Separated by spaces
- In quotes
- No extra characters

### "Error: Application already exists"
**Fix:** This is OK - means you're updating existing deployment

---

**Need Help?** Check the main README.md or open a GitHub issue!
