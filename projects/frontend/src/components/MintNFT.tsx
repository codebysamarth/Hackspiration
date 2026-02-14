import { algo, AlgorandClient } from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import { useMemo, useState, useEffect } from 'react'
import algosdk from 'algosdk'
import { QRCodeSVG } from 'qrcode.react'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import { getUserTickets, TicketAsset } from '../utils/ticketAssets'
import { TicketContractFactory } from '../contracts/TicketContract'
import { ORGANIZER_ADDRESS, HARDCODED_APP_ID, SINGLE_ORGANIZER_MODE } from '../config/organizerConfig'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Separator } from './ui/separator'
import {
  Ticket, ExternalLink, QrCode, AlertTriangle, CheckCircle2, Info, RotateCcw, Calendar, MapPin, DollarSign, Users, ShoppingCart
} from 'lucide-react'

// Get App ID: hardcoded in single-organizer mode, otherwise from localStorage
const getAppId = (): bigint => {
  if (SINGLE_ORGANIZER_MODE && HARDCODED_APP_ID > BigInt(0)) {
    return HARDCODED_APP_ID
  }
  const stored = localStorage.getItem('TICKET_CONTRACT_APP_ID')
  return stored ? BigInt(stored) : BigInt(0)
}

interface MintNFTProps {
  openModal: boolean
  closeModal: () => void
}

