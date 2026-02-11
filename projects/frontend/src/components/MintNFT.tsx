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
    <dialog id="purchase_ticket_modal" className={`modal ${openModal ? 'modal-open' : ''}`}>
      <form method="dialog" className="modal-box max-w-2xl bg-gradient-to-br from-purple-50 to-blue-50">
        {/* Header */}
        <h3 className="font-bold text-3xl mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
          🎫 Purchase Event Ticket
        </h3>
        
        {/* App ID Info */}
        {appId && appId > BigInt(0) ? (
          <div className="alert alert-info mb-4">
            <div className="flex items-center justify-between w-full">
              <div>
                <span className="font-semibold">
                  {SINGLE_ORGANIZER_MODE ? 'Event App ID:' : 'Current Event App ID:'}
                </span>{' '}
                <code className="bg-white px-2 py-1 rounded text-sm">{appId.toString()}</code>
              </div>
              {!SINGLE_ORGANIZER_MODE && (
                <button
                  type="button"
                  className="btn btn-xs btn-ghost"
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
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="alert alert-warning mb-4">
            <div className="text-center w-full">
              {SINGLE_ORGANIZER_MODE ? (
                <>
                  <p className="font-semibold">Event not configured</p>
                  <p className="text-sm">The organizer needs to set up the event App ID first.</p>
                </>
              ) : (
                <>
                  <p className="font-semibold">No event connected</p>
                  <p className="text-sm">Create an event from the Organizer Panel first, or enter an App ID below.</p>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline mt-2"
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
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {!purchasedTicketId ? (
          <>
            {/* WHY: Display user's owned ticket NFTs
                REASON: Users need to see their purchased tickets and access asset IDs
                for resale or verification purposes. Shows proof of ownership. */}
            {activeAddress && myTickets.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-blue-100">
                <h4 className="font-semibold text-xl text-gray-800 mb-4">
                  🎫 My Tickets ({myTickets.length})
                </h4>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {myTickets.map((ticket) => (
                    <div key={ticket.assetId} className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-gray-800">{ticket.name}</p>
                          <p className="text-sm text-gray-600">Asset ID: {ticket.assetId}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            className="btn btn-sm btn-outline btn-accent"
                            onClick={(e) => { e.preventDefault(); setShowQrFor(showQrFor === ticket.assetId ? null : ticket.assetId) }}
                          >
                            {showQrFor === ticket.assetId ? '✖ Hide QR' : '📱 Show QR'}
                          </button>
                          <a
                            href={`https://testnet.explorer.perawallet.app/asset/${ticket.assetId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline btn-primary"
                          >
                            View 🔗
                          </a>
                          <button
                            className={`btn btn-sm btn-outline btn-warning ${refundLoading === ticket.assetId ? 'loading' : ''}`}
                            disabled={refundLoading !== null}
                            onClick={(e) => { e.preventDefault(); void handleRefund(ticket.assetId) }}
                          >
                            💸 Refund
                          </button>
                        </div>
                      </div>
                      {/* QR Code for venue scanning */}
                      {showQrFor === ticket.assetId && (
                        <div className="mt-4 flex flex-col items-center bg-white rounded-xl p-4 border border-purple-200">
                          <QRCodeSVG value={String(ticket.assetId)} size={180} level="H" />
                          <p className="text-xs text-gray-500 mt-2">Show this QR at event entry for scanning</p>
                          <p className="text-sm font-mono font-bold text-purple-600 mt-1">#{ticket.assetId}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Event Info Card */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-purple-100">
              <h4 className="font-semibold text-xl text-gray-800 mb-4">Event Details</h4>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-600 font-medium">App ID</span>
                  <span className="text-xs font-mono text-gray-700 bg-gray-50 px-2 py-1 rounded">{appId.toString()}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-600 font-medium">Event Name</span>
                  <span className="text-gray-900 font-semibold">{eventName}</span>
                </div>
                
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-600 font-medium">Ticket Price</span>
                  <span className="text-purple-600 font-bold text-xl">{ticketPrice} ALGO</span>
                </div>
                
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600 font-medium">Tickets Remaining</span>
                  <span className="font-bold text-lg">
                    {ticketsRemaining} / {totalTickets}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-t border-gray-200">
                  <span className="text-gray-600 font-medium">Event Date</span>
                  <span className="text-gray-900 font-semibold">
                    {eventDate > 0 ? new Date(eventDate * 1000).toLocaleString() : 'Not set'}
                    {isExpired && <span className="badge badge-error badge-sm ml-2">Expired</span>}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600 font-medium">Location</span>
                  <span className="text-gray-900 font-semibold">{eventLocation || 'TBD'}</span>
                </div>
              </div>
            </div>

            {/* Purchase Section */}
            <button 
              className={`w-full btn btn-lg ${loading ? 'loading' : ''}`}
              onClick={onPurchaseTicket}
              disabled={loading || ticketsRemaining <= 0 || isExpired || !appId || appId === BigInt(0)}
            >
              {!appId || appId === BigInt(0) ? 'No Event Connected' : isExpired ? 'Event Expired — Sales Closed' : 'Purchase Ticket'}
            </button>
          </>
        ) : (
          /* Success View */
          <div className="space-y-6 text-center">
            <div className="text-6xl">✅</div>
            <h4 className="font-bold text-2xl">Purchase Successful!</h4>
            <p className="text-lg font-semibold text-purple-600">{eventName}</p>
            <p>Asset ID: {purchasedTicketId}</p>

            {/* AlgoExplorer Link */}
            <a 
              href={`https://testnet.explorer.perawallet.app/asset/${purchasedTicketId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline btn-primary w-full"
            >
              View on AlgoExplorer 🔗
            </a>
          </div>
        )}

        {/* Modal Actions */}
        <div className="modal-action">
          <button 
            className="btn btn-ghost" 
            onClick={resetAndClose} 
            disabled={loading}
          >
            Close
          </button>
        </div>
      </form>
    </dialog>
  )
}

export default MintNFT
