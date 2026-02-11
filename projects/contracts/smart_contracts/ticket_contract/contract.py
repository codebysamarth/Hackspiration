from algopy import *
from algopy.arc4 import abimethod, baremethod


@subroutine
def _digit_char(d: UInt64) -> Bytes:
    """Convert a single digit (0-9) to its ASCII byte."""
    if d == UInt64(1):
        return Bytes(b"1")
    if d == UInt64(2):
        return Bytes(b"2")
    if d == UInt64(3):
        return Bytes(b"3")
    if d == UInt64(4):
        return Bytes(b"4")
    if d == UInt64(5):
        return Bytes(b"5")
    if d == UInt64(6):
        return Bytes(b"6")
    if d == UInt64(7):
        return Bytes(b"7")
    if d == UInt64(8):
        return Bytes(b"8")
    if d == UInt64(9):
        return Bytes(b"9")
    return Bytes(b"0")


@subroutine
def _uint_to_ascii(value: UInt64) -> Bytes:
    """Convert a UInt64 to ASCII decimal string bytes."""
    if value == UInt64(0):
        return Bytes(b"0")
    result = Bytes(b"")
    n = value
    while n > UInt64(0):
        d = n % UInt64(10)
        n = n // UInt64(10)
        result = _digit_char(d) + result
    return result


