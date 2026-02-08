import { algo, AlgorandClient } from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import { useState, useEffect, useMemo } from 'react'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import { getUserTickets, verifyTicketOwnership, TicketAsset } from '../utils/ticketAssets'
// import { TicketContractClient } from '../contracts/TicketContract'

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
  
  // List ticket state
  const [ticketAssetId, setTicketAssetId] = useState<string>('')
  const [askingPrice, setAskingPrice] = useState<string>('')
  const [maxResalePrice, setMaxResalePrice] = useState<number>(75) // From contract
  const [appId] = useState<number>(0) // Should come from props or context
  
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

  const { enqueueSnackbar } = useSnackbar()

  const { transactionSigner, activeAddress } = useWallet()

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
    try {
      // TODO: Query contract box storage for resale listings
      // const client = new TicketContractClient({ appId: BigInt(appId), algorand })
      // const boxes = await algorand.client.algod.getApplicationBoxes(appId).do()
      // Parse box data to get resale listings
      
      // Placeholder data
      setResaleListings([
        {
          ticketAssetId: 1023456,
          seller: 'ABCD1234EFGH5678IJKL9012MNOP3456QRST7890UVWX1234YZAB5678',
          askingPrice: 65,
          listingId: 'listing_1',
        },
        {
          ticketAssetId: 1023457,
          seller: 'ZYXW8765VUSR4321PONM0987LKJI6543HGFE2109DCBA8765ZYXW4321',
          askingPrice: 70,
          listingId: 'listing_2',
        },
        {
          ticketAssetId: 1023458,
          seller: 'MNOP3456QRST7890UVWX1234YZAB5678ABCD1234EFGH5678IJKL9012',
          askingPrice: 60,
          listingId: 'listing_3',
        },
      ])
    } catch (e) {
      enqueueSnackbar(`Error loading listings: ${(e as Error).message}`, { variant: 'error' })
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

    if (price > maxResalePrice) {
      enqueueSnackbar(`Price exceeds maximum resale price of ${maxResalePrice} ALGO`, { variant: 'error' })
      setLoading(false)
      return
    }

    try {
      // WHY: Verify user actually owns the ticket NFT before listing
      // REASON: Prevent attempts to list tickets user doesn't own, which would fail
      // on-chain. Better UX to catch this early.
      const ownsTicket = await verifyTicketOwnership(activeAddress, assetId, algorand)
      if (!ownsTicket) {
        enqueueSnackbar('You do not own this ticket NFT!', { variant: 'error' })
        setLoading(false)
        return
      }
      
      enqueueSnackbar('Listing ticket for resale...', { variant: 'info' })
      
      // TODO: Call TicketContract list_for_resale method
      // WHY: Contract has clawback authority over the NFT (set during minting)
      // REASON: No need to transfer NFT first - contract can move it during sale
      // using its clawback authority. User keeps NFT until it's actually sold.
      //
      // const client = new TicketContractClient({
      //   appId: BigInt(appId),
      //   algorand,
      //   defaultSigner: transactionSigner
      // })
      //
      // const result = await client.send.listForResale({
      //   args: {
      //     ticketId: BigInt(assetId),
      //     askingPrice: BigInt(price * 1000000) // Convert to microAlgos
      //   },
      //   sender: activeAddress
      // })
      
      // Placeholder simulation
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      enqueueSnackbar(`Ticket #${assetId} listed for ${price} ALGO`, { variant: 'success' })
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
      enqueueSnackbar('Processing purchase...', { variant: 'info' })
      
      // TODO: Create payment transaction and call contract
      // const paymentTxn = await algorand.createTransaction.payment({
      //   sender: activeAddress,
      //   receiver: contractAddress,
      //   amount: algo(listing.askingPrice),
      // })
      //
      // const client = new TicketContractClient({
      //   appId: BigInt(appId),
      //   algorand,
      //   defaultSigner: transactionSigner
      // })
      //
      // const result = await client.send.buyResaleTicket({
      //   args: {
      //     ticketAssetId: listing.ticketAssetId,
      //     payment: paymentTxn
      //   },
      //   sender: activeAddress
      // })
      
      // Placeholder simulation
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      enqueueSnackbar(`Successfully purchased Ticket #${listing.ticketAssetId} for ${listing.askingPrice} ALGO`, { variant: 'success' })
      
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
