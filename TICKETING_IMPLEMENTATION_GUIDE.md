# TicketChain Implementation Guide
## Tweaking Existing Components for Ticketing System

This guide shows you how to properly modify existing template components to create your ticketing dApp **WITHOUT rebuilding from scratch**.

---

## 🎯 Overview: Component Mapping

| Template Component | New Purpose | Ticketing Features |
|-------------------|-------------|-------------------|
| `Home.tsx` | Event Dashboard | Display event info, tickets available, navigation |
| `MintNFT.tsx` | **Purchase Ticket** | Buy tickets (mints NFT), show event details |
| `Bank.tsx` | **Organizer Panel** | Create events, scan tickets, manage event |
| `Transact.tsx` | **Resale Marketplace** | List/buy resale tickets |
| `AppCalls.tsx` | (Optional) Additional contract calls |

---

## 📝 Step-by-Step Prompts for AI

### STEP 1: Modify Home.tsx - Event Landing Page

**File:** `projects/frontend/src/Home.tsx`

**Action:** Open the file, copy its full contents, and use this prompt:

```
I'm building a TicketChain dApp on Algorand. I want to redesign my landing page (Home.tsx) to showcase an event ticketing system.

Transform it into a modern event landing page with:
- Hero section with striking event title "TicketChain - Blockchain Event Ticketing"
- A feature grid with 4 cards:
  1. "Purchase Tickets" (links to ticket purchase) - Icon: ticket/shopping
  2. "Resale Marketplace" (buy/sell tickets) - Icon: exchange/marketplace
  3. "Organizer Panel" (for event creators) - Icon: settings/admin
  4. "Scan Tickets" (validate at event) - Icon: qr-code/scan
  
- Add a live event status section showing:
  - Event Name (from contract state)
  - Tickets Available / Total
  - Ticket Price
  - Max Resale Price
  
Use TailwindCSS for styling with a modern Web3 aesthetic (gradients, purple/blue theme, clean cards).

IMPORTANT: 
- Keep ALL wallet connection logic EXACTLY as-is
- Keep ALL navigation handlers unchanged
- Keep ALL state management intact
- ONLY change JSX structure and Tailwind classes
- Update navigation to point to:
  - "Purchase Tickets" → "/purchase" 
  - "Resale Marketplace" → "/marketplace"
  - "Organizer Panel" → "/organizer"
  
Do not change imports, function names, or any logic.
```

---

### STEP 2: Transform MintNFT.tsx → Purchase Ticket Interface

**File:** `projects/frontend/src/components/MintNFT.tsx`

**Action:** Open the file, copy its full contents, and use this prompt:

```
I'm building a TicketChain dApp on Algorand. Transform this MintNFT.tsx component into a "Purchase Ticket" interface.

The ticket purchase flow:
1. User sees event details (name, price, tickets available)
2. User clicks "Purchase Ticket" button
3. Contract method called: purchase_ticket(payment) → returns ticket NFT asset ID
4. Display success message with ticket number

Redesign with TailwindCSS:
- Header: "Purchase Event Ticket"
- Event info card showing:
  - Event Name (from contract state)
  - Ticket Price (in ALGO)
  - Tickets Remaining (total - sold)
  
- Purchase section:
  - Large "Purchase Ticket" button (primary color, disabled when sold out)
  - Loading spinner during transaction
  - Success message: "Ticket #X purchased successfully!"
  
- After purchase, show:
  - Ticket NFT Asset ID
  - Link to view on AlgoExplorer
  - QR code placeholder for ticket verification
  
Design: Clean, modern ticketing interface with Web3 aesthetic.

CRITICAL REQUIREMENTS:
- Replace IPFS/Pinata upload logic with ticket purchase transaction
- Keep wallet connection logic EXACTLY as-is
- Keep transaction handling structure intact
- Replace NFT minting call with: ticketContractClient.purchaseTicket({ payment: paymentTxn })
- ONLY change UI elements and styling
- Do NOT change function names, imports, or state variable names
```

