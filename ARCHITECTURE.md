# TicketChain Architecture

## 🏗️ System Architecture Diagram

```mermaid
flowchart TB
    subgraph Users["👥 Users"]
        Buyer["🎫 Ticket Buyer"]
        Seller["💰 Reseller"]
        Organizer["⚙️ Event Organizer"]
        Scanner["📱 Door Scanner"]
    end

    subgraph Frontend["🖥️ React Frontend (Vite + TypeScript)"]
        Home["🏠 Home Page<br/>Live Event Status"]
        Purchase["🎫 Purchase Modal<br/>Buy & Claim Tickets"]
        Marketplace["🔄 Resale Marketplace<br/>List & Buy Resale"]
        OrgPanel["⚙️ Organizer Panel<br/>Create, Dashboard, Scanner, Revenue"]
        
        subgraph Components["📦 Core Components"]
            Wallet["💳 Wallet Connect<br/>(Pera, Defly, Lute)"]
            QRGen["📱 QR Generator<br/>(qrcode.react)"]
            QRScan["📷 QR Scanner<br/>(html5-qrcode)"]
        end
    end

    subgraph Blockchain["⛓️ Algorand TestNet"]
        subgraph SmartContract["📜 TicketContract (ARC4)"]
            GlobalState["🌐 Global State<br/>event_name, ticket_price,<br/>total_tickets, event_date,<br/>organizer_address"]
            LocalState["👤 Local State<br/>tickets_purchased<br/>(per user, max 5)"]
            BoxStorage["📦 Box Storage<br/>listing_{assetId} → price/seller<br/>scanned_{assetId} → timestamp"]
            
            subgraph Methods["🔧 Contract Methods"]
                CreateEvent["create_event()"]
                PurchaseTicket["purchase_ticket()"]
                ReceiveTicket["receive_ticket()"]
                ListResale["list_for_resale()"]
                BuyResale["buy_resale_ticket()"]
                MarkScanned["mark_scanned()"]
                RequestRefund["request_refund()"]
                WithdrawRevenue["withdraw_revenue()"]
            end
        end
        
        subgraph Assets["🎨 NFT Tickets (ASA)"]
            TicketNFT["🎫 Ticket NFT<br/>Unit: TIX<br/>Total: 1, Decimals: 0"]
        end
    end

    subgraph External["🌐 External Services"]
        PeraWallet["📱 Pera Wallet"]
        Indexer["🔍 Algorand Indexer"]
        Explorer["🔎 Block Explorer"]
    end

    %% User Flows
    Buyer -->|"Connect Wallet"| Wallet
    Buyer -->|"Buy Ticket"| Purchase
    Seller -->|"List for Resale"| Marketplace
    Organizer -->|"Create Event"| OrgPanel
    Scanner -->|"Scan QR"| QRScan

    %% Frontend to Blockchain
    Purchase -->|"payment + purchase_ticket()"| SmartContract
    Purchase -->|"opt-in + receive_ticket()"| SmartContract
    Marketplace -->|"list_for_resale()"| SmartContract
    Marketplace -->|"buy_resale_ticket()"| SmartContract
    OrgPanel -->|"create_event()"| SmartContract
    OrgPanel -->|"mark_scanned()"| SmartContract
    OrgPanel -->|"withdraw_revenue()"| SmartContract
    
    %% Contract to Assets
    SmartContract -->|"Mints"| TicketNFT
    SmartContract -->|"Transfers"| TicketNFT
    
    %% External connections
    Wallet <-->|"Sign Txns"| PeraWallet
    Frontend -->|"Query Assets"| Indexer
    Frontend -->|"View Txns"| Explorer

    %% Styling
    classDef userClass fill:#e1f5fe,stroke:#0288d1
    classDef frontendClass fill:#f3e5f5,stroke:#7b1fa2
    classDef blockchainClass fill:#e8f5e9,stroke:#388e3c
    classDef externalClass fill:#fff3e0,stroke:#f57c00
    
    class Buyer,Seller,Organizer,Scanner userClass
    class Home,Purchase,Marketplace,OrgPanel,Wallet,QRGen,QRScan frontendClass
    class SmartContract,GlobalState,LocalState,BoxStorage,TicketNFT blockchainClass
    class PeraWallet,Indexer,Explorer externalClass
```

---

## 🔄 Transaction Flow Diagrams

### 1. Ticket Purchase Flow

```mermaid
sequenceDiagram
    participant User as 👤 Buyer
    participant Frontend as 🖥️ Frontend
    participant Wallet as 📱 Pera Wallet
    participant Contract as 📜 Smart Contract
    participant NFT as 🎫 Ticket NFT

    User->>Frontend: Click "Purchase Ticket"
    Frontend->>Wallet: Request Opt-in to App
    Wallet-->>User: Approve opt-in
    User->>Wallet: ✅ Approve
    Wallet->>Contract: OptIn Transaction
    
    Frontend->>Wallet: Request Payment + Purchase
    Wallet-->>User: Approve payment (X ALGO)
    User->>Wallet: ✅ Approve
    Wallet->>Contract: purchase_ticket(payment)
    Contract->>NFT: 🎨 Mint new NFT (held by contract)
    Contract-->>Frontend: Return Asset ID
    
    Frontend->>Wallet: Request Asset Opt-in
    Wallet-->>User: Approve asset opt-in
    User->>Wallet: ✅ Approve
    
    Frontend->>Wallet: Request Claim Ticket
    Wallet-->>User: Approve claim
    User->>Wallet: ✅ Approve
    Wallet->>Contract: receive_ticket(assetId)
    Contract->>NFT: 📤 Transfer NFT to User
    
    Frontend-->>User: 🎉 Success! Ticket #12345
```

