import { algo, AlgorandClient } from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import { useState, useEffect, useMemo } from 'react'
import algosdk from 'algosdk'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import { getUserTickets, verifyTicketOwnership, TicketAsset } from '../utils/ticketAssets'
import { TicketContractFactory } from '../contracts/TicketContract.js'
import { HARDCODED_APP_ID, SINGLE_ORGANIZER_MODE } from '../config/organizerConfig'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Card, CardContent } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import {
  ShoppingCart, Tag, Ticket, RefreshCw, AlertTriangle, CheckCircle2,
  ExternalLink, DollarSign, Info,
} from 'lucide-react'

// Get stored app ID from localStorage or use hardcoded in single-organizer mode
const getStoredAppId = (): bigint => {
  if (SINGLE_ORGANIZER_MODE && HARDCODED_APP_ID > BigInt(0)) {
    return HARDCODED_APP_ID
  }
  const stored = localStorage.getItem('TICKET_CONTRACT_APP_ID')
  return stored ? BigInt(stored) : BigInt(0)
}

type ResaleListing = {
  ticketAssetId: number
  seller: string
  askingPrice: number
  listingId: string
}

interface TransactInterface {
  openModal: boolean
  setModalState: (value: boolean) => void
}

const Transact = ({ openModal, setModalState }: TransactInterface) => {
  const [loading, setLoading] = useState<boolean>(false)
  const [mode, setMode] = useState<'list' | 'buy'>('buy')
  
  // Dynamic app ID from localStorage
  const [appId, setAppId] = useState(getStoredAppId())
  
  // List ticket state
  const [ticketAssetId, setTicketAssetId] = useState<string>('')
  const [askingPrice, setAskingPrice] = useState<string>('')
  const [maxResalePrice, setMaxResalePrice] = useState<number>(0)
  const [eventDate, setEventDate] = useState<number>(0)
  const [isExpired, setIsExpired] = useState(false)
  
  // WHY: Track user's owned tickets for easy selection when listing
  // REASON: Users shouldn't need to manually find asset IDs - we show their tickets
  const [myTickets, setMyTickets] = useState<TicketAsset[]>([])
  
  // Marketplace state
  const [resaleListings, setResaleListings] = useState<ResaleListing[]>([])
  const [selectedListing, setSelectedListing] = useState<ResaleListing | null>(null)

  const algorand = useMemo(() => {
    const algodConfig = getAlgodConfigFromViteEnvironment()
    const indexerConfig = getIndexerConfigFromViteEnvironment()
    return AlgorandClient.fromConfig({ algodConfig, indexerConfig })
  }, [])

  // Listen for app ID changes in localStorage (only in multi-organizer mode)
  useEffect(() => {
    if (SINGLE_ORGANIZER_MODE) return // No dynamic switching
    
    const sync = () => {
      const newId = getStoredAppId()
      if (newId !== appId && newId > BigInt(0)) setAppId(newId)
    }
    window.addEventListener('storage', sync)
    const interval = setInterval(sync, 2000)
    return () => { window.removeEventListener('storage', sync); clearInterval(interval) }
  }, [appId])

  const { enqueueSnackbar } = useSnackbar()

  const { transactionSigner, activeAddress } = useWallet()

  // Fetch max resale price from contract global state when modal opens
  useEffect(() => {
    const fetchMaxResalePrice = async () => {
      if (appId === BigInt(0)) return
      try {
        const factory = new TicketContractFactory({ algorand })
        const client = factory.getAppClientById({ appId })
        const gs = await client.state.global.getAll()
        setMaxResalePrice(Number(gs.maxResalePrice ?? 0) / 1_000_000)
        setEventDate(Number(gs.eventDate ?? 0))
        setIsExpired(Number(gs.eventDate ?? 0) > 0 && Date.now() / 1000 > Number(gs.eventDate ?? 0))
      } catch (e) {
        console.error('Failed to fetch max resale price:', e)
      }
    }
    if (openModal) void fetchMaxResalePrice()
  }, [openModal, appId, algorand])

  // Fetch resale listings on modal open
  useEffect(() => {
    if (openModal && mode === 'buy') {
      void fetchResaleListings()
    }
    
    // WHY: Fetch user's tickets when switching to list mode
    // REASON: Show available tickets for resale selection
    if (openModal && mode === 'list' && activeAddress) {
      void fetchMyTickets()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openModal, mode, activeAddress])

  const fetchMyTickets = async () => {
    if (!activeAddress) return
    
    try {
      const tickets = await getUserTickets(activeAddress, algorand)
      setMyTickets(tickets)
    } catch (error) {
      console.error('Failed to fetch tickets:', error)
    }
  }

  const fetchResaleListings = async () => {
    if (appId === BigInt(0)) return
    try {
      // Query contract box storage for resale listings
      const algod = algorand.client.algod
      const boxesResponse = await algod.getApplicationBoxes(Number(appId)).do()
      
      const listings: ResaleListing[] = []
      
      // Each box represents a resale listing
      for (const box of boxesResponse.boxes) {
        try {
          const boxName = box.name
          const boxData = await algod.getApplicationBoxByName(Number(appId), boxName).do()
          
          // Parse box data (contract format: asking_price(8) + seller(32) + timestamp(8))
          // Box key format: "listing_" + itob(ticket_asset_id)
          const value = boxData.value as Uint8Array
          if (value.length >= 48) {
            const askingPrice = Number(new DataView(value.buffer, value.byteOffset, 8).getBigUint64(0, false)) / 1_000_000
            const seller = algosdk.encodeAddress(value.slice(8, 40))
            // timestamp at bytes 40-48 (not needed for display)

            // Extract ticket asset ID from box key: "listing_" (8 bytes) + itob(id) (8 bytes)
            const boxNameBytes = new Uint8Array(boxName)
            let ticketAssetId = 0
            if (boxNameBytes.length >= 16) {
              ticketAssetId = Number(new DataView(boxNameBytes.buffer, boxNameBytes.byteOffset + 8, 8).getBigUint64(0, false))
            }
            
            // Skip scanned_ boxes (only process listing_ boxes)
            const prefix = String.fromCharCode(...boxNameBytes.slice(0, 8))
            if (!prefix.startsWith('listing_')) continue

            listings.push({
              ticketAssetId,
              seller,
              askingPrice,
              listingId: Buffer.from(boxName).toString('hex'),
            })
          }
        } catch (err) {
          console.error('Error parsing box:', err)
        }
      }
      
      setResaleListings(listings)
    } catch (e) {
      console.error('Error loading resale listings:', e)
      // Empty listings if no boxes exist yet
      setResaleListings([])
    }
  }

  const handleListTicket = async () => {
    setLoading(true)

    if (!transactionSigner || !activeAddress) {
      enqueueSnackbar('Please connect wallet first', { variant: 'warning' })
      setLoading(false)
      return
    }

    const assetId = Number(ticketAssetId)
    const price = Number(askingPrice)

    if (!assetId || assetId <= 0) {
      enqueueSnackbar('Enter valid ticket asset ID', { variant: 'error' })
      setLoading(false)
      return
    }

    if (!price || price <= 0) {
      enqueueSnackbar('Enter valid asking price', { variant: 'error' })
      setLoading(false)
      return
    }

    if (isExpired) {
      enqueueSnackbar('Event has ended — resale listing is closed', { variant: 'error' })
      setLoading(false)
      return
    }

    if (price > maxResalePrice) {
      enqueueSnackbar(`Price exceeds maximum resale price of ${maxResalePrice} ALGO`, { variant: 'error' })
      setLoading(false)
      return
    }

    try {
      // WHY: Verify user actually owns the ticket NFT before listing
      const ownsTicket = await verifyTicketOwnership(activeAddress, assetId, algorand)
      if (!ownsTicket) {
        enqueueSnackbar('You do not own this ticket NFT!', { variant: 'error' })
        setLoading(false)
        return
      }
      
      const factory = new TicketContractFactory({ algorand })
      const client = factory.getAppClientById({ appId })

      // Check if ticket has been scanned — scanned tickets cannot be resold
      try {
        const scannedBoxKey = new Uint8Array(16)
        const scannedEnc = new TextEncoder()
        scannedBoxKey.set(scannedEnc.encode('scanned_'), 0)
        new DataView(scannedBoxKey.buffer, 8, 8).setBigUint64(0, BigInt(assetId), false)

        const scanCheck = await client.send.isScanned({
          args: { ticketId: BigInt(assetId) },
          sender: activeAddress,
          signer: transactionSigner,
          boxReferences: [{ appId: BigInt(Number(appId)), name: scannedBoxKey }],
        })
        if (scanCheck.return) {
          enqueueSnackbar('This ticket has been scanned and cannot be resold!', { variant: 'error' })
          setLoading(false)
          return
        }
      } catch (e) {
        // is_scanned might fail if box doesn't exist — means not scanned, proceed
        console.log('Scan check info:', e)
      }
      
      enqueueSnackbar('Listing ticket for resale...', { variant: 'info' })
      
      // Box key = "listing_" + itob(assetId)
      const boxKey = new Uint8Array(16)
      const encoder = new TextEncoder()
      boxKey.set(encoder.encode('listing_'), 0)
      const dv = new DataView(boxKey.buffer, 8, 8)
      dv.setBigUint64(0, BigInt(assetId), false)

      // Also need scanned_ box reference since contract checks if ticket is scanned
      const scannedRef = new Uint8Array(16)
      scannedRef.set(encoder.encode('scanned_'), 0)
      new DataView(scannedRef.buffer, 8, 8).setBigUint64(0, BigInt(assetId), false)

      const result = await client.send.listForResale({
        args: {
          ticketId: BigInt(assetId),
          askingPrice: BigInt(Math.round(price * 1_000_000)), // Convert ALGO to microAlgos
        },
        sender: activeAddress,
        signer: transactionSigner,
        boxReferences: [
          { appId: BigInt(Number(appId)), name: boxKey },
          { appId: BigInt(Number(appId)), name: scannedRef },
        ],
        extraFee: algo(0.001), // MBR for box creation
      })
      
      enqueueSnackbar(`Ticket #${assetId} listed for ${price} ALGO! Txn: ${result.txIds[0]}`, { variant: 'success' })
      setTicketAssetId('')
      setAskingPrice('')
      
      // Switch to marketplace view to see listing
      setMode('buy')
      void fetchResaleListings()
    } catch (e) {
      enqueueSnackbar(`Failed to list ticket: ${(e as Error).message}`, { variant: 'error' })
    }

    setLoading(false)
  }

  const handleBuyResaleTicket = async (listing: ResaleListing) => {
    setLoading(true)
    setSelectedListing(listing)

    if (!transactionSigner || !activeAddress) {
      enqueueSnackbar('Please connect wallet first', { variant: 'warning' })
      setLoading(false)
      return
    }

    try {
      enqueueSnackbar('Step 1/2: Opting in to ticket asset...', { variant: 'info' })
      
      // Step 1: Buyer opts-in to the ticket asset
      try {
        await algorand.send.assetOptIn({
          sender: activeAddress,
          signer: transactionSigner,
          assetId: BigInt(listing.ticketAssetId),
        })
      } catch (e: any) {
        console.log('Asset opt-in info:', e?.message || 'May already be opted in')
      }

      enqueueSnackbar('Step 2/2: Purchasing resale ticket...', { variant: 'info' })
      
      // Step 2: Create payment + call buy_resale_ticket
      const appAddress = algosdk.getApplicationAddress(Number(appId))
      const paymentTxn = await algorand.createTransaction.payment({
        sender: activeAddress,
        receiver: appAddress,
        amount: algo(listing.askingPrice),
        extraFee: algo(0.003), // Extra for 3 inner txns (pay seller + pay organizer + asset transfer)
      })
      
      // Box key for the listing
      const boxKey = new Uint8Array(16)
      const enc = new TextEncoder()
      boxKey.set(enc.encode('listing_'), 0)
      const bv = new DataView(boxKey.buffer, 8, 8)
      bv.setBigUint64(0, BigInt(listing.ticketAssetId), false)

      const factory = new TicketContractFactory({ algorand })
      const client = factory.getAppClientById({ appId })
      
      const result = await client.send.buyResaleTicket({
        args: {
          ticketAssetId: BigInt(listing.ticketAssetId),
          payment: paymentTxn,
        },
        sender: activeAddress,
        signer: transactionSigner,
        boxReferences: [{ appId: BigInt(Number(appId)), name: boxKey }],
      })
      
      enqueueSnackbar(`Successfully purchased Ticket #${listing.ticketAssetId} for ${listing.askingPrice} ALGO! Txn: ${result.txIds[0]}`, { variant: 'success' })
      
      // Refresh listings
      void fetchResaleListings()
    } catch (e) {
      enqueueSnackbar(`Purchase failed: ${(e as Error).message}`, { variant: 'error' })
    } finally {
      setLoading(false)
      setSelectedListing(null)
    }
  }

  return (
    <Dialog open={openModal} onOpenChange={(open) => { if (!open) setModalState(false) }}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Resale Marketplace
          </DialogTitle>
          <DialogDescription>Buy and sell tickets with price controls</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
          {/* Mode Toggle */}
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'list' | 'buy')}>
            <TabsList className="w-full">
              <TabsTrigger value="buy" className="flex-1"><ShoppingCart className="h-3.5 w-3.5 mr-1.5" />Browse Marketplace</TabsTrigger>
              <TabsTrigger value="list" className="flex-1"><Tag className="h-3.5 w-3.5 mr-1.5" />List My Ticket</TabsTrigger>
            </TabsList>

            {/* LIST TICKET MODE */}
            <TabsContent value="list" className="space-y-5 mt-5">
              <h4 className="text-lg font-semibold flex items-center gap-2"><Tag className="h-4 w-4 text-primary" />List Your Ticket for Resale</h4>
              
              {isExpired && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-sm text-destructive flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Event has ended — listing is closed.</p>
                </div>
              )}
              
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm flex items-center gap-2"><Info className="h-4 w-4 text-primary" />Max resale price: <span className="font-semibold">{maxResalePrice} ALGO</span></p>
              </div>

              {/* User's owned tickets */}
              {myTickets.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Select from your tickets:</p>
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                    {myTickets.map((ticket) => (
                      <button
                        key={ticket.assetId}
                        type="button"
                        className={`p-3 rounded-lg border text-left transition-all duration-200 ${
                          ticketAssetId === ticket.assetId.toString()
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                            : 'border-border hover:border-primary/40 hover:bg-muted/50'
                        }`}
                        onClick={() => setTicketAssetId(ticket.assetId.toString())}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium">{ticket.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">ID: {ticket.assetId}</p>
                          </div>
                          {ticketAssetId === ticket.assetId.toString() && (
                            <Badge variant="default" className="text-[10px]">Selected</Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <Label htmlFor="listAssetId">Ticket Asset ID</Label>
                  <Input id="listAssetId" className="mt-1.5" type="number" placeholder="e.g., 1023456"
                    value={ticketAssetId} onChange={(e) => setTicketAssetId(e.target.value)} />
                  <p className="text-xs text-muted-foreground mt-1">The NFT asset ID of your ticket</p>
                </div>

                <div>
                  <Label htmlFor="askingPrice">Asking Price (ALGO)</Label>
                  <Input id="askingPrice" className="mt-1.5" type="number" placeholder="e.g., 65" step="0.01"
                    value={askingPrice} onChange={(e) => setAskingPrice(e.target.value)} />
                  <p className="text-xs text-muted-foreground mt-1">Maximum allowed: {maxResalePrice} ALGO</p>
                </div>

                {/* Validation */}
                {askingPrice && Number(askingPrice) > maxResalePrice && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Price exceeds maximum resale limit of {maxResalePrice} ALGO</p>
                  </div>
                )}
                {askingPrice && Number(askingPrice) <= maxResalePrice && Number(askingPrice) > 0 && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                    <p className="text-sm text-emerald-700 flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />Valid price — ready to list</p>
                  </div>
                )}

                <Button className="w-full h-12 text-base"
                  disabled={loading || !ticketAssetId || !askingPrice || Number(askingPrice) > maxResalePrice || Number(askingPrice) <= 0}
                  loading={loading}
                  onClick={(e) => { e.preventDefault(); void handleListTicket() }}>
                  {!loading && 'List Ticket for Resale'}
                </Button>
              </div>
            </TabsContent>

            {/* BUY MODE - MARKETPLACE */}
            <TabsContent value="buy" className="space-y-5 mt-5">
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-semibold flex items-center gap-2"><Ticket className="h-4 w-4 text-primary" />Available Tickets</h4>
                <Button variant="ghost" size="sm" onClick={(e) => { e.preventDefault(); void fetchResaleListings() }}>
                  <RefreshCw className="h-3.5 w-3.5" />Refresh
                </Button>
              </div>

              {resaleListings.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Ticket className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="font-semibold mb-1">No Tickets Available</p>
                  <p className="text-sm text-muted-foreground">Check back later or list your own ticket</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {resaleListings.map((listing) => (
                    <Card key={listing.listingId} className="hover:shadow-lg transition-all duration-200">
                      <CardContent className="pt-5">
                        <div className="flex items-center justify-between mb-3">
                          <Badge variant="secondary">Ticket #{listing.ticketAssetId}</Badge>
                        </div>

                        <div className="mb-4">
                          <p className="text-xs text-muted-foreground mb-1">Asking Price</p>
                          <p className="text-2xl font-bold">{listing.askingPrice} <span className="text-sm font-normal text-muted-foreground">ALGO</span></p>
                        </div>

                        <div className="mb-4">
                          <p className="text-xs text-muted-foreground mb-1">Seller</p>
                          <p className="font-mono text-xs text-muted-foreground">{listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}</p>
                        </div>

                        <Button className="w-full" variant="success"
                          disabled={loading}
                          loading={loading && selectedListing?.listingId === listing.listingId}
                          onClick={(e) => { e.preventDefault(); void handleBuyResaleTicket(listing) }}>
                          {!(loading && selectedListing?.listingId === listing.listingId) && <><DollarSign className="h-3.5 w-3.5" />Buy Now</>}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-xs flex items-center gap-1.5"><Info className="h-3.5 w-3.5 text-primary" />Purchases include organizer royalty. Ticket ownership transfers instantly on-chain.</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => setModalState(false)} disabled={loading}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default Transact