---

### STEP 3: Transform Bank.tsx → Event Organizer Panel

**File:** `projects/frontend/src/components/Bank.tsx`

**Action:** Open the file, copy its full contents, and use this prompt:

```
I'm building a TicketChain dApp on Algorand. Transform this Bank.tsx component into an "Event Organizer Panel" for creating and managing ticketed events.

The organizer panel needs these sections:

**Section 1: Create Event** (replace deposit section)
- Inputs:
  - Event Name (string)
  - Total Capacity (number)
  - Ticket Price (in ALGO)
  - Max Resale Multiplier (percentage, default 200%)
  - Organizer Royalty (percentage, max 50%)
  
- Button: "Create Event" → calls create_event() contract method
- Show success message with app ID

**Section 2: Scan Tickets** (replace withdraw section)
- Input: Ticket Asset ID (number)
- Button: "Mark as Scanned" → calls mark_scanned(ticketId)
- Show scanning status and timestamp

**Section 3: Event Dashboard** (replace statements section)
- Display current event info:
  - Event Name
  - Total Tickets / Sold
  - Ticket Price
  - Revenue collected
  
- List of scanned tickets (box storage queries)
- Resale listings (box storage queries)

Redesign with TailwindCSS:
- Tab-based UI for "Create Event" / "Manage Event" / "Scan Tickets"
- Clean form inputs with validation states
- Professional dashboard with data tables
- Loading states and error messages

CRITICAL REQUIREMENTS:
- Keep ALL Indexer query logic structure intact
- Keep contract call patterns exactly as-is
- Replace Bank contract calls with TicketContract calls
- Maintain pagination and data fetching mechanisms
- ONLY change UI/styling and swap contract methods
- Do NOT change core logic, state management, or function signatures
```

---

### STEP 4: Transform Transact.tsx → Resale Marketplace

**File:** `projects/frontend/src/components/Transact.tsx`

**Action:** Open the file, copy its full contents, and use this prompt:

```
I'm building a TicketChain dApp on Algorand. Transform this Transact.tsx component into a "Ticket Resale Marketplace".

The resale marketplace has two modes:

**Mode 1: List My Ticket for Resale**
- Input: Ticket Asset ID (owned by user)
- Input: Asking Price (in ALGO, max enforced by contract)
- Button: "List for Resale" → calls list_for_resale(ticketId, price)
- Show validation: price must not exceed max_resale_price

**Mode 2: Buy Resale Ticket**
- Display available resale listings (from box storage)
- Each listing shows:
  - Ticket #
  - Seller address (truncated)
  - Asking price
  - "Buy Now" button → calls buy_resale_ticket(ticketAssetId, payment)
  
- Transaction includes payment + royalty split to organizer

Redesign with TailwindCSS:
- Toggle/tab interface for "List Ticket" vs "Browse Marketplace"
- Card-based marketplace grid for resale listings
- Clear CTAs and price displays
- Web3-themed design with hover effects

CRITICAL REQUIREMENTS:
- Keep ALL payment transaction logic intact
- Keep wallet and transaction handling as-is
- Replace ALGO send logic with resale contract calls
- Maintain transaction composition patterns
- ONLY change UI structure and styling
- Do NOT modify function signatures or imports
```

---

### STEP 5: Update Routes/Navigation

**File:** `projects/frontend/src/App.tsx` (or routing file)

**Prompt:**

```
Update my React Router configuration to map these components:

- "/" → Home (event landing page)
- "/purchase" → MintNFT component (renamed to "Purchase Ticket")
- "/organizer" → Bank component (renamed to "Event Organizer")
- "/marketplace" → Transact component (renamed to "Resale Marketplace")

Keep all other routing logic intact. Only update route paths and component names/labels.
```

---

## ✅ Implementation Checklist

Use this checklist as you work through each component:

