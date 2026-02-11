import { algo, AlgorandClient } from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import { useState, useEffect, useMemo } from 'react'
import algosdk from 'algosdk'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import { getUserTickets, verifyTicketOwnership, TicketAsset } from '../utils/ticketAssets'
import { TicketContractFactory } from '../contracts/TicketContract.js'
import { HARDCODED_APP_ID, SINGLE_ORGANIZER_MODE } from '../config/organizerConfig'

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
    <dialog id="resale_marketplace_modal" className={`modal ${openModal ? 'modal-open' : ''}`}>
      <form method="dialog" className="modal-box max-w-4xl bg-gradient-to-br from-purple-50 to-blue-50">
        {/* Header */}
        <h3 className="font-bold text-3xl mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
          🔄 Ticket Resale Marketplace
        </h3>

        {/* Mode Toggle */}
        <div className="tabs tabs-boxed bg-white/80 mb-6 shadow-md">
          <button 
            className={`tab tab-lg flex-1 ${mode === 'buy' ? 'tab-active bg-gradient-to-r from-purple-500 to-blue-500 text-white' : ''}`}
            onClick={(e) => { e.preventDefault(); setMode('buy') }}
          >
            🛒 Browse Marketplace
          </button>
          <button 
            className={`tab tab-lg flex-1 ${mode === 'list' ? 'tab-active bg-gradient-to-r from-purple-500 to-blue-500 text-white' : ''}`}
            onClick={(e) => { e.preventDefault(); setMode('list') }}
          >
            📝 List My Ticket
          </button>
        </div>

        {/* Content */}
        <div className="min-h-[400px]">
          {/* LIST TICKET MODE */}
          {mode === 'list' && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-purple-100">
              <h4 className="font-bold text-xl text-gray-800 mb-4">List Your Ticket for Resale</h4>
              
              {isExpired && (
                <div className="alert alert-error mb-4">
                  <span>Event has ended — listing is closed. No new resale listings allowed.</span>
                </div>
              )}
              
              <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl p-4 mb-6">
                <p className="text-gray-700 text-sm">
                  💡 List your ticket on the marketplace. Maximum resale price is <span className="font-bold">{maxResalePrice} ALGO</span>
                </p>
              </div>

              {/* WHY: Show user's owned tickets for easy selection
                  REASON: Users can click a ticket to auto-fill the asset ID instead of 
                  manually finding it. Reduces errors and improves UX. */}
              {myTickets.length > 0 && (
                <div className="mb-6">
                  <h5 className="font-semibold text-gray-800 mb-3">🎫 Select from My Tickets:</h5>
                  <div className="grid grid-cols-1 gap-3 max-h-48 overflow-y-auto">
                    {myTickets.map((ticket) => (
                      <button
                        key={ticket.assetId}
                        type="button"
                        className={`p-3 rounded-lg border-2 transition-all text-left ${
                          ticketAssetId === ticket.assetId.toString()
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                        }`}
                        onClick={() => setTicketAssetId(ticket.assetId.toString())}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-gray-800">{ticket.name}</p>
                            <p className="text-sm text-gray-600">Asset ID: {ticket.assetId}</p>
                          </div>
                          {ticketAssetId === ticket.assetId.toString() && (
                            <span className="text-purple-600 font-bold">✓ Selected</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Ticket Asset ID</span>
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 1023456"
                    className="input input-bordered input-lg"
                    value={ticketAssetId}
                    onChange={(e) => setTicketAssetId(e.target.value)}
                  />
                  <label className="label">
                    <span className="label-text-alt text-gray-500">The NFT asset ID of your ticket</span>
                  </label>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Asking Price (ALGO)</span>
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 65"
                    step="0.01"
                    className="input input-bordered input-lg"
                    value={askingPrice}
                    onChange={(e) => setAskingPrice(e.target.value)}
                  />
                  <label className="label">
                    <span className="label-text-alt text-gray-500">Maximum allowed: {maxResalePrice} ALGO</span>
                  </label>
                </div>

                {/* Price validation indicator */}
                {askingPrice && Number(askingPrice) > maxResalePrice && (
                  <div className="alert alert-error shadow-lg">
                    <div>
                      <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Price exceeds maximum resale limit of {maxResalePrice} ALGO</span>
                    </div>
                  </div>
                )}

                {askingPrice && Number(askingPrice) <= maxResalePrice && Number(askingPrice) > 0 && (
                  <div className="alert alert-success shadow-lg">
                    <div>
                      <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Valid price - ready to list!</span>
                    </div>
                  </div>
                )}

                <button 
                  className={`btn btn-lg w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 ${loading ? 'loading' : ''}`}
                  disabled={loading || !ticketAssetId || !askingPrice || Number(askingPrice) > maxResalePrice || Number(askingPrice) <= 0}
                  onClick={(e) => { e.preventDefault(); void handleListTicket() }}
                >
                  {loading ? 'Listing...' : '📝 List Ticket for Resale'}
                </button>
              </div>
            </div>
          )}

          {/* BUY MODE - MARKETPLACE */}
          {mode === 'buy' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-xl text-gray-800">Available Resale Tickets</h4>
                <button 
                  className="btn btn-sm btn-ghost"
                  onClick={(e) => { e.preventDefault(); void fetchResaleListings() }}
                >
                  🔄 Refresh
                </button>
              </div>

              {resaleListings.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md p-8 border border-purple-100 text-center">
                  <div className="text-6xl mb-4">🎫</div>
                  <h5 className="font-bold text-xl text-gray-800 mb-2">No Tickets Available</h5>
                  <p className="text-gray-600">Check back later or be the first to list a ticket!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {resaleListings.map((listing) => (
                    <div 
                      key={listing.listingId}
                      className="bg-white rounded-xl shadow-lg p-5 border border-purple-100 hover:shadow-xl hover:scale-105 transition-all duration-200"
                    >
                      {/* Ticket Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="badge badge-lg badge-primary">Ticket #{listing.ticketAssetId}</div>
                      </div>

                      {/* Price */}
                      <div className="mb-4">
                        <div className="text-sm text-gray-600 mb-1">Asking Price</div>
                        <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
                          {listing.askingPrice} Ⱥ
                        </div>
                      </div>

                      {/* Seller */}
                      <div className="mb-4">
                        <div className="text-sm text-gray-600 mb-1">Seller</div>
                        <div className="font-mono text-xs text-gray-800 truncate">
                          {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}
                        </div>
                      </div>

                      {/* Buy Button */}
                      <button 
                        className={`btn btn-block bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 ${
                          loading && selectedListing?.listingId === listing.listingId ? 'loading' : ''
                        }`}
                        disabled={loading}
                        onClick={(e) => {
                          e.preventDefault()
                          void handleBuyResaleTicket(listing)
                        }}
                      >
                        {loading && selectedListing?.listingId === listing.listingId ? 'Purchasing...' : '🛒 Buy Now'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Info Alert */}
              <div className="alert alert-info mt-6">
                <div className="flex items-start gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current flex-shrink-0 w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span className="text-sm">Purchases include organizer royalty. Ticket ownership transfers instantly on-chain.</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="modal-action mt-6">
          <button className="btn btn-ghost" onClick={() => setModalState(!openModal)} disabled={loading}>
            Close
          </button>
        </div>
      </form>
    </dialog>
  )
}

export default Transact