const MintNFT = ({ openModal, closeModal }: MintNFTProps) => {
  const { activeAddress, transactionSigner } = useWallet()
  const { enqueueSnackbar } = useSnackbar()
  
  // App ID: hardcoded in single-organizer mode or dynamic
  const [appId, setAppId] = useState(getAppId())
  
  // Event details (fetched from contract state)
  const [eventName, setEventName] = useState('Loading...')
  const [ticketPrice, setTicketPrice] = useState(0) // in ALGO
  const [ticketsRemaining, setTicketsRemaining] = useState(0)
  const [totalTickets, setTotalTickets] = useState(0)
  const [eventDate, setEventDate] = useState(0)
  const [eventLocation, setEventLocation] = useState('')
  const [isExpired, setIsExpired] = useState(false)
  
  // Purchase state
  const [loading, setLoading] = useState(false)
  const [purchasedTicketId, setPurchasedTicketId] = useState<number | null>(null)
  const [refundLoading, setRefundLoading] = useState<number | null>(null)
  const [showQrFor, setShowQrFor] = useState<number | null>(null)
  
  // WHY: Track user's owned ticket NFTs
  // REASON: Display "My Tickets" section so users can see their purchased tickets
  // and easily access asset IDs for resale listing
  const [myTickets, setMyTickets] = useState<TicketAsset[]>([])
  const [loadingTickets, setLoadingTickets] = useState(false)

  const algorand = useMemo(() => {
    const algodConfig = getAlgodConfigFromViteEnvironment()
    const indexerConfig = getIndexerConfigFromViteEnvironment()
    return AlgorandClient.fromConfig({ algodConfig, indexerConfig })
  }, [])

  // Fetch event details from contract global state (no transaction needed)
  useEffect(() => {
    const fetchEventDetails = async () => {
      // No app ID → no event to fetch
      if (!appId || appId === BigInt(0)) {
        setEventName('No Event Created')
        setTotalTickets(0)
        setTicketsRemaining(0)
        setTicketPrice(0)
        setEventDate(0)
        setEventLocation('')
        setIsExpired(false)
        return
      }
      try {
        const factory = new TicketContractFactory({ algorand })
        const client = factory.getAppClientById({ appId })
        
        const gs = await client.state.global.getAll()
        
        setEventName(gs.eventName ?? 'Unknown')
        setTotalTickets(Number(gs.totalTickets ?? 0))
        setTicketsRemaining(Number(gs.totalTickets ?? 0) - Number(gs.ticketsSold ?? 0))
        setTicketPrice(Number(gs.ticketPrice ?? 0) / 1_000_000)
        setEventDate(Number(gs.eventDate ?? 0))
        setEventLocation(gs.eventLocation ?? '')
        setIsExpired(Number(gs.eventDate ?? 0) > 0 && Date.now() / 1000 > Number(gs.eventDate ?? 0))
      } catch (error) {
        console.error('Failed to fetch event details:', error)
        setEventName('Contract not found')
        setTotalTickets(0)
        setTicketsRemaining(0)
      }
    }

    if (openModal) {
      void fetchEventDetails()
    }
  }, [openModal, algorand, appId])
  
  // Listen for app ID changes (only in multi-organizer mode)
  useEffect(() => {
    if (SINGLE_ORGANIZER_MODE) return // No dynamic switching in single-organizer mode
    
    const handleStorageChange = () => {
      const newAppId = getAppId()
      if (newAppId !== appId) {
        setAppId(newAppId)
        enqueueSnackbar(`Updated to App ID: ${newAppId}`, { variant: 'info' })
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    // Also check on interval in case same tab updates it
    const interval = setInterval(handleStorageChange, 2000)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [appId, enqueueSnackbar])

  // WHY: Fetch user's owned tickets when wallet connects or modal opens
  // REASON: Keep ticket list up-to-date and show user their current holdings
  useEffect(() => {
    const fetchTickets = async () => {
      if (activeAddress && openModal) {
        setLoadingTickets(true)
        try {
          const tickets = await getUserTickets(activeAddress, algorand)
          setMyTickets(tickets)
        } catch (error) {
          console.error('Failed to fetch tickets:', error)
        } finally {
          setLoadingTickets(false)
        }
      }
    }

    fetchTickets()
  }, [activeAddress, openModal, algorand])

  const onPurchaseTicket = async () => {
    if (!activeAddress) {
      enqueueSnackbar('Connect a wallet first', { variant: 'error' })
      return
    }
    if (!transactionSigner) {
      enqueueSnackbar('Wallet signer not available', { variant: 'error' })
      return
    }
    if (ticketsRemaining <= 0) {
      enqueueSnackbar('Event sold out', { variant: 'error' })
      return
    }
    if (isExpired) {
      enqueueSnackbar('Event has ended — ticket sales closed', { variant: 'error' })
      return
    }

    setLoading(true)
    try {
      const factory = new TicketContractFactory({ algorand })
      const ticketContractClient = factory.getAppClientById({ appId })

      // ── Step 0: Opt-in to the app (local state) — skip if already opted in ──
      let isOptedIn = false
      try {
        const accountInfo = await algorand.client.algod.accountApplicationInformation(activeAddress, Number(appId)).do()
        // Check if app-local-state exists (means user is opted in)
        isOptedIn = accountInfo.appLocalState !== undefined
        if (isOptedIn) {
          console.log('Already opted into app', accountInfo)
        }
      } catch (e) {
        // API error - assume not opted in
        isOptedIn = false
      }

      if (!isOptedIn) {
        // Not opted in yet — do it now
        try {
          await ticketContractClient.send.optIn.bare({
            sender: activeAddress,
            signer: transactionSigner,
          })
          console.log('Successfully opted into app')
        } catch (e: any) {
          console.error('Opt-in failed:', e?.message)
          throw new Error(`App opt-in failed: ${e?.message}`)
        }
      }

      // ── Step 1: Purchase ticket (mints NFT held by contract) ─
      enqueueSnackbar('Step 1/3: Purchasing ticket & minting NFT...', { variant: 'info' })

      const appAddress = algosdk.getApplicationAddress(Number(appId))

      const paymentTxn = await algorand.createTransaction.payment({
        sender: activeAddress,
        receiver: appAddress,
        amount: algo(ticketPrice),
        extraFee: algo(0.001), // 1 inner tx: AssetConfig (mint)
      })

      const result = await ticketContractClient.send.purchaseTicket({
        args: { payment: paymentTxn },
        sender: activeAddress,
        signer: transactionSigner,
      })

      const ticketAssetId = Number(result.return!)
      console.log('Minted ticket NFT asset ID:', ticketAssetId)

      // ── Step 2: Opt-in to the newly created asset ────────────
      enqueueSnackbar(`Step 2/3: Opting in to asset ${ticketAssetId}...`, { variant: 'info' })

      await algorand.send.assetOptIn({
        sender: activeAddress,
        signer: transactionSigner,
        assetId: BigInt(ticketAssetId),
      })

      console.log('Opted in to asset', ticketAssetId)

      // ── Step 3: Claim ticket (contract transfers NFT to you) ─
      enqueueSnackbar('Step 3/3: Claiming ticket NFT...', { variant: 'info' })

      await ticketContractClient.send.receiveTicket({
        args: { assetId: BigInt(ticketAssetId) },
        sender: activeAddress,
        signer: transactionSigner,
        extraFee: algo(0.001), // 1 inner tx: AssetTransfer
      })

      console.log('Ticket NFT claimed successfully')

      // ── Done ─────────────────────────────────────────────────
      setPurchasedTicketId(ticketAssetId)
      setTicketsRemaining((prev) => prev - 1)

      enqueueSnackbar(`🎉 Ticket #${ticketAssetId} purchased & claimed!`, { variant: 'success' })

      // Refresh ticket list
      const updatedTickets = await getUserTickets(activeAddress, algorand)
      setMyTickets(updatedTickets)
    } catch (e) {
      const errorMsg = (e as Error).message
      console.error('Purchase error:', e)

      if (errorMsg.includes('has not opted in')) {
        enqueueSnackbar('Please try again – initializing your account for the event', { variant: 'error' })
      } else if (errorMsg.includes('logic eval error')) {
        enqueueSnackbar(`Contract error: ${errorMsg.substring(0, 150)}...`, { variant: 'error' })
      } else {
        enqueueSnackbar(`Purchase failed: ${errorMsg}`, { variant: 'error' })
      }
    } finally {
      setLoading(false)
    }
  }

  const resetAndClose = () => {
    setPurchasedTicketId(null)
    closeModal()
  }

  const handleRefund = async (assetId: number) => {
    if (!activeAddress || !transactionSigner) {
      enqueueSnackbar('Connect wallet first', { variant: 'error' })
      return
    }
    setRefundLoading(assetId)
    try {
      const factory = new TicketContractFactory({ algorand })
      const client = factory.getAppClientById({ appId })

      // Build box references
      const enc = new TextEncoder()
      const scannedBox = new Uint8Array(16)
      scannedBox.set(enc.encode('scanned_'), 0)
      new DataView(scannedBox.buffer, 8, 8).setBigUint64(0, BigInt(assetId), false)
      const listingBox = new Uint8Array(16)
      listingBox.set(enc.encode('listing_'), 0)
      new DataView(listingBox.buffer, 8, 8).setBigUint64(0, BigInt(assetId), false)

      const res = await client.send.requestRefund({
        args: { ticketAssetId: BigInt(assetId) },
        sender: activeAddress,
        signer: transactionSigner,
        boxReferences: [
          { appId: BigInt(Number(appId)), name: scannedBox },
          { appId: BigInt(Number(appId)), name: listingBox },
        ],
        extraFee: algo(0.002),
      })
      const refundAmt = Number(res.return!) / 1e6
      enqueueSnackbar(`Refund of ${refundAmt.toFixed(4)} ALGO processed!`, { variant: 'success' })
      // Refresh tickets
      const updated = await getUserTickets(activeAddress, algorand)
      setMyTickets(updated)
    } catch (e) {
      const m = (e as Error).message
      if (m.includes('already scanned')) enqueueSnackbar('Scanned tickets cannot be refunded', { variant: 'error' })
      else if (m.includes('No refund')) enqueueSnackbar('No refund available after event', { variant: 'error' })
      else enqueueSnackbar(`Refund failed: ${m}`, { variant: 'error' })
    } finally { setRefundLoading(null) }
  }

  return (
    <Dialog open={openModal} onOpenChange={(open) => { if (!open) resetAndClose() }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Purchase Event Ticket
          </DialogTitle>
          <DialogDescription>Mint your NFT ticket on Algorand</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          {/* App ID Info */}
          {appId && appId > BigInt(0) ? (
            <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                <span className="font-medium">{SINGLE_ORGANIZER_MODE ? 'Event App ID:' : 'Current Event App ID:'}</span>
                <code className="bg-background px-1.5 py-0.5 rounded text-xs font-mono border">{appId.toString()}</code>
              </p>
              {!SINGLE_ORGANIZER_MODE && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newId = prompt('Enter Event App ID:', appId.toString())
                    if (newId && !isNaN(Number(newId))) {
                      const numId = BigInt(newId)
                      setAppId(numId)
                      localStorage.setItem('TICKET_CONTRACT_APP_ID', newId)
                      enqueueSnackbar(`Switched to App ID: ${newId}`, { variant: 'success' })
                    }
                  }}
                >
                  Change
                </Button>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-center">
              <AlertTriangle className="h-5 w-5 text-amber-600 mx-auto mb-2" />
              {SINGLE_ORGANIZER_MODE ? (
                <>
                  <p className="font-medium text-amber-800 text-sm">Event not configured</p>
                  <p className="text-xs text-amber-600 mt-1">The organizer needs to set up the event App ID first.</p>
                </>
              ) : (
                <>
                  <p className="font-medium text-amber-800 text-sm">No event connected</p>
                  <p className="text-xs text-amber-600 mt-1">Create an event from the Organizer Panel first, or enter an App ID.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => {
                      const newId = prompt('Enter Event App ID:')
                      if (newId && !isNaN(Number(newId)) && Number(newId) > 0) {
                        const numId = BigInt(newId)
                        setAppId(numId)
                        localStorage.setItem('TICKET_CONTRACT_APP_ID', newId)
                        enqueueSnackbar(`Connected to App ID: ${newId}`, { variant: 'success' })
                      }
                    }}
                  >
                    Enter App ID
                  </Button>
                </>
              )}
            </div>
          )}

          {!purchasedTicketId ? (
            <>
              {/* My Tickets Section */}
              {activeAddress && myTickets.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Ticket className="h-4 w-4 text-primary" />
                        My Tickets
                      </span>
                      <Badge variant="secondary">{myTickets.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="divide-y max-h-[280px] overflow-y-auto">
                      {myTickets.map((ticket) => (
                        <div key={ticket.assetId} className="py-3 first:pt-0 last:pb-0">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm font-medium">{ticket.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">ID: {ticket.assetId}</p>
                            </div>
                            <div className="flex gap-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => { e.preventDefault(); setShowQrFor(showQrFor === ticket.assetId ? null : ticket.assetId) }}
                              >
                                <QrCode className="h-3.5 w-3.5" />
                                {showQrFor === ticket.assetId ? 'Hide' : 'QR'}
                              </Button>
                              <Button variant="ghost" size="sm" asChild>
                                <a
                                  href={`https://testnet.explorer.perawallet.app/asset/${ticket.assetId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                disabled={refundLoading !== null}
                                loading={refundLoading === ticket.assetId}
                                onClick={(e) => { e.preventDefault(); void handleRefund(ticket.assetId) }}
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Refund
                              </Button>
                            </div>
                          </div>
                          {/* QR Code for venue scanning */}
                          {showQrFor === ticket.assetId && (
                            <div className="mt-3 flex flex-col items-center bg-muted/50 rounded-xl p-4 border">
                              <QRCodeSVG value={String(ticket.assetId)} size={160} level="H" />
                              <p className="text-xs text-muted-foreground mt-2">Show this QR at event entry</p>
                              <Badge variant="outline" className="mt-1 font-mono">#{ticket.assetId}</Badge>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Event Details Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Event Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="divide-y">
                    <div className="flex justify-between items-center py-2.5">
                      <span className="text-sm text-muted-foreground">App ID</span>
                      <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{appId.toString()}</code>
                    </div>
                    <div className="flex justify-between items-center py-2.5">
                      <span className="text-sm text-muted-foreground">Event Name</span>
                      <span className="text-sm font-medium">{eventName}</span>
                    </div>
                    <div className="flex justify-between items-center py-2.5">
                      <span className="text-sm text-muted-foreground">Ticket Price</span>
                      <span className="text-lg font-bold text-primary">{ticketPrice} ALGO</span>
                    </div>
                    <div className="flex justify-between items-center py-2.5">
                      <span className="text-sm text-muted-foreground">Remaining</span>
                      <span className="text-sm font-semibold">{ticketsRemaining} <span className="text-muted-foreground font-normal">/ {totalTickets}</span></span>
                    </div>
                    <div className="flex justify-between items-center py-2.5">
                      <span className="text-sm text-muted-foreground">Event Date</span>
                      <span className="text-sm font-medium flex items-center gap-2">
                        {eventDate > 0 ? new Date(eventDate * 1000).toLocaleString() : 'Not set'}
                        {isExpired && <Badge variant="destructive" className="text-[10px]">Expired</Badge>}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2.5">
                      <span className="text-sm text-muted-foreground">Location</span>
                      <span className="text-sm font-medium">{eventLocation || 'TBD'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Purchase Button */}
              <Button
                className="w-full h-12 text-base"
                onClick={onPurchaseTicket}
                disabled={loading || ticketsRemaining <= 0 || isExpired || !appId || appId === BigInt(0)}
                loading={loading}
                size="lg"
              >
                {!loading && (
                  !appId || appId === BigInt(0) ? 'No Event Connected' : isExpired ? 'Event Expired — Sales Closed' : `Purchase Ticket — ${ticketPrice} ALGO`
                )}
                {loading && 'Processing...'}
              </Button>
            </>
          ) : (
            /* Success View */
            <div className="text-center py-8 animate-fade-in">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h4 className="text-xl font-semibold mb-1">Purchase Successful!</h4>
              <p className="text-sm font-medium text-primary mb-1">{eventName}</p>
              <p className="text-sm text-muted-foreground">Asset ID: {purchasedTicketId}</p>

              <Button variant="outline" className="w-full mt-6" asChild>
                <a 
                  href={`https://testnet.explorer.perawallet.app/asset/${purchasedTicketId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                  View on Explorer
                </a>
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={resetAndClose} disabled={loading}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default MintNFT
