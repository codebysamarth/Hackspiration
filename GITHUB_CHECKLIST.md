# ✅ Pre-Push Checklist for GitHub

Before pushing your TicketChain project to GitHub, verify:

## 🔒 Security Checks

- [ ] **.env files NOT committed**
  ```powershell
  # Verify .env is not tracked
  git status | findstr "\.env"
  # Should return nothing or show .env.example only
  ```

- [ ] **.gitignore includes .env**
  ```powershell
  # Check all .gitignore files
  findstr /s "\.env" .gitignore *\.gitignore
  # Should show .env is ignored in all folders
  ```

- [ ] **No mnemonic in code**
  ```powershell
  # Search for potential mnemonics (should find none)
  findstr /s "abandon" *.ts *.tsx *.py
  ```

## 📝 Documentation Checks

- [ ] **README.md updated** with TicketChain details ✅
- [ ] **DEPLOYMENT_GUIDE.md created** ✅
- [ ] **.env.example exists** for team reference ✅

## 🧹 Clean Build Artifacts

- [ ] **Remove personal data**
  ```powershell
  # Frontend cache
  rm -rf projects/frontend/node_modules/.vite
  rm -rf projects/frontend/dist
  
  # Python cache
  rm -rf projects/contracts/**/__pycache__
  ```

- [ ] **Keep essential files**
  - ✅ Smart contract source (.py files)
  - ✅ Frontend source (.tsx files)
  - ✅ Compiled artifacts (.teal, .json)
  - ✅ Package configs (package.json, pyproject.toml)

## 📦 Files to Commit

### ✅ Include:
- `README.md`
- `DEPLOYMENT_GUIDE.md`
- `.env.example` (contracts)
- `.env.template` (frontend)
- `.gitignore` (all)
- All source code (.py, .tsx, .ts)
- Config files (package.json, tsconfig.json, etc.)
- Compiled smart contracts (artifacts/)

### ❌ Exclude (already in .gitignore):
- `.env` (contains your mnemonic!)
- `node_modules/`
- `dist/` and `build/`
- `__pycache__/`
- `.venv/` and `venv/`
- `.vscode/` and `.idea/`

## 🚀 Push Commands

```powershell
# 1. Initialize repo (if not done)
git init

# 2. Add remote (create repo on GitHub first)
git remote add origin https://github.com/YOUR_USERNAME/TicketChain.git

# 3. Add all files (respects .gitignore)
git add .

# 4. Commit
git commit -m "Initial commit: TicketChain - Blockchain event ticketing dApp

Features:
- NFT-based tickets with automatic opt-in
- Resale marketplace with price controls
- Organizer royalty system
- Entry scanning with ownership verification
- Complete React frontend with TailwindCSS
- Algorand smart contract (PyTeal)

Tech: Algorand, React, TypeScript, Python, AlgoKit"

# 5. Push to GitHub
git branch -M main
git push -u origin main
```

## 🤝 Team Collaboration Setup

After pushing, send teammates:

1. **Repository URL**
   ```
   https://github.com/YOUR_USERNAME/TicketChain
   ```

2. **Onboarding Instructions**
   ```
   Hey! Clone the TicketChain repo:
   
   git clone https://github.com/YOUR_USERNAME/TicketChain
   cd TicketChain
   
   Then follow the "Quick Start" section in README.md
   
   IMPORTANT: 
   - Create your own .env files (DON'T commit them!)
   - Get TestNet ALGO: https://bank.testnet.algorand.network/
   - Use our deployed App ID: <YOUR_APP_ID_HERE>
   ```

3. **Deployed App ID** (if already deployed)
   ```
   Our TestNet App ID: 123456789
   Update these files with this ID:
   - src/components/MintNFT.tsx
   - src/components/Bank.tsx
   - src/components/Transact.tsx
   ```

## ✅ Final Verification

```powershell
# After pushing, clone to fresh directory and test
cd ..
git clone https://github.com/YOUR_USERNAME/TicketChain test-clone
cd test-clone

# Verify no .env exists
ls projects/contracts/.env
# Should error: "cannot find"

# Verify .env.example exists
ls projects/contracts/.env.example
# Should succeed

# Try setup
cd projects/frontend
pnpm install
pnpm run dev
# Should work without errors
```

## 🎯 What Teammates Will Do

1. Clone your repo
2. Create their own `.env` files from examples
3. Add their own wallet mnemonics
4. Either:
   - Use your deployed App ID (shared development)
   - OR deploy their own instance (isolated testing)

---

**Ready to push!** Run the commands above and share the repo with your team! 🚀