- [ ] **Step 1:** Modified `Home.tsx` with event landing page UI
- [ ] **Step 2:** Transformed `MintNFT.tsx` → Purchase Ticket interface
- [ ] **Step 3:** Transformed `Bank.tsx` → Organizer Panel
- [ ] **Step 4:** Transformed `Transact.tsx` → Resale Marketplace
- [ ] **Step 5:** Updated routing in `App.tsx`
- [ ] **Step 6:** Updated contract client imports (use `TicketContract` from `/contracts`)
- [ ] **Step 7:** Tested wallet connection
- [ ] **Step 8:** Tested contract deployment
- [ ] **Step 9:** Tested ticket purchase flow
- [ ] **Step 10:** Tested resale functionality

---

## 🎨 Design Guidelines

When prompting AI for redesigns:

1. **Always specify:** "Keep ALL logic, imports, state, and handlers EXACTLY as-is"
2. **Always specify:** "ONLY change JSX structure and Tailwind classes"
3. **Mention:** Dark mode, Web3 aesthetic, purple/blue gradients
4. **Request:** Responsive design (mobile + desktop)
5. **Request:** Loading states, error states, success messages

---

## 🔧 Common Pitfalls to Avoid

❌ **DON'T:** Create new components from scratch  
✅ **DO:** Tweak existing ones

❌ **DON'T:** Change function names or imports  
✅ **DO:** Only modify UI elements

❌ **DON'T:** Rebuild transaction logic  
✅ **DO:** Swap contract method calls

❌ **DON'T:** Remove wallet connection code  
✅ **DO:** Keep all wallet logic intact

---

## 🚀 Quick Start Commands

```bash
# Navigate to frontend
cd projects/frontend

# Install dependencies (if not done)
pnpm install

# Start dev server
pnpm run dev

# In another terminal: deploy contract (if needed)
cd ../contracts
algokit deploy
```

---

## 📚 Reference: Contract Methods

Your `TicketContract` has these methods (use in component logic):

```typescript
// Event Creation (Organizer only)
await ticketClient.createEvent({ 
  name: "...", 
  capacity: 100, 
  price: 5000000, // microALGO
  maxResaleMultiplier: 200,
  royalty: 10 
});

// Purchase Ticket
const result = await ticketClient.purchaseTicket({ 
  payment: paymentTxn 
});
const ticketAssetId = result.return; // Returns asset ID

// List for Resale
await ticketClient.listForResale({ 
  ticketId: assetId, 
  askingPrice: 8000000 
});

// Buy Resale Ticket
await ticketClient.buyResaleTicket({ 
  ticketAssetId: assetId, 
  payment: paymentTxn 
});

// Mark Scanned (Organizer only)
await ticketClient.markScanned({ ticketId: assetId });

// Check if Scanned
const isScanned = await ticketClient.isScanned({ ticketId: assetId });

// Get Event Info
const eventInfo = await ticketClient.getEventInfo();
// Returns: { name, totalTickets, ticketsSold, price, maxResalePrice }
```

---

## 🎯 Success Criteria

You've successfully implemented TicketChain when:

1. ✅ Home page displays event information from contract
2. ✅ Users can purchase tickets (mints NFT)
3. ✅ Organizers can create events
4. ✅ Tickets can be listed and purchased on resale market
5. ✅ Organizers can scan/validate tickets
6. ✅ All UI is modern, responsive, and follows Web3 design
7. ✅ **NO new components created** - only existing ones modified

---

## 💡 Pro Tips

- Work on **ONE component at a time**
- Test each component after modification
- Use browser console to debug contract calls
- Check AlgoExplorer for transaction details
- Keep backup copies before major changes

---

## Need Help?

If AI changes too much logic:
1. Revert the file (`git checkout -- filename`)
2. Re-paste the original content
3. Refine your prompt to be more explicit about "ONLY UI changes"

Good luck building TicketChain! 🎫⛓️
