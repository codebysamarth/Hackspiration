# 🎫 TicketChain - Decentralized Event Ticketing Platform

> **Blockchain-powered ticketing system eliminating fraud, scalping, and unfair pricing through Algorand smart contracts**

A complete end-to-end decentralized event ticketing solution built on Algorand blockchain, featuring NFT-based tickets, automated resale marketplace with anti-scalping controls, intelligent refund policies, and real-time ticket verification.

![Algorand](https://img.shields.io/badge/Algorand-000000?style=for-the-badge&logo=algorand&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![AlgoPy](https://img.shields.io/badge/AlgoPy-PyTeal-blue?style=for-the-badge)

---

## 📋 Table of Contents

- [Problem Statement](#-problem-statement)
- [Our Solution](#-our-solution)
- [What We've Built](#-what-weve-built)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Smart Contract Implementation](#-smart-contract-implementation)
- [Frontend Implementation](#-frontend-implementation)
- [Setup & Deployment](#-setup--deployment)
- [Future Scope](#-future-scope)
- [Project Structure](#-project-structure)
- [Team Workflow](#-team-workflow)

---

## 🎯 Problem Statement

The global ticketing industry ($78B+) suffers from critical issues:

### **Current Problems:**
1. **🎭 Ticket Fraud**: Counterfeit tickets cost fans $1B+ annually
2. **💸 Scalping**: Automated bots buy tickets, resell at 10-50x markup
3. **🔒 No Transparency**: Buyers can't verify ticket authenticity
4. **📉 Lost Revenue**: Organizers get $0 from secondary market sales
5. **❌ Double Entry**: Same ticket can be reused (no scan verification)
6. **⏰ Rigid Policies**: No flexible, automated refund systems

---

## 💡 Our Solution

**TicketChain** leverages Algorand blockchain to solve these problems through:

- ✅ **NFT-Based Tickets**: Each ticket is a unique, unforgeable Algorand Standard Asset (ASA)
- ✅ **Smart Contract Controls**: Automated price caps, purchase limits, and resale distribution
- ✅ **On-Chain Verification**: Real-time ownership validation via Algorand Indexer
- ✅ **Automated Royalties**: Organizers earn 5-50% on every secondary sale (configurable)
- ✅ **Dynamic Refund Policy**: Time-based refunds (90% early, 50% late, 0% post-event)
- ✅ **Scan Registry**: Blockchain-based ticket scanning with double-entry prevention

### **Why Algorand?**
- ⚡ **Fast**: 3.9s finality (instant confirmation)
- 💰 **Cheap**: $0.001 per transaction
- 🌱 **Carbon Negative**: Most sustainable blockchain
- 🔐 **Secure**: Pure Proof-of-Stake consensus

---

## 🏗️ What We've Built

### **1. Complete Smart Contract System** (`TicketContract`)

A production-ready Algorand smart contract (464 lines of PyTeal) with:

#### **Core Functionality:**
- ✅ **Event Creation**: Initialize events with name, capacity, pricing, resale rules
- ✅ **Ticket Purchase**: Mint NFTs with automatic opt-in, per-wallet limits (max 5)
- ✅ **Resale Marketplace**: List/buy with price validation, automated royalty distribution
- ✅ **Refund System**: Tiered refunds based on timing (NEW!)
- ✅ **Ticket Scanning**: Mark tickets as scanned, prevent double-entry
- ✅ **Revenue Analytics**: Track primary sales, resale royalties, total refunds

#### **Advanced Features:**
- 📦 **Box Storage**: Store resale listings and scan registry on-chain
- 🔄 **Clawback Authority**: Seamless NFT transfers without user opt-in friction
- 💰 **Atomic Transactions**: Payment + NFT transfer in single transaction
- 🛡️ **Access Control**: Organizer-only methods for creation, scanning, withdrawals

### **2. Full-Stack Frontend Application**

React + TypeScript web app (5000+ lines) with:

#### **User Interfaces:**
- 🎫 **Ticket Purchase Portal**: Browse events, buy tickets, view owned NFTs
- 🔄 **Resale Marketplace**: List tickets for resale, browse secondary market
- 💰 **Refund Interface**: Request refunds with real-time eligibility calculation
- 👨‍💼 **Organizer Dashboard**: Create events, scan tickets, view analytics
- 🔐 **Wallet Integration**: Support for Pera, Defly, Exodus, Lute wallets

#### **Technical Highlights:**
- ✅ **Type-Safe Contracts**: Auto-generated TypeScript clients from ABI
- ✅ **Real-Time Data**: Live event status via Algorand Indexer queries
- ✅ **NFT Ownership Verification**: Validate ticket ownership before resale
- ✅ **QR Code Generation**: Generate QR codes for ticket scanning
- ✅ **Responsive Design**: TailwindCSS + DaisyUI components

---

## ✨ Key Features

### **🎫 For Event Attendees**
| Feature | Description | Implementation Status |
|---------|-------------|----------------------|
| **Purchase Tickets** | Buy tickets as NFTs with automatic wallet opt-in | ✅ **Implemented** |
| **View Owned Tickets** | See all purchased tickets with event details, QR codes | ✅ **Implemented** |
| **Request Refunds** | Time-based automatic refunds (90%/50%/0% tiers) | ✅ **Implemented** *(NEW)* |
| **Resell Tickets** | List on marketplace with automatic price validation | ✅ **Implemented** |
| **Buy from Marketplace** | Purchase resale tickets with automated distribution | ✅ **Implemented** |
| **Verify Ownership** | Real-time blockchain verification via Algorand Indexer | ✅ **Implemented** |
| **Purchase Limit** | Max 5 tickets per wallet (anti-bot protection) | ✅ **Implemented** |

### **👨‍💼 For Event Organizers**
| Feature | Description | Implementation Status |
|---------|-------------|----------------------|
| **Create Events** | Initialize events with capacity, pricing, resale rules, date, location | ✅ **Implemented** |
| **Dashboard Analytics** | View tickets sold, revenue (primary + resale + refunds) | ✅ **Implemented** |
| **Scan Tickets** | Verify ownership and mark tickets as scanned (QR/Asset ID) | ✅ **Implemented** |
| **Prevent Double-Entry** | Blockchain-based scan registry | ✅ **Implemented** |
| **Earn Royalties** | Automatic 5-50% commission on all resales | ✅ **Implemented** |
| **Withdraw Revenue** | Post-event revenue withdrawal (secured) | ✅ **Implemented** |
| **Set Resale Caps** | Enforce max resale price (e.g., 150% of original) | ✅ **Implemented** |

### **🔐 Technical Features**
| Feature | Description | Benefit |
|---------|-------------|---------|
| **Automatic Opt-In** | Contract handles ASA opt-in | Users don't need blockchain knowledge |
| **Clawback Control** | Organizer retains clawback on tickets | Seamless resale transfers |
| **Box Storage** | On-chain listing + scan data | No off-chain dependencies |
| **Atomic Transactions** | Payment + NFT transfer in 1 txn | No partial failures |
| **Time-Based Logic** | Event date + refund deadline tracking | Automated policy enforcement |
| **Revenue Tracking** | Separate counters for primary/resale/refunds | Complete financial transparency |
| **ABI Compatibility** | ARC-56 standard contract | Type-safe client generation |

---

## 🏗️ Architecture

### **System Overview**

```
┌────────────────────────────────────────────────────────────────┐
│                    TICKETCHAIN ECOSYSTEM                       │
└────────────────────────────────────────────────────────────────┘
                                │
              ┌─────────────────┴──────────────────┐
              │                                    │
    ┌─────────▼──────────┐              ┌────────▼─────────┐
    │   FRONTEND LAYER   │              │  BLOCKCHAIN LAYER │
    │  React + TypeScript│◄─────────────┤  Algorand TestNet │
    │   TailwindCSS      │   AlgoKit    │   Smart Contract  │
    └─────────┬──────────┘   SDK/ABI    └────────┬──────────┘
              │                                    │
    ┌─────────▼──────────┐              ┌────────▼──────────┐
    │  WALLET PROVIDERS  │              │   DATA STORAGE    │
    │  Pera, Defly       │              │  Global State     │
    │  Exodus, Lute      │              │  Local State      │
    └────────────────────┘              │  Box Storage      │
                                        └───────────────────┘
```

### **Complete Data Flow**

#### **1. Ticket Purchase Flow**
```
┌──────────┐  1. Connect    ┌──────────────┐  2. Browse     ┌─────────────┐
│   User   │───────────────>│   Frontend   │───────────────>│   Indexer   │
│  (Buyer) │<───────────────│  (React App) │<───────────────│  (Get State)│
└──────────┘  5. NFT +      └──────┬───────┘  3. Event Info └─────────────┘
              Receipt                │
                                     │ 4. purchase_ticket()
                                     │    + Payment Txn
                              ┌──────▼──────────────────────────────┐
                              │    Smart Contract (Algorand)        │
                              │  ────────────────────────────────   │
                              │  a. Validate payment amount         │
                              │  b. Check per-wallet limit (<5)     │
                              │  c. Mint NFT with metadata          │
                              │  d. Auto opt-in buyer to asset      │
                              │  e. Transfer NFT to buyer           │
                              │  f. Update tickets_sold counter     │
                              │  g. Add to primary revenue          │
                              └─────────────────────────────────────┘
```

#### **2. Resale Marketplace Flow**
```
┌──────────┐  List Ticket   ┌──────────────┐  list_for_resale()  ┌────────────┐
│  Seller  │───────────────>│   Frontend   │────────────────────>│  Contract  │
└──────────┘                └──────────────┘                     │ ────────── │
                                                                 │ • Validate │
┌──────────┐  Buy Listed    ┌──────────────┐  buy_resale()      │   price    │
│   Buyer  │───────────────>│   Frontend   │────────────────────>│ • Store in │
└──────────┘  + Payment     └──────────────┘  + Payment         │   Box      │
      │                                                          └─────┬──────┘
      │                                                                │
      │  NFT Transfer                                                  │
      └────────────────────────────────────────────────────────────────┘
       Atomic: Pay Seller + Pay Royalty + Clawback NFT to Buyer
```

#### **3. Refund Request Flow** *(NEW Implementation)*
```
┌──────────┐  Request       ┌──────────────┐  request_refund()   ┌────────────┐
│   User   │───────────────>│   Frontend   │────────────────────>│  Contract  │
│  (Owner) │                └──────────────┘                     │ ────────── │
└────┬─────┘                                                     │ • Check    │
     │                                                           │   timing   │
     │       90% Refund      ┌──────────────────────┐           │ • Calc amt │
     │<──────────────────────│  Before refund_      │           │ • Clawback │
     │                       │  deadline (24h+)     │           │   NFT      │
     │       50% Refund      │                      │           │ • Send     │
     │<──────────────────────│  After deadline,     │           │   ALGO     │
     │                       │  before event        │           │ • Update   │
     │       0% - Blocked    │                      │           │   refunded │
     │  X────────────────────│  After event_date    │           └────────────┘
                             └──────────────────────┘
```

#### **4. Ticket Scanning Flow**
```
┌──────────┐  Scan QR/ID    ┌──────────────┐  Verify Owner      ┌────────────┐
│Organizer │───────────────>│   Frontend   │───────────────────>│  Indexer   │
│  (Entry) │                │  (Scanner)   │<───────────────────│  (Query)   │
└──────────┘                └──────┬───────┘                    └────────────┘
                                   │
                                   │ mark_scanned(asset_id)
                            ┌──────▼──────────────────────────────┐
                            │    Smart Contract                   │
                            │  ──────────────────────────────     │
                            │  a. Verify caller = organizer       │
                            │  b. Check not already scanned       │
                            │  c. Write to Box: "scanned_{id}"    │
                            │  d. Return success                  │
                            └─────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

### **Smart Contract Layer (Backend)**
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Python** | 3.12+ | Smart contract development language |
| **AlgoPy (PyTeal)** | Latest | Algorand smart contract framework |
| **AlgoKit** | 2.0+ | Development, deployment, testing toolkit |
| **Poetry** | Latest | Python dependency management |
| **Algorand SDK** | Latest | Blockchain interaction |

### **Frontend Layer (UI)**
| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 18.2.0 | UI framework |
| **TypeScript** | 5.6.3 | Type-safe JavaScript |
| **Vite** | 5.4.20 | Build tool & dev server |
| **TailwindCSS** | 3.4.17 | Utility-first CSS framework |
| **DaisyUI** | 4.12.22 | UI component library |
| **React Router** | 7.1.1 | Client-side routing |

### **Blockchain Integration**
| Technology | Version | Purpose |
|-----------|---------|---------|
| **AlgoKit Utils** | 9.0.0 | Type-safe Algorand interactions |
| **use-wallet-react** | 4.0.0 | Multi-wallet provider support |
| **algosdk** | Latest | Algorand JavaScript SDK |
| **Algorand Indexer** | TestNet API | Historical data & NFT queries |

### **Additional Libraries**
| Technology | Purpose |
|-----------|---------|
| **Notistack** | Toast notifications |
| **qrcode.react** | QR code generation for tickets |
| **html5-qrcode** | QR scanner for organizer panel |

### **Network Configuration**
- **Development**: Algorand TestNet ([AlgoNode API](https://algonode.io))
- **Production Ready**: MainNet compatible
- **Algod**: `https://testnet-api.algonode.cloud`
- **Indexer**: `https://testnet-idx.algonode.cloud`

---

## 📜 Smart Contract Implementation

### **Contract Overview**

**File**: [`projects/contracts/smart_contracts/ticket_contract/contract.py`](projects/contracts/smart_contracts/ticket_contract/contract.py)  
**Lines of Code**: 464  
**Language**: AlgoPy (Python-based PyTeal)

### **Global State (13 Variables)**

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `event_name` | String | Event name | "Algorand Hackathon 2026" |
| `total_tickets` | UInt64 | Max capacity | 500 |
| `tickets_sold` | UInt64 | Tickets sold counter | 247 |
| `ticket_price` | UInt64 | Price in microALGO | 50000000 (50 ALGO) |
| `max_resale_price` | UInt64 | Max resale price | 75000000 (1.5x) |
| `organizer_royalty` | UInt64 | Resale royalty % | 10 (10%) |
| `organizer_address` | Account | Organizer wallet | `ABCD1234...` |
| `event_date` | UInt64 | Unix timestamp | 1749398400 *(NEW)* |
| `event_location` | String | Venue/city | "San Francisco, CA" *(NEW)* |
| `refund_deadline` | UInt64 | 24h before event | 1749312000 *(NEW)* |
| `total_primary_revenue` | UInt64 | Primary sales revenue | 12350000000 *(NEW)* |
| `total_resale_revenue` | UInt64 | Resale royalties earned | 450000000 *(NEW)* |
| `total_refunded` | UInt64 | Total refund payouts | 2250000000 *(NEW)* |

### **Local State (Per User)**

| Variable | Type | Description |
|----------|------|-------------|
| `tickets_purchased` | UInt64 | Tickets purchased by this user (max 5) |
| `tickets_claimed` | UInt64 | Tickets received (resale purchases) |

### **Box Storage (Dynamic)**

| Box Key Format | Purpose | Data Stored |
|---------------|---------|-------------|
| `listing_{asset_id}` | Resale listings | Price + Seller Address |
| `scanned_{asset_id}` | Entry verification | Scan timestamp + Operator |

### **Contract Methods (11 Functions)**

#### **1. Initialize & Setup**

##### `create_event()`
```python
@abimethod
def create_event(
    name: String,
    capacity: UInt64,
    price: UInt64,
    max_resale_multiplier: UInt64,
    royalty: UInt64,
    event_date: UInt64,        # NEW
    location: String            # NEW
) -> None
```
- **Access**: Creator only (one-time initialization)
- **Validation**: 
  - Royalty ≤ 50%
  - Max resale multiplier ≥ 100 (original price minimum)
  - Event date must be in future
- **Auto-Sets**: `refund_deadline = event_date - 86400` (24h before)

---

#### **2. Ticket Purchase**

##### `purchase_ticket()`
```python
@abimethod
def purchase_ticket(self, payment: gtxn.PaymentTransaction) -> UInt64
```
- **Process**:
  1. Validate payment amount matches `ticket_price`
  2. Check `tickets_sold < total_tickets`
  3. Enforce per-wallet limit (≤ 5 tickets)
  4. Mint NFT with metadata
  5. **Auto opt-in buyer** to asset
  6. Transfer NFT to buyer
  7. Increment `tickets_sold` and `total_primary_revenue`
- **Returns**: Asset ID of minted ticket NFT
- **Gas**: ~2000 microALGO (contract absorbs cost)

---

#### **3. Resale Marketplace**

##### `list_for_resale()`
```python
@abimethod
def list_for_resale(self, asset_id: UInt64, price: UInt64) -> None
```
- **Validation**:
  - Price ≤ `max_resale_price`
  - Ticket not already listed
  - Ticket not scanned
- **Storage**: Writes to Box `listing_{asset_id}`

##### `buy_resale_ticket()`
```python
@abimethod
def buy_resale_ticket(
    self, 
    asset_id: UInt64, 
    payment: gtxn.PaymentTransaction
) -> None
```
- **Atomic Operations**:
  1. Verify listing exists
  2. Validate payment = listing price
  3. Calculate royalty: `price * royalty / 100`
  4. Send seller: `price - royalty`
  5. Send organizer: `royalty`
  6. **Auto opt-in buyer** to asset
  7. **Clawback transfer** NFT to buyer
  8. Delete listing from Box
  9. Update `total_resale_revenue`

##### `cancel_listing()`
```python
@abimethod
def cancel_listing(self, asset_id: UInt64) -> None
```
- Deletes Box entry (seller only)

---

#### **4. Refund System** *(NEW Feature)*

##### `request_refund()`
```python
@abimethod
def request_refund(self, ticket_asset_id: UInt64) -> UInt64
```
- **Refund Tiers**:
  ```
  Time                          | Refund Percentage
  ─────────────────────────────────────────────────
  Before refund_deadline        | 90% (early refund)
  After deadline, before event  | 50% (late refund)
  After event_date              | 0% (blocked)
  ```
- **Validation**:
  - Ticket not scanned
  - Ticket not listed for resale
  - Request before event date
- **Process**:
  1. Calculate refund: `price * 90/100` or `price * 50/100`
  2. **Clawback NFT** from owner to contract
  3. Send refund to owner
  4. Decrement `tickets_sold`
  5. Increment `total_refunded`
- **Returns**: Refund amount in microALGO

---

#### **5. Entry Verification**

##### `mark_scanned()`
```python
@abimethod
def mark_scanned(self, asset_id: UInt64) -> None
```
- **Access**: Organizer only
- **Validation**: Not already scanned
- **Storage**: Writes timestamp to Box `scanned_{asset_id}`

##### `is_scanned()` (readonly)
```python
@abimethod(readonly=True)
def is_scanned(self, asset_id: UInt64) -> Bool
```
- Checks if Box `scanned_{asset_id}` exists

---

#### **6. Analytics & Withdrawal**

##### `get_event_info()` (readonly)
```python
@abimethod(readonly=True)
def get_event_info(self) -> tuple[
    String,        # event_name
    UInt64,        # total_tickets
    UInt64,        # tickets_sold
    UInt64,        # ticket_price
    UInt64,        # max_resale_price
    UInt64,        # event_date
    String         # event_location
]
```

##### `get_revenue_stats()` (readonly) *(NEW)*
```python
@abimethod(readonly=True)
def get_revenue_stats(self) -> tuple[
    UInt64,        # total_primary_revenue
    UInt64,        # total_resale_revenue
    UInt64         # total_refunded
]
```

##### `withdraw_revenue()`
```python
@abimethod
def withdraw_revenue(self, amount: UInt64) -> None
```
- **Access**: Organizer only
- **Validation**: After event date
- **Safety**: Ensures contract keeps min balance for boxes

---

## 💻 Frontend Implementation

### **Application Structure**

**Total Lines**: ~5000+  
**Components**: 10  
**Pages**: 4  
**Utilities**: 5  

### **Core Components**

#### **1. Home.tsx** - Landing Page
**Purpose**: Main entry point with live event dashboard

**Features**:
- Real-time event stats (tickets sold/remaining)
- Event countdown timer
- Navigation cards to all features
- Wallet connection status

**Key Code**:
```typescript
// Fetch live event data from contract state
useEffect(() => {
  const fetchEventData = async () => {
    const appClient = new TicketContractFactory({
      algorand,
      defaultSender: '...'
    }).getAppClientById({ appId })
    
    const state = await appClient.getGlobalState()
    setEventName(state.eventName?.asString())
    setTicketsSold(Number(state.ticketsSold?.asNumber()))
    // ... more state
  }
  fetchEventData()
}, [appId, algorand])
```

---

#### **2. MintNFT.tsx** - Ticket Purchase Interface
**Current Name**: `MintNFT.tsx`  
**Suggested Name**: `TicketPurchase.tsx` *(Better describes functionality)*

**Features**:
- Event details display (name, price, date, location)
- "My Tickets" section showing owned NFTs
- Purchase button with wallet integration
- **Refund request interface** *(NEW)*
- QR code generation for each ticket
- Real-time ownership verification via Indexer

**Key Implementations**:

##### **Purchase Flow**:
```typescript
const handlePurchase = async () => {
  // 1. Get App Client
  const appClient = ticketFactory.getAppClientById({ appId })
  
  // 2. Create Payment Transaction
  const paymentTxn = await algorand.createTransaction.payment({
    sender: activeAddress,
    receiver: appAddress,
    amount: algoAmount(ticketPrice),
    extraFee: algoAmount(0.002) // Cover inner txns
  })
  
  // 3. Call Smart Contract
  const result = await appClient.send.purchaseTicket({
    args: { payment: paymentTxn },
    sender: activeAddress
  })
  
  // 4. Extract minted ticket ID
  const assetId = Number(result.return)
  enqueueSnackbar(`Ticket purchased! Asset ID: ${assetId}`)
}
```

##### **Refund Request** *(NEW)*:
```typescript
const handleRefund = async (assetId: number) => {
  const appClient = ticketFactory.getAppClientById({ appId })
  
  // Calculate expected refund based on timing
  const now = Date.now() / 1000
  let expectedRefund = 0
  if (now < refundDeadline) {
    expectedRefund = ticketPrice * 0.9  // 90%
  } else if (now < eventDate) {
    expectedRefund = ticketPrice * 0.5  // 50%
  } else {
    throw new Error("Event ended - no refunds")
  }
  
  // Call contract
  const result = await appClient.send.requestRefund({
    args: { ticketAssetId: BigInt(assetId) },
    sender: activeAddress,
    sendParams: { fee: algoAmount(0.003) } // Cover clawback + payment
  })
  
  const refundAmount = Number(result.return) / 1_000_000
  enqueueSnackbar(`Refunded: ${refundAmount} ALGO`)
}
```

##### **My Tickets Display**:
```typescript
// Fetch user's ticket NFTs via Algorand Indexer
const [ownedTickets, setOwnedTickets] = useState<TicketAsset[]>([])

useEffect(() => {
  const fetchTickets = async () => {
    const tickets = await getUserTickets(activeAddress, algorand)
    setOwnedTickets(tickets)
  }
  if (activeAddress) fetchTickets()
}, [activeAddress, algorand])
```

---

#### **3. Transact.tsx** - Resale Marketplace
**Current Name**: `Transact.tsx`  
**Suggested Name**: `ResaleMarketplace.tsx` *(More descriptive)*

**Features**:
- Two modes: List & Buy
- Ownership verification before listing
- Price validation (≤ max resale price)
- Browse all active listings
- Purchase with automated payment distribution

**Key Implementations**:

##### **List Ticket for Resale**:
```typescript
const handleList = async () => {
  // 1. Verify ownership
  const ownsTicket = await verifyTicketOwnership(
    activeAddress, 
    assetId, 
    algorand
  )
  if (!ownsTicket) {
    throw new Error("You don't own this ticket")
  }
  
  // 2. Validate price
  if (listPrice > maxResalePrice) {
    throw new Error(`Max price: ${maxResalePrice / 1e6} ALGO`)
  }
  
  // 3. Call contract
  const appClient = ticketFactory.getAppClientById({ appId })
  await appClient.send.listForResale({
    args: {
      assetId: BigInt(assetId),
      price: BigInt(listPrice)
    },
    sender: activeAddress,
    sendParams: {
      fee: algoAmount(0.003), // Box storage MBR
      boxReferences: [{ appId, name: `listing_${assetId}` }]
    }
  })
}
```

##### **Buy from Marketplace**:
```typescript
const handleBuyResale = async (listing: Listing) => {
  const appClient = ticketFactory.getAppClientById({ appId })
  
  // Create payment for listing price
  const paymentTxn = await algorand.createTransaction.payment({
    sender: activeAddress,
    receiver: appAddress,
    amount: algoAmount(listing.price / 1e6),
    extraFee: algoAmount(0.004) // Cover seller pmt + royalty + clawback
  })
  
  // Buy ticket (atomic transfer)
  await appClient.send.buyResaleTicket({
    args: {
      assetId: BigInt(listing.assetId),
      payment: paymentTxn
    },
    sender: activeAddress,
    sendParams: {
      boxReferences: [{ appId, name: `listing_${listing.assetId}` }]
    }
  })
  
  enqueueSnackbar('Ticket purchased from marketplace!')
}
```

---

#### **4. Bank.tsx** - Organizer Dashboard
**Current Name**: `Bank.tsx`  
**Suggested Name**: `OrganizerDashboard.tsx` or `EventManager.tsx`

**Features**:
- **Create Event**: Initialize new contracts
- **Event Dashboard**: 
  - Tickets sold/remaining
  - Revenue breakdown (primary + resale + refunds) *(NEW)*
  - Contract balance
  - Event details
- **Ticket Scanner**:
  - QR code scanner (camera)
  - Manual asset ID entry
  - Ownership verification
  - Mark as scanned
  - View scanned tickets list
- **Revenue Withdrawal**: Post-event organizer payout

**Key Implementations**:

##### **Create Event**:
```typescript
const handleCreateEvent = async () => {
  // Deploy contract
  const appClient = await ticketFactory.deploy({
    deployTimeParams: {},
    onUpdate: 'update',
    onSchemaBreak: 'replace'
  })
  
  const newAppId = Number(appClient.appId)
  
  // Initialize event
  await appClient.send.createEvent({
    args: {
      name: eventName,
      capacity: BigInt(capacity),
      price: BigInt(price * 1e6),
      maxResaleMultiplier: BigInt(maxResale),
      royalty: BigInt(royalty),
      eventDate: BigInt(eventDate),      // NEW
      location: eventLocation             // NEW
    },
    sender: activeAddress,
    sendParams: { fee: algoAmount(0.002) }
  })
  
  localStorage.setItem('TICKET_CONTRACT_APP_ID', newAppId.toString())
}
```

##### **Revenue Dashboard** *(NEW)*:
```typescript
const [revenueData, setRevenueData] = useState<RevenueData>({
  primaryRevenue: 0,
  resaleRevenue: 0,
  totalRefunded: 0,
  appBalance: 0
})

useEffect(() => {
  const fetchRevenue = async () => {
    const appClient = ticketFactory.getAppClientById({ appId })
    
    // Get revenue stats from contract
    const stats = await appClient.send.getRevenueStats({
      sender: activeAddress
    })
    
    // Get contract balance
    const appInfo = await algorand.account.getInformation(appAddress)
    
    setRevenueData({
      primaryRevenue: Number(stats.return[0]) / 1e6,
      resaleRevenue: Number(stats.return[1]) / 1e6,
      totalRefunded: Number(stats.return[2]) / 1e6,
      appBalance: Number(appInfo.amount) / 1e6
    })
  }
  fetchRevenue()
}, [appId])
```

##### **QR Scanner**:
```typescript
const handleScan = async (scannedAssetId: number) => {
  // 1. Verify ownership via Indexer
  const indexer = algorand.client.indexer
  const assetInfo = await indexer
    .lookupAssetBalances(scannedAssetId)
    .do()
  
  const owner = assetInfo.balances.find(b => b.amount > 0)?.address
  
  if (!owner) {
    throw new Error("No owner found - invalid ticket")
  }
  
  // 2. Check if already scanned
  const appClient = ticketFactory.getAppClientById({ appId })
  const isScanned = await appClient.send.isScanned({
    args: { assetId: BigInt(scannedAssetId) },
    sender: activeAddress
  })
  
  if (isScanned.return) {
    throw new Error("⚠️ ALREADY SCANNED - Double entry attempt!")
  }
  
  // 3. Mark as scanned
  await appClient.send.markScanned({
    args: { assetId: BigInt(scannedAssetId) },
    sender: activeAddress,
    sendParams: {
      fee: algoAmount(0.003),
      boxReferences: [{ appId, name: `scanned_${scannedAssetId}` }]
    }
  })
  
  enqueueSnackbar(`✅ Ticket ${scannedAssetId} scanned for ${owner}`)
}
```

---

### **Utility Functions**

#### **ticketAssets.ts** - NFT Ownership Utilities
**Suggested Rename**: `ticketNFTUtils.ts`

```typescript
export interface TicketAsset {
  assetId: number
  name: string
  unitName: string
  creator: string
  total: number
}

export async function getUserTickets(
  userAddress: string,
  algorand: AlgorandClient
): Promise<TicketAsset[]> {
  const indexer = algorand.client.indexer
  const accountInfo = await indexer
    .lookupAccountByID(userAddress)
    .do()
  
  // Filter for ticket NFTs (total=1, created by contract)
  const tickets = accountInfo.account.assets
    .filter(asset => {
      const assetInfo = /* fetch asset details */
      return assetInfo.params.total === 1 && 
             assetInfo.params.creator === contractAddress
    })
    .map(asset => ({
      assetId: asset['asset-id'],
      name: asset.params.name,
      // ... more details
    }))
  
  return tickets
}

export async function verifyTicketOwnership(
  userAddress: string,
  assetId: number,
  algorand: AlgorandClient
): Promise<boolean> {
  const tickets = await getUserTickets(userAddress, algorand)
  return tickets.some(t => t.assetId === assetId)
}
```

---

## � Setup & Deployment

### **Prerequisites**

#### **Required Software**
- **Node.js** v18+ ([Download](https://nodejs.org/))
- **pnpm** (Package manager)
  ```powershell
  npm install -g pnpm
  ```
- **Python** 3.12+ ([Download](https://www.python.org/))
- **Poetry** (Python dependency manager)
  ```powershell
  pip install poetry
  ```
- **AlgoKit** (Algorand dev toolkit)
  ```powershell
  pipx install algokit
  ```

#### **Algorand Wallet**
- [Pera Wallet](https://perawallet.app/) (Mobile/Desktop)
- [Defly Wallet](https://defly.app/) (Browser Extension)
- [Exodus](https://www.exodus.com/) (Multi-chain)
- [Lute Wallet](https://lute.app/) (TestNet friendly)

#### **Free TestNet ALGO**
Get TestNet tokens: https://bank.testnet.algorand.network/

---

### **Quick Start (Local Development)**

```powershell
# 1. Clone repository
git clone <your-repo-url>
cd TicketChain

# 2. Setup Smart Contracts
cd projects/contracts
poetry install                  # Install dependencies
poetry shell                    # Activate virtual environment
algokit project run build       # Compile PyTeal → TEAL

# 3. Setup Frontend
cd ../frontend
pnpm install                    # Install dependencies
pnpm run dev                    # Start at http://localhost:5174

# 4. Configure Environment Variables
# See .env.example in each directory
```

**Expected Result**: 
- ✅ Contracts compiled to [`artifacts/ticket_contract/`](projects/contracts/smart_contracts/artifacts/ticket_contract/)
- ✅ Frontend running at `http://localhost:5174`
- ✅ Wallet connection working

---

### **Deployment to TestNet**

#### **Step 1: Setup Deployer Wallet**

1. **Get Your Mnemonic**:
   - Open Pera/Defly wallet
   - Go to Settings → Backup/Recovery Phrase
   - Copy 25-word mnemonic

2. **Fund with TestNet ALGO**:
   - Visit: https://bank.testnet.algorand.network/
   - Enter wallet address
   - Request ALGO (free)
   - Wait for confirmation (~4 seconds)

3. **Configure `.env`**:
   ```powershell
   cd projects/contracts
   cp .env.example .env
   notepad .env
   ```
   
   Add your mnemonic:
   ```env
   DEPLOYER_MNEMONIC="your 25 word mnemonic phrase here"
   ALGOD_SERVER=https://testnet-api.algonode.cloud
   ALGOD_PORT=443
   INDEXER_SERVER=https://testnet-idx.algonode.cloud
   INDEXER_PORT=443
   ```

#### **Step 2: Deploy Smart Contract**

```powershell
cd projects/contracts
poetry shell                     # Activate venv
algokit project deploy testnet   # Deploy to TestNet
```

**Output**:
```
✅ TicketContract deployed
   App ID: 123456789
   App Address: ABCD1234EFGH5678...
   Creator: YOUR_WALLET_ADDRESS
```

**📝 Save the App ID!** You'll need it for frontend configuration.

#### **Step 3: Initialize Event**

```bash
# Option 1: Via AlgoKit CLI
algokit goal app call \
  --app-id 123456789 \
  --from <YOUR_WALLET> \
  --method "create_event(string,uint64,uint64,uint64,uint64,uint64,string)void" \
  --arg '"Algorand Hackathon 2026"' \
  --arg 500 \
  --arg 50000000 \
  --arg 150 \
  --arg 10 \
  --arg 1749398400 \
  --arg '"San Francisco, CA"'
```

**Option 2: Via Frontend**:
- Navigate to "Organizer Dashboard"
- Fill event creation form
- Click "Create Event"

**Parameters**:
- Name: "Algorand Hackathon 2026"
- Capacity: 500 tickets
- Price: 50 ALGO (50000000 microALGO)
- Max Resale: 150% (1.5x original price)
- Royalty: 10% (organizer earns 10% on resales)
- Event Date: Unix timestamp (e.g., May 15, 2026)
- Location: "San Francisco, CA"

#### **Step 4: Connect Frontend**

1. **Update App ID** in [`organizerConfig.ts`](projects/frontend/src/config/organizerConfig.ts):
   ```typescript
   export const HARDCODED_APP_ID = BigInt(123456789) // Your App ID
   export const ORGANIZER_ADDRESS = "YOUR_WALLET_ADDRESS"
   export const SINGLE_ORGANIZER_MODE = true
   ```

2. **Restart Frontend**:
   ```powershell
   cd projects/frontend
   pnpm run dev
   ```

3. **Test Full Flow**:
   - Connect wallet
   - Purchase ticket
   - View in "My Tickets"
   - Check on [AlgoExplorer TestNet](https://testnet.explorer.perawallet.app/)

---

## 🔮 Future Scope

> **Full details in [FUTURE_SCOPE.md](FUTURE_SCOPE.md)**

We've identified several enhancements to transform TicketChain into a production-ready platform:

### **Phase 1: Enhanced Financial Features (3-6 months)**

1. **Dynamic Pricing Engine**
   - AI-driven pricing based on demand
   - Time-sensitive adjustments
   - Revenue optimization (15-30% increase projected)

2. **Fractional Ticket Ownership**
   - Split high-value tickets (e.g., Super Bowl)
   - Multiple owners, lottery for attendance
   - Trade fractions on secondary market

3. **Stablecoin Payments**
   - USDC/USDT support on Algorand
   - Fiat on-ramps (UPI, PIX, Stripe)
   - Eliminate crypto volatility concern

4. **Ticket-Backed Lending (DeFi)**
   - Use ticket NFTs as collateral
   - Borrow up to 70% of ticket value
   - Liquidation if defaulted before event

### **Phase 2: Platform Expansion (6-12 months)**

5. **Multi-Event Marketplace**
   - Discovery & search across all events
   - Cross-event bundle deals
   - Venue KYB verification
   - 2.5% platform fee model

6. **Subscription/Season Passes**
   - Multi-event access NFTs
   - Auto-claim for each date
   - Transferable mid-season

7. **Revenue Sharing for Artists**
   - On-chain royalty splits
   - Automatic payment distribution
   - Transparent earnings tracking

### **Phase 3: Enterprise Features (12-18 months)**

8. **White-Label Solution** for venues
9. **Mobile Apps** (iOS/Android with React Native)
10. **NFT Ticket Perks** (VIP access, merchandise discounts)
11. **Compliance Module** (KYC/AML for high-value events)
12. **Analytics Dashboard** (organizer insights)

**Detailed roadmap, market analysis, and technical architecture**: [View FUTURE_SCOPE.md](FUTURE_SCOPE.md)

---

## 📁 Project Structure

---

## 📁 Project Structure

```
TicketChain/
├── 📄 README.md                          # This comprehensive guide
├── 📄 FUTURE_SCOPE.md                    # Roadmap & expansion plans
├── 📄 Alokit_setup.md                    # AlgoKit setup instructions
├── 📦 package.json                       # Root package config
├── 🏗️ OnChain-Counter.code-workspace     # VS Code workspace
│
├── 📂 projects/
│   │
│   ├── 📂 contracts/                     # ⚡ SMART CONTRACT LAYER
│   │   ├── 📄 pyproject.toml             # Poetry dependencies
│   │   ├── 📄 poetry.toml                # Poetry config
│   │   ├── 🔐 .env                       # Environment vars (gitignored)
│   │   │
│   │   ├── 📂 smart_contracts/
│   │   │   ├── 📂 ticket_contract/       # 🎫 MAIN CONTRACT
│   │   │   │   ├── 📄 contract.py        # ✨ Core logic (464 lines)
│   │   │   │   ├── 📄 deploy_config.py   # Deployment configuration
│   │   │   │   └── 📄 __init__.py
│   │   │   │
│   │   │   └── 📂 artifacts/             # 📦 COMPILED OUTPUT
│   │   │       └── 📂 ticket_contract/
│   │   │           ├── TicketContract.approval.teal  # Compiled approval program
│   │   │           ├── TicketContract.clear.teal     # Clear state program
│   │   │           ├── TicketContract.arc56.json     # ✨ ABI specification
│   │   │           └── ticket_contract_client.py     # Python client
│   │   │
│   │   ├── 📂 tests/                     # 🧪 Contract tests
│   │   │   ├── conftest.py
│   │   │   ├── counter_test.py
│   │   │   └── counter_client_test.py
│   │   │
│   │   └── 🛠️ Utility Scripts:
│   │       ├── create_affordable_event.py  # Deploy event helper
│   │       ├── initialize_event.py         # Event init script
│   │       ├── check_event_state.py        # Contract state inspector
│   │       ├── get_apps.py                 # List deployed apps
│   │       └── identify_apps.py            # App ID utilities
│   │
│   └── 📂 frontend/                      # 🎨 REACT FRONTEND
│       ├── 📄 package.json               # Dependencies
│       ├── 📄 vite.config.ts             # Vite build config
│       ├── 📄 tsconfig.json              # TypeScript config
│       ├── 📄 tailwind.config.cjs        # TailwindCSS config
│       ├── 📄 postcss.config.cjs         # PostCSS config
│       ├── 📄 jest.config.ts             # Jest testing
│       ├── 📄 playwright.config.ts       # E2E testing
│       ├── 📄 pnpm-lock.yaml
│       │
│       ├── 📂 src/
│       │   ├── 📄 main.tsx               # React entry point
│       │   ├── 📄 App.tsx                # Router & wallet provider
│       │   ├── 📄 Home.tsx               # 🏠 Landing page
│       │   ├── 📄 vite-env.d.ts
│       │   │
│       │   ├── 📂 components/            # ⚛️ REACT COMPONENTS
│       │   │   ├── ConnectWallet.tsx     # Wallet connection modal
│       │   │   ├── MintNFT.tsx           # 🎫 Ticket purchase UI
│       │   │   │                         #    (→ suggested: TicketPurchase.tsx)
│       │   │   ├── Transact.tsx          # 🔄 Resale marketplace
│       │   │   │                         #    (→ suggested: ResaleMarketplace.tsx)
│       │   │   ├── Bank.tsx              # 👨‍💼 Organizer dashboard
│       │   │   │                         #    (→ suggested: OrganizerDashboard.tsx)
│       │   │   ├── Account.tsx           # Account info display
│       │   │   ├── AssetOptIn.tsx        # Manual opt-in (legacy)
│       │   │   ├── CreateASA.tsx         # Generic ASA creator (unused)
│       │   │   ├── SendAlgo.tsx          # ALGO transfer (demo)
│       │   │   ├── AppCalls.tsx          # Demo component (unused)
│       │   │   └── ErrorBoundary.tsx     # Error handling wrapper
│       │   │
│       │   ├── 📂 contracts/             # 📜 GENERATED CLIENTS
│       │   │   ├── TicketContract.ts     # ✨ Type-safe contract client
│       │   │   ├── Counter.ts            # Example counter (unused)
│       │   │   ├── Bank.ts               # Example bank (unused)
│       │   │   └── README.md
│       │   │
│       │   ├── 📂 config/                # ⚙️ CONFIGURATION
│       │   │   └── organizerConfig.ts    # ✨ App ID & organizer address
│       │   │
│       │   ├── 📂 utils/                 # 🛠️ UTILITIES
│       │   │   ├── ticketAssets.ts       # ✨ NFT ownership verification
│       │   │   │                         #    (→ suggested: ticketNFTUtils.ts)
│       │   │   ├── pinata.ts             # IPFS metadata upload
│       │   │   ├── ellipseAddress.ts     # Address formatting
│       │   │   ├── ellipseAddress.spec.tsx # Unit tests
│       │   │   └── 📂 network/
│       │   │       └── getAlgoClientConfigs.ts  # Algod/Indexer setup
│       │   │
│       │   ├── 📂 interfaces/
│       │   │   └── network.ts            # TypeScript interfaces
│       │   │
│       │   ├── 📂 styles/
│       │   │   └── main.css              # Global styles
│       │   │
│       │   └── 📂 assets/                # Images, icons
│       │
│       ├── 📂 public/
│       │   ├── index.html
│       │   └── robots.txt
│       │
│       └── 📂 tests/                     # 🧪 E2E tests
│           └── example.spec.ts
│
└── 🔒 .gitignore                         # Git ignore rules
```

### **Key Files to Review for Judges**

| File | Purpose | Lines | Status |
|------|---------|-------|--------|
| [`contract.py`](projects/contracts/smart_contracts/ticket_contract/contract.py) | Main smart contract logic | 464 | ✅ Complete |
| [`TicketContract.arc56.json`](projects/contracts/smart_contracts/artifacts/ticket_contract/TicketContract.arc56.json) | ABI specification | - | ✅ Auto-generated |
| [`Home.tsx`](projects/frontend/src/Home.tsx) | Landing page & dashboard | 315 | ✅ Complete |
| [`MintNFT.tsx`](projects/frontend/src/components/MintNFT.tsx) | Purchase & refund interface | 520 | ✅ Complete |
| [`Transact.tsx`](projects/frontend/src/components/Transact.tsx) | Resale marketplace | ~400 | ✅ Complete |
| [`Bank.tsx`](projects/frontend/src/components/Bank.tsx) | Organizer dashboard & scanner | 608 | ✅ Complete |
| [`ticketAssets.ts`](projects/frontend/src/utils/ticketAssets.ts) | NFT ownership utilities | ~150 | ✅ Complete |
| [`organizerConfig.ts`](projects/frontend/src/config/organizerConfig.ts) | Deployment configuration | 10 | ✅ Complete |

---

## 👥 Team Workflow

### **Git Collaboration**

#### **Initial Setup**
```powershell
# 1. Initialize repository (if not done)
git init
git add .
git commit -m "feat: TicketChain initial implementation"

# 2. Create GitHub repo and link
git remote add origin https://github.com/yourusername/TicketChain.git
git branch -M main
git push -u origin main
```

#### **Team Member Onboarding**
```powershell
# Clone repository
git clone https://github.com/yourusername/TicketChain.git
cd TicketChain

# Setup contracts
cd projects/contracts
poetry install
poetry shell
algokit project run build

# Setup frontend
cd ../frontend
pnpm install
pnpm run dev

# ⚠️ Create your own .env files (not in git)
```

#### **Development Workflow**
```powershell
# Before starting work
git pull origin main

# Create feature branch
git checkout -b feature/your-feature-name

# Make changes, then commit
git add .
git commit -m "feat: add XYZ functionality"

# Push and create PR
git push origin feature/your-feature-name
```

### **Branch Naming Convention**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code improvements

### **Commit Message Format**
```
<type>: <description>

Types: feat, fix, docs, refactor, test, chore
Examples:
- feat: add refund mechanism to smart contract
- fix: resolve wallet connection issue
- docs: update README with deployment steps
```

---

## 🐛 Troubleshooting

### **Common Issues**

#### **1. "DEPLOYER_MNEMONIC not set"**
**Problem**: `.env` file missing or misconfigured  
**Solution**:
```powershell
cd projects/contracts
cp .env.example .env
notepad .env  # Add your 25-word mnemonic in quotes
```

#### **2. "Insufficient ALGO balance"**
**Problem**: Deployer wallet has no TestNet ALGO  
**Solution**:
- Visit https://bank.testnet.algorand.network/
- Enter wallet address
- Request ALGO (free)
- Minimum needed: ~10 ALGO for deployment + testing

#### **3. "Cannot destructure property 'token'"**
**Problem**: Vite cache corruption  
**Solution**:
```powershell
cd projects/frontend
rm -rf node_modules/.vite
rm -rf node_modules/@algorandfoundation
pnpm install
pnpm run dev
```

#### **4. "Wallet connection not working"**
**Problem**: Browser cache or wallet extension issue  
**Solution**:
- Hard refresh: `Ctrl+Shift+R` (Windows) / `Cmd+Shift+R` (Mac)
- Clear site data in browser DevTools
- Reinstall wallet extension
- Try different wallet (Defly vs Pera)

#### **5. "Asset not found / User hasn't opted in"**
**Problem**: Manual opt-in attempted (our contract auto opts-in)  
**Solution**: Use contract methods directly - no manual opt-in needed

#### **6. "Box reference not found"**
**Problem**: Missing `boxReferences` parameter in transaction  
**Solution**:
```typescript
await appClient.send.methodName({
  args: { ... },
  sender: activeAddress,
  sendParams: {
    boxReferences: [
      { appId: BigInt(appId), name: new Uint8Array(Buffer.from('listing_123')) }
    ]
  }
})
```

#### **7. "Transaction rejected: fee too low"**
**Problem**: Inner transactions not covered  
**Solution**: Add extra fee:
```typescript
sendParams: {
  fee: algoAmount(0.003)  // Cover inner txns
}
```

---

## 📊 Key Metrics & Achievements

### **Code Statistics**
- **Smart Contract**: 464 lines (AlgoPy/PyTeal)
- **Frontend**: ~5000+ lines (React/TypeScript)
- **Total Components**: 10 React components
- **Utility Functions**: 5 modules
- **Contract Methods**: 11 ABI methods (7 write, 4 read-only)

### **Blockchain Features**
- ✅ **11 Smart Contract Methods** (purchase, resale, refund, scan, etc.)
- ✅ **3 Storage Types** (Global State, Local State, Box Storage)
- ✅ **13 Global State Variables** tracking all event data
- ✅ **4 Revenue Streams** (primary, resale, refunds, withdrawals)
- ✅ **Atomic Transactions** for payment + NFT transfer
- ✅ **Time-Based Logic** (event date, refund deadline)

### **User Features**
- ✅ **4 Wallet Providers** (Pera, Defly, Exodus, Lute)
- ✅ **3 User Interfaces** (Buy, Resell, Organize)
- ✅ **Real-Time NFT Tracking** via Algorand Indexer
- ✅ **QR Code Generation** for tickets
- ✅ **QR Scanner** for organizer entry verification

### **Innovation Highlights**
1. **Automated Refund Tiers** - Time-based 90%/50%/0% logic *(NEW)*
2. **Zero Manual Opt-In** - Contract handles all asset opt-ins
3. **Clawback Resale** - Seamless NFT transfers without user friction
4. **Revenue Transparency** - Separate tracking of primary/resale/refunds
5. **Double-Entry Prevention** - On-chain scan registry

---

## 🎓 What We Learned

### **Technical Learnings**
1. **AlgoPy Best Practices**: Box storage for dynamic data, inner transactions for complex flows
2. **Atomicity**: Importance of grouping payment + NFT transfer in single transaction
3. **Gas Optimization**: Using extra fees to cover inner transactions
4. **Type Safety**: Auto-generating TypeScript clients from ABI prevents runtime errors
5. **Indexer Queries**: Real-time NFT ownership verification without relying on contract state

### **Blockchain Insights**
1. **Why Algorand**: 3.9s finality, $0.001 txn fees make it ideal for ticketing
2. **NFT vs Fungible**: Per ticket = 1 NFT (total=1) enables unique ownership tracking
3. **State Management**: Global (event), Local (user limits), Box (dynamic listings)
4. **Clawback Power**: Retained clawback authority enables resale without buyer opt-in
5. **Time-Based Logic**: `Global.latest_timestamp` enables automated policy enforcement

---

## 📝 License

MIT License - Free to use for hackathons, learning, or commercial projects.

---

## 🙏 Acknowledgments

- **Algorand Foundation** - For the sustainable, fast, and developer-friendly blockchain
- **AlgoKit Team** - For the incredible development toolkit and documentation
- **TxnLab** - For the `use-wallet-react` library making multi-wallet support easy
- **Open Source Community** - React, TypeScript, Tailwind, and all the amazing tools we used

---

## 📞 Contact & Links

- **GitHub Repository**: [Your Repo URL]
- **Live Demo**: [Deployed App URL] (if available)
- **TestNet Explorer**: [AlgoExplorer TestNet](https://testnet.explorer.perawallet.app/)
- **Documentation**: This README + [FUTURE_SCOPE.md](FUTURE_SCOPE.md)

---

## 🏆 Hackathon Submission Summary

### **What We Built**
A complete blockchain-based event ticketing platform solving real-world problems of fraud, scalping, and unfair pricing through:
- NFT-based tickets with anti-counterfeit guarantees
- Automated resale marketplace with price caps and organizer royalties
- **Dynamic refund policy** with time-based tiers (90%/50%/0%)
- Double-entry prevention via on-chain scanning
- Revenue transparency and automated distribution

### **Technical Stack**
- **Blockchain**: Algorand (TestNet deployed, MainNet ready)
- **Smart Contract**: AlgoPy (464 lines, 11 methods)
- **Frontend**: React + TypeScript (5000+ lines)
- **Integration**: AlgoKit Utils, Multi-wallet support

### **Innovation Points**
1. ✅ **Automated Refunds** - First ticketing platform with on-chain time-based refunds
2. ✅ **Zero User Friction** - Auto opt-in eliminates blockchain complexity
3. ✅ **Fair Pricing** - Enforced resale caps stop scalping
4. ✅ **Revenue Sharing** - Organizers earn from secondary market
5. ✅ **Scan Registry** - Blockchain-based entry verification

### **Production Readiness**
- ✅ Fully functional on Algorand TestNet
- ✅ Type-safe with TypeScript and ABI generation
- ✅ Error handling and validation throughout
- ✅ Responsive UI with TailwindCSS
- ✅ Multi-wallet support (4 providers)
- 🚀 Ready for MainNet deployment

---

**Built with ❤️ on Algorand blockchain**  
*Eliminating ticket fraud, one NFT at a time*