class TicketContract(ARC4Contract):
    """
    Full-featured event ticketing smart contract on Algorand.
    
    Capabilities:
    - Ticket purchase with NFT minting & per-wallet limits (max 5)
    - Resale marketplace with price caps & organizer royalties
    - Refund mechanism (90% before deadline, 50% after deadline, 0% after event)
    - Event date tracking with automatic expiry enforcement
    - Revenue analytics (primary sales, resale royalties, refunds)
    - Ticket scanning with double-entry prevention
    - Organizer revenue withdrawal (post-event)
    """
    
    # ===== GLOBAL STATE =====
    event_name: String
    total_tickets: UInt64
    ticket_price: UInt64
    tickets_sold: UInt64
    max_resale_price: UInt64
    organizer_royalty: UInt64
    organizer_address: Account
    
    # Event date & location
    event_date: UInt64
    """Unix timestamp of the event"""
    refund_deadline: UInt64
    """Refund cutoff timestamp (auto-set to event_date - 24h)"""
    event_location: String
    """Venue / city"""
    
    # Revenue tracking
    total_primary_revenue: UInt64
    """Cumulative primary ticket sale revenue (microALGO)"""
    total_resale_revenue: UInt64
    """Cumulative organizer royalties from resales (microALGO)"""
    total_refunded: UInt64
    """Cumulative refund payouts (microALGO)"""
    
    
    def __init__(self) -> None:
        self.tickets_sold = UInt64(0)
        self.total_primary_revenue = UInt64(0)
        self.total_resale_revenue = UInt64(0)
        self.total_refunded = UInt64(0)
        self.event_date = UInt64(0)
        self.refund_deadline = UInt64(0)
        
        self.tickets_purchased = LocalState(UInt64, key="tickets_purchased", description="Tickets purchased by this user (max 5)")
        self.tickets_claimed = LocalState(UInt64, key="tickets_claimed", description="Tickets claimed/received by this user")
    
    
    @baremethod(allow_actions=["OptIn"])
    def opt_in(self) -> None:
        """Allow users to opt-in to the contract for local-state tracking."""
        self.tickets_purchased[Txn.sender] = UInt64(0)
        self.tickets_claimed[Txn.sender] = UInt64(0)
    
    
    # ────────────────────────────────────────────────────────────────
    # EVENT MANAGEMENT
    # ────────────────────────────────────────────────────────────────
    
    @abimethod
    def create_event(
        self,
        name: String,
        capacity: UInt64,
        price: UInt64,
        max_resale_multiplier: UInt64,
        royalty: UInt64,
        event_date: UInt64,
        location: String,
    ) -> None:
        """
        Configure event details.  Only callable by contract creator.

        Args:
            name:                   Event title
            capacity:               Total ticket supply
            price:                  Ticket price in microALGO
            max_resale_multiplier:  e.g. 150 → max resale = 1.5× price
            royalty:                Organizer royalty % on resales (0-50)
            event_date:             Unix timestamp of the event
            location:               Venue / city
        """
        assert Txn.sender == Global.creator_address, "Only contract creator can create event"
        assert capacity > 0, "Event capacity must be greater than 0"
        assert price > 0, "Ticket price must be greater than 0"
        assert max_resale_multiplier >= 100, "Max resale multiplier must be at least 100 (100%)"
        assert royalty <= 50, "Organizer royalty cannot exceed 50%"
        assert event_date > Global.latest_timestamp, "Event date must be in the future"
        
        self.event_name = name
        self.total_tickets = capacity
        self.ticket_price = price
        self.organizer_address = Txn.sender
        self.organizer_royalty = royalty
        self.max_resale_price = (price * max_resale_multiplier) // UInt64(100)
        self.event_date = event_date
        self.event_location = location
        
        # Auto-set refund deadline: 24 hours before event
        if event_date > UInt64(86400):
            self.refund_deadline = event_date - UInt64(86400)
        else:
            self.refund_deadline = UInt64(0)
    
    
    # ────────────────────────────────────────────────────────────────
    # TICKET PURCHASE & CLAIM
    # ────────────────────────────────────────────────────────────────
    
    @abimethod
    def purchase_ticket(self, payment: gtxn.PaymentTransaction) -> UInt64:
        """
        Purchase a ticket — mints an NFT held by the contract.
        Buyer must call receive_ticket() after opting in to the asset.
        Blocked after event date.
        """
        buyer = Txn.sender
        current_purchases = self.tickets_purchased[buyer]
        
        assert current_purchases < 5, "Purchase limit exceeded (max 5 per wallet)"
        assert payment.amount == self.ticket_price, "Incorrect payment amount"
        assert payment.receiver == Global.current_application_address, "Payment must be to contract"
        assert self.tickets_sold < self.total_tickets, "Sold out"
        
        # Block purchases after event date
        if self.event_date > UInt64(0):
            assert Global.latest_timestamp < self.event_date, "Event has already occurred - ticket sales closed"
        
        self.tickets_sold += UInt64(1)
        ticket_number = self.tickets_sold
        self.tickets_purchased[buyer] = current_purchases + UInt64(1)
        
        # Track revenue
        self.total_primary_revenue += payment.amount
        
        ticket_num_str = _uint_to_ascii(ticket_number)
        asset_txn = itxn.AssetConfig(
            total=UInt64(1),
            decimals=UInt64(0),
            asset_name=self.event_name.bytes + b" #" + ticket_num_str,
            unit_name=b"TIX",
            url=b"ticketchain://ticket/" + ticket_num_str,
            manager=Global.current_application_address,
            reserve=Global.current_application_address,
            freeze=Global.current_application_address,
            clawback=Global.current_application_address,
            fee=UInt64(0)
        ).submit()
        
        return asset_txn.created_asset.id
    
    
    @abimethod
    def receive_ticket(self, asset_id: UInt64) -> None:
        """Claim a purchased ticket NFT after opting in to the asset."""
        buyer = Txn.sender
        purchased = self.tickets_purchased[buyer]
        claimed = self.tickets_claimed[buyer]
        assert claimed < purchased, "No unclaimed tickets"
        
        self.tickets_claimed[buyer] = claimed + UInt64(1)
        
        itxn.AssetTransfer(
            xfer_asset=asset_id,
            asset_receiver=buyer,
            asset_amount=UInt64(1),
            fee=UInt64(0)
        ).submit()
    
    
    # ────────────────────────────────────────────────────────────────
    # REFUND MECHANISM
    # ────────────────────────────────────────────────────────────────
    
    @abimethod
    def request_refund(self, ticket_asset_id: UInt64) -> UInt64:
        """
        Request a refund for a purchased ticket.

        Refund tiers:
        - Before refund_deadline (>24 h before event): 90 % refund
        - Between refund_deadline and event_date:      50 % refund
        - After event_date:                            0 % (blocked)

        The contract claws back the NFT and sends ALGO to the buyer.
        Returns: refund amount in microALGO.
        """
        buyer = Txn.sender
        now = Global.latest_timestamp
        
        # Must be before event
        assert self.event_date > UInt64(0), "No event date set"
        assert now < self.event_date, "Event already occurred - no refunds"
        
        # Ticket must not be scanned
        scanned_key = Bytes(b"scanned_") + op.itob(ticket_asset_id)
        scanned_len, _s = op.Box.length(scanned_key)
        assert scanned_len == 0, "Cannot refund a scanned ticket"
        
        # Ticket must not be listed for resale
        listing_key = Bytes(b"listing_") + op.itob(ticket_asset_id)
        listing_len, _l = op.Box.length(listing_key)
        assert listing_len == 0, "Remove resale listing before requesting refund"
        
        # Calculate refund amount
        price = self.ticket_price
        refund_amount = UInt64(0)
        
        if now < self.refund_deadline:
            # Early refund: 90 %
            refund_amount = (price * UInt64(90)) // UInt64(100)
        else:
            # Late refund (within 24 h of event): 50 %
            refund_amount = (price * UInt64(50)) // UInt64(100)
        
        assert refund_amount > UInt64(0), "No refund available"
        
        # Clawback NFT from buyer → contract
        itxn.AssetTransfer(
            xfer_asset=ticket_asset_id,
            asset_sender=buyer,
            asset_receiver=Global.current_application_address,
            asset_amount=UInt64(1),
            fee=UInt64(0)
        ).submit()
        
        # Send refund
        itxn.Payment(
            receiver=buyer,
            amount=refund_amount,
            fee=UInt64(0)
        ).submit()
        
        # Update counters
        self.total_refunded += refund_amount
        self.tickets_sold -= UInt64(1)
        
        current_purchases = self.tickets_purchased[buyer]
        if current_purchases > UInt64(0):
            self.tickets_purchased[buyer] = current_purchases - UInt64(1)
        current_claimed = self.tickets_claimed[buyer]
        if current_claimed > UInt64(0):
            self.tickets_claimed[buyer] = current_claimed - UInt64(1)
        
        return refund_amount
    
    
    # ────────────────────────────────────────────────────────────────
    # RESALE MARKETPLACE
    # ────────────────────────────────────────────────────────────────
    
    @abimethod
    def list_for_resale(self, ticket_id: UInt64, asking_price: UInt64) -> None:
        """
        List a ticket for resale.  Blocked after event date or if scanned.
        """
        scanned_key = Bytes(b"scanned_") + op.itob(ticket_id)
        scanned_len, _s = op.Box.length(scanned_key)
        assert scanned_len == 0, "Cannot resell a scanned ticket"
        
        if self.event_date > UInt64(0):
            assert Global.latest_timestamp < self.event_date, "Event has already occurred - cannot list"
        
        assert asking_price <= self.max_resale_price, "Price exceeds maximum resale cap"
        
        box_key = Bytes(b"listing_") + op.itob(ticket_id)
        seller = Txn.sender
        timestamp = Global.latest_timestamp
        
        box_value = (
            op.itob(asking_price) +
            seller.bytes +
            op.itob(timestamp)
        )
        
        op.Box.create(box_key, UInt64(48))
        op.Box.put(box_key, box_value)
    
    
    @abimethod
    def buy_resale_ticket(
        self,
        ticket_asset_id: UInt64,
        payment: gtxn.PaymentTransaction,
    ) -> None:
        """Buy from resale.  Blocked after event date."""
        if self.event_date > UInt64(0):
            assert Global.latest_timestamp < self.event_date, "Event has already occurred"
        
        box_key = Bytes(b"listing_") + op.itob(ticket_asset_id)
        listing_data, _exists = op.Box.get(box_key)
        
        asking_price = op.btoi(op.extract(listing_data, UInt64(0), UInt64(8)))
        seller_address = Account(op.extract(listing_data, UInt64(8), UInt64(32)))
        
        assert payment.amount == asking_price, "Wrong amount"
        assert payment.receiver == Global.current_application_address, "Wrong receiver"
        
        organizer_cut = (asking_price * self.organizer_royalty) // UInt64(100)
        seller_cut = asking_price - organizer_cut
        
        itxn.Payment(
            receiver=seller_address,
            amount=seller_cut,
            fee=UInt64(0)
        ).submit()
        
        itxn.Payment(
            receiver=self.organizer_address,
            amount=organizer_cut,
            fee=UInt64(0)
        ).submit()
        
        # Track resale revenue
        self.total_resale_revenue += organizer_cut
        
        buyer = Txn.sender
        
        itxn.AssetTransfer(
            xfer_asset=ticket_asset_id,
            asset_sender=seller_address,
            asset_receiver=buyer,
            asset_amount=UInt64(1),
            fee=UInt64(0)
        ).submit()
        
        op.Box.delete(box_key)
    
    
    # ────────────────────────────────────────────────────────────────
    # SCANNING
    # ────────────────────────────────────────────────────────────────
    
    @abimethod
    def mark_scanned(self, ticket_id: UInt64) -> None:
        """Mark a ticket as scanned at event entrance.  Organizer only."""
        assert Txn.sender == self.organizer_address, "Only event organizer can scan tickets"
        
        box_key = Bytes(b"scanned_") + op.itob(ticket_id)
        existing_length, _exists = op.Box.length(box_key)
        assert existing_length == 0, "Ticket already scanned"
        
        scan_timestamp = Global.latest_timestamp
        op.Box.create(box_key, UInt64(8))
        op.Box.put(box_key, op.itob(scan_timestamp))
    
    
    @abimethod(readonly=True)
    def is_scanned(self, ticket_id: UInt64) -> bool:
        """Check if a ticket has been scanned."""
        box_key = Bytes(b"scanned_") + op.itob(ticket_id)
        box_length, _exists = op.Box.length(box_key)
        return box_length > 0
    
    
    # ────────────────────────────────────────────────────────────────
    # REVENUE & WITHDRAWAL
    # ────────────────────────────────────────────────────────────────
    
    @abimethod
    def withdraw_revenue(self) -> UInt64:
        """
        Organizer withdraws available revenue **after** event date.
        Leaves minimum balance for MBR.
        Returns: withdrawn amount in microALGO.
        """
        assert Txn.sender == self.organizer_address, "Only organizer can withdraw"
        assert self.event_date > UInt64(0), "No event configured"
        assert Global.latest_timestamp >= self.event_date, "Cannot withdraw before event date"
        
        min_balance = Global.current_application_address.min_balance + UInt64(100_000)
        app_balance = Global.current_application_address.balance
        assert app_balance > min_balance, "Insufficient balance to withdraw"
        
        withdraw_amount = app_balance - min_balance
        
        itxn.Payment(
            receiver=self.organizer_address,
            amount=withdraw_amount,
            fee=UInt64(0)
        ).submit()
        
        return withdraw_amount
    
    
    # ────────────────────────────────────────────────────────────────
    # READ-ONLY QUERIES
    # ────────────────────────────────────────────────────────────────
    
    @abimethod(readonly=True)
    def get_event_info(self) -> tuple[String, UInt64, UInt64, UInt64, UInt64, UInt64, String]:
        """
        Returns (name, total_tickets, tickets_sold, ticket_price,
                 max_resale_price, event_date, location).
        """
        return (
            self.event_name,
            self.total_tickets,
            self.tickets_sold,
            self.ticket_price,
            self.max_resale_price,
            self.event_date,
            self.event_location,
        )
    
    
    @abimethod(readonly=True)
    def get_revenue_info(self) -> tuple[UInt64, UInt64, UInt64, UInt64]:
        """
        Revenue analytics for organizer dashboard.
        Returns (primary_revenue, resale_revenue, total_refunded, app_balance).
        """
        return (
            self.total_primary_revenue,
            self.total_resale_revenue,
            self.total_refunded,
            Global.current_application_address.balance,
        )