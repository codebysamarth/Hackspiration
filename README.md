# 🎫 TicketChain - Blockchain Event Ticketing Platform

A decentralized event ticketing system built on Algorand blockchain, featuring NFT-based tickets, resale marketplace with price controls, and automated royalty distribution.

![Algorand](https://img.shields.io/badge/Algorand-000000?style=for-the-badge&logo=algorand&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Quick Start](#-quick-start)
- [Detailed Setup](#-detailed-setup)
- [Deployment Guide](#-deployment-guide)
- [Project Structure](#-project-structure)
- [Smart Contract Documentation](#-smart-contract-documentation)
- [Frontend Documentation](#-frontend-documentation)
- [Collaboration Workflow](#-collaboration-workflow)
- [Troubleshooting](#-troubleshooting)

---

## 🌟 Overview

TicketChain revolutionizes event ticketing by leveraging Algorand blockchain technology to create transparent, secure, and fraud-resistant ticket sales. Each ticket is a unique NFT (Algorand Standard Asset) with built-in transfer controls and resale restrictions.

### **Why Blockchain for Ticketing?**

- **Eliminate Fraud**: NFT-based tickets prevent counterfeiting
- **Control Resale**: Enforce maximum resale prices to stop scalping
- **Automated Royalties**: Organizers earn from secondary sales
- **Transparent Ownership**: Verify ticket authenticity on-chain
- **Instant Transfers**: Peer-to-peer ticket transfers without intermediaries

---

## ✨ Features

### **For Event Organizers**
- ✅ Create events with customizable ticket capacity and pricing
- ✅ Set maximum resale price multipliers (e.g., 150% of original price)
- ✅ Earn royalties on all secondary market sales (configurable percentage)
- ✅ Real-time event dashboard (tickets sold, revenue)
- ✅ QR code scanning at entry with ownership verification
- ✅ Track scanned tickets to prevent double-entry

### **For Ticket Buyers**
- ✅ Purchase tickets as NFTs (appear in Algorand wallets)
- ✅ View owned tickets with asset IDs and event details
- ✅ List tickets for resale with price controls
- ✅ Buy from marketplace with automated payment distribution
- ✅ Proof of ownership verified on TestNet Explorer

### **Technical Features**
- ✅ Automatic asset opt-in (users don't manually opt-in to NFTs)
- ✅ Per-user purchase limits (max 5 tickets per account)
- ✅ Box storage for resale listings and scan registry
- ✅ Clawback authority for seamless resale transfers
- ✅ Atomic transactions (payment + NFT transfer)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     TICKETCHAIN SYSTEM                      │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
        ┌───────▼────────┐         ┌───────▼────────┐
        │   FRONTEND     │         │ SMART CONTRACT │
        │  React + TS    │◄────────┤   (PyTeal)     │
        │  TailwindCSS   │         │   Algorand     │
        └───────┬────────┘         └───────┬────────┘
                │                           │
        ┌───────▼────────┐         ┌───────▼────────┐
        │  Wallet Layer  │         │  Blockchain    │
        │  Pera, Defly   │         │  TestNet/      │
        │  Exodus, Lute  │         │  MainNet       │
        └────────────────┘         └────────────────┘
```

### **Data Flow**

1. **Ticket Purchase Flow**
   ```
   User → Connect Wallet → Purchase Ticket → Payment Txn
     → Smart Contract Mints NFT → Auto Opt-In → Transfer NFT to User
     → User's "My Tickets" Updates via Indexer Query
   ```

2. **Resale Flow**
   ```
   User → Select Owned Ticket → Set Price (≤ Max) → List for Resale
     → Box Storage Stores Listing → Buyer Sends Payment
     → Contract Distributes: Seller + Royalty to Organizer
     → Contract Transfers NFT via Clawback → Listing Deleted
   ```

3. **Entry Scan Flow**
   ```
   Organizer → Scan QR/Enter Asset ID → Verify Owner via Indexer
     → Call mark_scanned() → Write to Box Storage
     → Check is_scanned() → Reject if Already Scanned
   ```

---

## 🛠️ Tech Stack

### **Smart Contract (Backend)**
- **Language**: Python 3.12 with AlgoPy (PyTeal framework)
- **Platform**: Algorand Blockchain (AVM - Algorand Virtual Machine)
- **Tools**: 
  - AlgoKit 2.0+ (development framework)
  - Poetry (dependency management)
  - Algorand Indexer (data queries)

### **Frontend (UI)**
- **Framework**: React 18.2.0 + TypeScript 5.6.3
- **Build Tool**: Vite 5.4.20
- **Styling**: TailwindCSS 3.4.17 + DaisyUI 4.12.22
- **Routing**: React Router DOM 7.1.1
- **State Management**: React Hooks (useState, useEffect, useMemo)

### **Blockchain Integration**
- **SDK**: @algorandfoundation/algokit-utils 9.0.0
- **Wallet**: @txnlab/use-wallet-react 4.0.0
- **Networks**: AlgoNode (public API for TestNet/MainNet)

### **Development Tools**
- **Package Manager**: pnpm (frontend), Poetry (contracts)
- **Linting**: ESLint
- **Notifications**: Notistack (toast messages)
- **QR Codes**: qrcode.react 4.2.0 (planned)

---

## 📦 Prerequisites

Before setting up the project, ensure you have:

### **Required Software**
- **Node.js**: v18+ ([Download](https://nodejs.org/))
- **pnpm**: Latest version
  ```powershell
  npm install -g pnpm
  ```
- **Python**: 3.12+ ([Download](https://www.python.org/downloads/))
- **Poetry**: For Python dependency management
  ```powershell
  pip install poetry
  ```
- **AlgoKit**: Algorand development toolkit
  ```powershell
  pipx install algokit
  ```
  
### **Algorand Wallet (for deployment)**
- Pera Wallet ([Download](https://perawallet.app/))
- OR Defly Wallet ([Download](https://defly.app/))

### **TestNet ALGO (free)**
- Get TestNet ALGO from: https://bank.testnet.algorand.network/

### **Code Editor**
- VS Code with extensions:
  - Python
  - ESLint
  - Tailwind CSS IntelliSense

---

## 🚀 Quick Start

### **For Team Members (Clone & Run)**

```powershell
# 1. Clone the repository
git clone <your-repo-url>
cd TicketChain

# 2. Setup Smart Contracts
cd projects/contracts
poetry install                  # Install Python dependencies
poetry shell                    # Activate virtual environment
algokit project run build       # Compile contracts

# 3. Setup Frontend
cd ../frontend
pnpm install                    # Install dependencies
pnpm run dev                    # Start dev server (http://localhost:5174)

# 4. Configure Environment
# Frontend .env is already configured for TestNet ✅
# Contracts .env needs your DEPLOYER_MNEMONIC (see Deployment Guide)
```

---

## 🔧 Detailed Setup

### **Step 1: Smart Contract Setup**

```powershell
# Navigate to contracts directory
cd projects/contracts

# Install dependencies (first time only)
poetry install

# Activate virtual environment
poetry shell

# Build contracts (compile PyTeal → TEAL)
algokit project run build
```

**Expected Output:**
```
Building app at .../ticket_contract/contract.py
Exporting to .../artifacts/ticket_contract
TicketContract.arc56.json
✅ Build successful
```

### **Step 2: Frontend Setup**

```powershell
# Navigate to frontend
cd projects/frontend

# Install dependencies
pnpm install

# Start development server
pnpm run dev
```

**Expected Output:**
```
  VITE v5.4.20  ready in 823 ms

  ➜  Local:   http://localhost:5174/
  ➜  Network: use --host to expose
```

### **Step 3: Verify Setup**

Open http://localhost:5174/ in your browser. You should see:
- ✅ TicketChain landing page
- ✅ Live Event Status dashboard
- ✅ 4 feature cards (Purchase, Marketplace, Organizer, Scan)
- ✅ Connect Wallet button (top right)

---

## 🌐 Deployment Guide

### **Step 1: Setup Deployment Wallet**

#### **1.1 Create/Access Algorand Wallet**
- Install Pera Wallet (mobile) or Defly (browser extension)
- Create new wallet or import existing

#### **1.2 Get TestNet ALGO**
- Visit: https://bank.testnet.algorand.network/
- Enter your wallet address
- Click "Dispense" - Request TestNet ALGO (free)
- Wait for confirmation

#### **1.3 Get Your Mnemonic Phrase**
- **Pera Wallet**: Settings → Backup Account → Show Recovery Phrase
- **Defly Wallet**: Settings → Show Secret Phrase
- **COPY THE 25 WORDS** (e.g., "word1 word2 word3 ... word25")

#### **1.4 Update `.env` File**

```powershell
# Navigate to contracts folder
cd projects/contracts

# Edit .env file (use notepad or VS Code)
notepad .env

# Add your mnemonic (keep the quotes!):
DEPLOYER_MNEMONIC="your 25 word mnemonic phrase goes here"

# Save and close
```

**Example:**
```env
DEPLOYER_MNEMONIC="abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon invest"
ALGOD_SERVER=https://testnet-api.algonode.cloud
ALGOD_PORT=443
INDEXER_SERVER=https://testnet-idx.algonode.cloud
INDEXER_PORT=443
```

⚠️ **SECURITY WARNING**: 
- This `.env` file is in `.gitignore` - it will NOT be uploaded to GitHub
- Never share your mnemonic with anyone!
- Never commit `.env` to version control

---

### **Step 2: Deploy Smart Contract to TestNet**

```powershell
# 1. Ensure you're in contracts directory with venv active
cd projects/contracts
poetry shell

# 2. Verify .env file is configured
# Check if DEPLOYER_MNEMONIC is set (PowerShell)
Get-Content .env | Select-String "DEPLOYER_MNEMONIC"

# 3. Deploy to TestNet
algokit project deploy testnet
```

**Deployment Process:**
1. AlgoKit reads your mnemonic from `.env`
2. Compiles contract to TEAL (if needed)
3. Creates application on TestNet
4. Saves App ID to local state

**Expected Output:**
```
Loading deployment environment variables...
Deploying TicketContract...
✅ TicketContract deployed with:
   App ID: 123456789
   App Address: ABCD1234EFGH5678...
```

**📝 SAVE THE APP ID!** You'll need it for frontend integration.

---

### **Step 3: Initialize Event**

After deployment, call `create_event()` to set up your first event:

```powershell
# Still in contracts directory
algokit goal app call \
  --app-id 123456789 \
  --from <YOUR_WALLET_ADDRESS> \
  --method "create_event(string,uint64,uint64,uint64,uint64)void" \
  --arg '"Algorand Hackathon 2026"' \
  --arg 500 \
  --arg 50000000 \
  --arg 150 \
  --arg 10
```

**Parameters Explained:**
- **Event Name**: "Algorand Hackathon 2026"
- **Capacity**: 500 tickets
- **Price**: 50,000,000 microALGO (50 ALGO)
- **Max Resale Multiplier**: 150 (means 150% = 1.5x original price)
- **Organizer Royalty**: 10 (10% of resale goes to organizer)

---

### **Step 4: Connect Frontend to Deployed Contract**

#### **4.1 Generate TypeScript Client**

```powershell
# Navigate to frontend
cd ../frontend

# Generate TS client from contract ABI
pnpm run generate:client
```

This creates `src/contracts/TicketContract.ts` with type-safe methods.

#### **4.2 Update Component Files**

Edit these 3 files and replace `APP_ID = 0` with your deployed App ID:

**MintNFT.tsx** (Line ~35):
```typescript
const APP_ID = 123456789  // Replace with your App ID
```

**Bank.tsx** (Line ~40):
```typescript
const [appId, setAppId] = useState<number>(123456789)  // Replace
```

**Transact.tsx** (Line ~30):
```typescript
const [appId] = useState<number>(123456789)  // Replace
```

#### **4.3 Uncomment Real Contract Calls**

In each file, find sections marked `// TODO: Call TicketContract...` and:
1. **Uncomment** the contract integration code
2. **Comment out** or remove placeholder simulation code
3. Update method calls to match generated client

**Example in MintNFT.tsx:**
```typescript
// BEFORE (placeholder)
// const simulatedTicketId = Math.floor(Math.random() * 1000000)
// setPurchasedTicketId(simulatedTicketId)

// AFTER (real contract)
const result = await ticketClient.send.purchaseTicket({
  args: { payment: paymentTxn },
  sender: activeAddress
})
setPurchasedTicketId(Number(result.return))
```

#### **4.4 Restart Development Server**

```powershell
# Stop current server (Ctrl+C)
# Restart
pnpm run dev
```

---

### **Step 5: Test on TestNet**

1. **Open App**: http://localhost:5174/
2. **Connect Wallet**: Click "Connect Wallet" → Select Pera/Defly
3. **Purchase Ticket**:
   - Navigate to "Purchase Tickets"
   - Click "Purchase Ticket"
   - Confirm transaction in wallet
   - Wait for confirmation
   - Ticket appears in "My Tickets"
4. **Verify on Explorer**:
   - Click "View on AlgoExplorer" link
   - See your ticket NFT on TestNet

---

## 📁 Project Structure

```
TicketChain/
├── projects/
│   ├── contracts/                      # Smart Contract (Backend)
│   │   ├── smart_contracts/
│   │   │   ├── ticket_contract/
│   │   │   │   ├── contract.py         # ✨ Main contract logic
│   │   │   │   └── deploy_config.py    # Deployment configuration
│   │   │   └── artifacts/
│   │   │       └── ticket_contract/
│   │   │           ├── TicketContract.approval.teal    # Compiled TEAL
│   │   │           ├── TicketContract.clear.teal
│   │   │           ├── TicketContract.arc56.json       # ABI spec
│   │   │           └── ticket_contract_client.py       # Python client
│   │   ├── tests/                      # Contract tests
│   │   ├── pyproject.toml              # Poetry config
│   │   ├── .env                        # ⚠️ Secret keys (gitignored)
│   │   └── .env.example                # Template for team
│   │
│   └── frontend/                       # React UI (Frontend)
│       ├── src/
│       │   ├── components/
│       │   │   ├── Home.tsx            # Landing page
│       │   │   ├── MintNFT.tsx         # 🎫 Purchase Ticket interface
│       │   │   ├── Bank.tsx            # 👨‍💼 Event Organizer Panel
│       │   │   ├── Transact.tsx        # 🔄 Resale Marketplace
│       │   │   └── ConnectWallet.tsx   # Wallet connection
│       │   ├── contracts/              # Generated TS clients
│       │   ├── utils/
│       │   │   ├── ticketAssets.ts     # ✨ NFT ownership utilities
│       │   │   └── network/
│       │   │       └── getAlgoClientConfigs.ts
│       │   ├── App.tsx                 # React Router setup
│       │   └── main.tsx                # Entry point
│       ├── public/
│       ├── package.json                # Dependencies
│       ├── vite.config.ts              # Vite configuration
│       ├── tailwind.config.cjs         # Tailwind CSS
│       └── .env                        # Environment config
│
├── README.md                           # 📖 This file
├── TICKETING_IMPLEMENTATION_GUIDE.md   # Original implementation notes
└── .gitignore                          # Git ignore rules
```

---

## 📜 Smart Contract Documentation

### **TicketContract.py**

**Location:** `projects/contracts/smart_contracts/ticket_contract/contract.py`

#### **Global State**

| Variable | Type | Description |
|----------|------|-------------|
| `event_name` | String | Name of the event |
| `total_tickets` | UInt64 | Total ticket capacity |
| `tickets_sold` | UInt64 | Number of tickets sold |
| `ticket_price` | UInt64 | Price per ticket (microALGO) |
| `max_resale_price` | UInt64 | Maximum allowed resale price |
| `organizer_royalty` | UInt64 | Royalty percentage (0-50) |
| `organizer_address` | Account | Event organizer's wallet |

#### **Methods**

##### **create_event()**
- **Purpose**: Initialize event details
- **Access**: Creator only
- **Parameters**: name, capacity, price, max_resale_multiplier, royalty

##### **purchase_ticket()**
- **Purpose**: Mint NFT ticket and transfer to buyer
- **Process**: Validate payment → Mint NFT → **Auto opt-in** → Transfer
- **Returns**: Asset ID of minted ticket

##### **list_for_resale()**
- **Purpose**: List ticket on secondary market
- **Validation**: Price ≤ max_resale_price

##### **buy_resale_ticket()**
- **Purpose**: Purchase from resale marketplace
- **Process**: Pay seller → Pay royalty → **Auto opt-in** → Transfer NFT via clawback

##### **mark_scanned()**
- **Purpose**: Mark ticket as used at entry
- **Access**: Organizer only

##### **is_scanned()** (readonly)
- **Returns**: True if ticket already scanned

##### **get_event_info()** (readonly)
- **Returns**: Event details (name, tickets, prices)

---

## 💻 Frontend Documentation

### **Key Components**

#### **Home.tsx**
- Landing page with hero section
- Live event status dashboard
- Navigation to 4 main features

#### **MintNFT.tsx** - Purchase Interface
- Display event details
- "My Tickets" section (shows owned NFTs)
- Purchase button with wallet integration
- Success view with AlgoExplorer link

#### **Transact.tsx** - Resale Marketplace
- **List Mode**: Show owned tickets, verify ownership, list for resale
- **Buy Mode**: Browse marketplace, purchase with atomic transfer

#### **Bank.tsx** - Organizer Panel
- **Create Event**: Initialize contract
- **Dashboard**: View sales stats
- **Scan Tickets**: Verify ownership, mark as scanned

### **Utility Functions**

#### **ticketAssets.ts**

```typescript
// Fetch all ticket NFTs owned by user
getUserTickets(userAddress, algorand): Promise<TicketAsset[]>

// Verify user owns specific ticket NFT
verifyTicketOwnership(userAddress, assetId, algorand): Promise<boolean>
```

---

## 👥 Collaboration Workflow

### **Setting Up GitHub Repository**

```powershell
# 1. Initialize git (if not already)
git init

# 2. Add all files
git add .

# 3. First commit
git commit -m "Initial TicketChain implementation"

# 4. Create GitHub repo and add remote
git remote add origin https://github.com/yourusername/TicketChain.git

# 5. Push to GitHub
git branch -M main
git push -u origin main
```

### **Team Member Onboarding**

```powershell
# Clone repository
git clone <your-github-url>
cd TicketChain

# Follow Quick Start section
# Each member creates their own .env files (DO NOT commit!)
```

### **Git Workflow**

```powershell
# Before starting work
git pull origin main

# Create feature branch
git checkout -b feature/your-feature

# Make changes, commit
git add .
git commit -m "Description"

# Push and create PR
git push origin feature/your-feature
```

---

## 🐛 Troubleshooting

### **"DEPLOYER_MNEMONIC not set"**
**Solution:** Ensure `projects/contracts/.env` has your 25-word mnemonic in quotes

### **"Insufficient TestNet ALGO"**
**Solution:** Visit https://bank.testnet.algorand.network/ and dispense more

### **"Cannot destructure property 'token'"**
**Solution:**
```powershell
cd projects/frontend
rm -rf node_modules/.vite
pnpm run dev
```

### **Connect Wallet button not working**
**Solution:** Hard refresh browser (Ctrl+Shift+R)

---

## 🚀 Future Enhancements

- [ ] QR code generation and scanning
- [ ] Multi-event support
- [ ] Ticket transfer/gifting
- [ ] Refund mechanism
- [ ] Mobile app (React Native)
- [ ] Analytics dashboard

---

## 📝 License

MIT License - Free to use for hackathons, learning, or commercial projects.

---

## 🙏 Acknowledgments

- **Algorand Foundation** - Blockchain platform
- **AlgoKit Team** - Development tools
- **Original Template** - [Hackseries-2-QuickStart-template](https://github.com/marotipatre/Hackseries-2-QuickStart-template)

---

**Built with ❤️ on Algorand blockchain**

📧 For questions: Open an issue on GitHub!


