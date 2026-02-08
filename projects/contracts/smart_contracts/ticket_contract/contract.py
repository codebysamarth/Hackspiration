from algopy import *
from algopy.arc4 import abimethod


class TicketContract(ARC4Contract):
    """
    An event ticketing smart contract with purchase, transfer, and resale capabilities.
    
    Manages ticket sales for events with price controls, royalties for organizers,
    and per-user purchase limits.
    """
    
    # ===== GLOBAL STATE (Event-level data) =====
    event_name: String
    """Name of the event"""
    
    total_tickets: UInt64
    """Total ticket capacity for the event"""
    
    ticket_price: UInt64
    """Price per ticket in microALGO"""
    
    tickets_sold: UInt64
    """Number of tickets sold so far"""
    
    max_resale_price: UInt64
    """Maximum allowed resale price in microALGO"""
    
    organizer_royalty: UInt64
    """Percentage royalty for organizer on resales (e.g., 10 for 10%)"""
    
    organizer_address: Account
    """Wallet address of the event organizer"""
    
    
    def __init__(self) -> None:
        """
        Initialize the ticket contract.
        Sets tickets_sold to 0 on creation.
        """
        self.tickets_sold = UInt64(0)
        
        # Local state: tickets_purchased per user (max 5)
        self.tickets_purchased = LocalState(UInt64, key="tickets_purchased", description="Number of tickets purchased by this user (max 5)")
    
    
    @abimethod
    def create_event(
        self,
        name: String,
        capacity: UInt64,
        price: UInt64,
        max_resale_multiplier: UInt64,
        royalty: UInt64
    ) -> None:
        """
        Configure event details. Only callable by contract creator.
        """
        assert Txn.sender == Global.creator_address, "Only contract creator can create event"
        assert capacity > 0, "Event capacity must be greater than 0"
        assert price > 0, "Ticket price must be greater than 0"
        assert max_resale_multiplier >= 100, "Max resale multiplier must be at least 100 (100%)"
        assert royalty <= 50, "Organizer royalty cannot exceed 50%"
        
        self.event_name = name
        self.total_tickets = capacity
        self.ticket_price = price
        self.organizer_address = Txn.sender
        self.organizer_royalty = royalty
        self.max_resale_price = (price * max_resale_multiplier) // UInt64(100)
    
    
    @abimethod
    def purchase_ticket(self, payment: gtxn.PaymentTransaction) -> UInt64:
        """
        Purchase a ticket - mints NFT and transfers to buyer.
        Returns: Asset ID of the minted ticket NFT
        """
        buyer = Txn.sender
        current_purchases = self.tickets_purchased[buyer]
        
        assert current_purchases < 5, "Purchase limit exceeded"
        assert payment.amount == self.ticket_price, "Incorrect payment amount"
        assert payment.receiver == Global.current_application_address, "Payment must be to contract"
        assert self.tickets_sold < self.total_tickets, "Sold out"
        
        self.tickets_sold += UInt64(1)
        ticket_number = self.tickets_sold
        self.tickets_purchased[buyer] = current_purchases + UInt64(1)
        
        # FIXED: Mint NFT with bytes concatenation
        asset_txn = itxn.AssetConfig(
            total=UInt64(1),
            decimals=UInt64(0),
            asset_name=self.event_name.bytes + b" #" + op.itob(ticket_number),  # FIXED
            unit_name=b"TIX",
            url=b"ticketchain://ticket/" + op.itob(ticket_number),  # FIXED
            manager=Global.current_application_address,
            reserve=Global.current_application_address,
            freeze=Global.current_application_address,
            clawback=Global.current_application_address,
            fee=UInt64(0)
        ).submit()
        
        # Get the created asset ID from the inner transaction
        ticket_asset_id = asset_txn.created_asset.id
        
        # Opt-in buyer to the asset (required to receive NFT)
        itxn.AssetTransfer(
            xfer_asset=ticket_asset_id,
            asset_receiver=buyer,
            asset_amount=UInt64(0),  # 0 amount = opt-in
            fee=UInt64(0)
        ).submit()
        
        # Transfer the NFT to buyer
        itxn.AssetTransfer(
            xfer_asset=ticket_asset_id,
            asset_receiver=buyer,
            asset_amount=UInt64(1),
            fee=UInt64(0)
        ).submit()
        
        return ticket_asset_id
    
    
    @abimethod
    def list_for_resale(
        self,
        ticket_id: UInt64,
        asking_price: UInt64
    ) -> None:
        """
        List a ticket for resale on the secondary market.
        """
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
        payment: gtxn.PaymentTransaction
    ) -> None:
        """
        Buy from resale - transfers NFT to buyer.
        """
        box_key = Bytes(b"listing_") + op.itob(ticket_asset_id)
        
        # FIXED: Box.get returns tuple
        listing_data, _exists = op.Box.get(box_key)  # FIXED
        
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
        
        buyer = Txn.sender
        
        # Opt-in buyer to the asset if not already opted in
        itxn.AssetTransfer(
            xfer_asset=ticket_asset_id,
            asset_receiver=buyer,
            asset_amount=UInt64(0),  # 0 amount = opt-in
            fee=UInt64(0)
        ).submit()
        
        # Transfer NFT from seller to buyer (using clawback since contract is manager)
        itxn.AssetTransfer(
            xfer_asset=ticket_asset_id,
            asset_sender=seller_address,
            asset_receiver=buyer,
            asset_amount=UInt64(1),
            fee=UInt64(0)
        ).submit()
        
        op.Box.delete(box_key)
    
    
    @abimethod
    def mark_scanned(self, ticket_id: UInt64) -> None:
        """
        Mark a ticket as scanned at event entrance.
        """
        assert Txn.sender == self.organizer_address, "Only event organizer can scan tickets"
        
        box_key = Bytes(b"scanned_") + op.itob(ticket_id)
        
        # FIXED: Box.length returns tuple
        existing_length, _exists = op.Box.length(box_key)  # FIXED
        assert existing_length == 0, "Ticket already scanned"
        
        scan_timestamp = Global.latest_timestamp
        op.Box.create(box_key, UInt64(8))
        op.Box.put(box_key, op.itob(scan_timestamp))
    
    
    @abimethod(readonly=True)
    def is_scanned(self, ticket_id: UInt64) -> bool:
        """
        Check if a ticket has been scanned.
        """
        box_key = Bytes(b"scanned_") + op.itob(ticket_id)
        
        # FIXED: Box.length returns tuple
        box_length, _exists = op.Box.length(box_key)  # FIXED
        
        return box_length > 0
    
    
    @abimethod(readonly=True)
    def get_event_info(self) -> tuple[String, UInt64, UInt64, UInt64, UInt64]:
        """
        Retrieve event information for frontend display.
        """
        return (
            self.event_name,
            self.total_tickets,
            self.tickets_sold,
            self.ticket_price,
            self.max_resale_price
        )