### 2. Resale Flow

```mermaid
sequenceDiagram
    participant Seller as 💰 Seller
    participant Buyer as 🎫 Buyer
    participant Contract as 📜 Smart Contract
    participant Box as 📦 Box Storage

    Note over Seller: Owns Ticket NFT
    
    Seller->>Contract: list_for_resale(assetId, price)
    Contract->>Box: Store listing_{assetId}
    Contract-->>Seller: ✅ Listed
    
    Note over Buyer: Sees listing in marketplace
    
    Buyer->>Contract: opt-in to asset
    Buyer->>Contract: buy_resale_ticket(payment, assetId)
    Contract->>Contract: Verify price ≤ max resale
    Contract->>Contract: Calculate royalty (10%)
    Contract->>Seller: 💵 Send 90% to seller
    Contract->>Contract: 💰 Keep 10% royalty
    Contract->>Buyer: 🎫 Transfer NFT
    Contract->>Box: Delete listing_{assetId}
    Contract-->>Buyer: ✅ Purchase complete
```

### 3. Refund Flow

```mermaid
sequenceDiagram
    participant User as 👤 Ticket Holder
    participant Contract as 📜 Smart Contract
    participant Box as 📦 Box Storage

    User->>Contract: request_refund(ticketAssetId)
    
    alt More than 24h before event
        Contract->>Contract: Calculate 90% refund
        Contract->>User: 💵 Send 90% of ticket price
        Contract->>Contract: 🔥 Burn ticket NFT
        Contract-->>User: ✅ Full refund (90%)
    else Within 24h of event
        Contract->>Contract: Calculate 50% refund
        Contract->>User: 💵 Send 50% of ticket price
        Contract->>Contract: 🔥 Burn ticket NFT
        Contract-->>User: ⚠️ Partial refund (50%)
    else After event
        Contract-->>User: ❌ No refund available
    end
```

---

## 📊 Data Model

### Global State (On-Chain)
| Key | Type | Description |
|-----|------|-------------|
| `event_name` | String | Name of the event |
| `total_tickets` | UInt64 | Maximum ticket capacity |
| `tickets_sold` | UInt64 | Number of tickets sold |
| `ticket_price` | UInt64 | Price in microAlgos |
| `max_resale_price` | UInt64 | Maximum resale price allowed |
| `organizer_royalty` | UInt64 | Royalty percentage (0-50) |
| `organizer_address` | Address | Organizer wallet address |
| `event_date` | UInt64 | Unix timestamp of event |
| `refund_deadline` | UInt64 | 24h before event (auto-calculated) |
| `event_location` | String | Event venue location |
| `total_primary_revenue` | UInt64 | Total from primary sales |
| `total_resale_revenue` | UInt64 | Total from resale royalties |
| `total_refunded` | UInt64 | Total refunds paid out |

### Local State (Per User)
| Key | Type | Description |
|-----|------|-------------|
| `tickets_purchased` | UInt64 | Count of tickets bought (max 5) |

### Box Storage
| Key Pattern | Value | Description |
|-------------|-------|-------------|
| `listing_{assetId}` | 48 bytes | Seller address (32) + Price (8) + ListTime (8) |
| `scanned_{assetId}` | 8 bytes | Scan timestamp |

---

## 🛡️ Security Features

```mermaid
mindmap
  root((🔒 Security))
    Smart Contract
      Organizer-only methods
      Price cap enforcement
      Duplicate scan prevention
      Post-event lockdown
    Tickets
      NFT authenticity
      On-chain ownership
      Cannot duplicate
      Scanned = invalidated
    Payments
      Atomic transactions
      No intermediary custody
      Direct wallet-to-contract
    Refunds
      Tiered policy
      Automatic processing
      No manual approval
```

---

## 🏛️ Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Blockchain** | Algorand TestNet | Fast, low-cost L1 |
| **Smart Contract** | Python (AlgoPy) → TEAL | ARC4 ABI compliant |
| **Client Generator** | AlgoKit 5.0 | TypeScript client from ARC56 |
| **Frontend** | React 18 + TypeScript | Modern UI |
| **Build Tool** | Vite 5.4 | Fast HMR development |
| **Styling** | TailwindCSS + DaisyUI | Beautiful components |
| **Wallet** | @txnlab/use-wallet-react | Multi-wallet support |
| **QR Codes** | qrcode.react + html5-qrcode | Generate & scan |
| **State** | React useState + localStorage | Simple persistence |

