import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import { useMemo, useState, useEffect } from 'react'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import { getUserTickets, TicketAsset } from '../utils/ticketAssets'
// import { TicketContractClient } from '../contracts/TicketContract'

interface MintNFTProps {
  openModal: boolean
  closeModal: () => void
}

const MintNFT = ({ openModal, closeModal }: MintNFTProps) => {
  const { activeAddress, transactionSigner } = useWallet()
  const { enqueueSnackbar } = useSnackbar()
  
  // Event details (to be fetched from contract state)
  const [eventName, setEventName] = useState('Algorand Developer Summit 2026')
  const [ticketPrice, setTicketPrice] = useState(50) // in ALGO
  const [ticketsRemaining, setTicketsRemaining] = useState(250)
  const [totalTickets, setTotalTickets] = useState(500)
  
  // Purchase state
  const [loading, setLoading] = useState(false)
  const [purchasedTicketId, setPurchasedTicketId] = useState<number | null>(null)
  
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
    if (ticketsRemaining <= 0) {
      enqueueSnackbar('Event sold out', { variant: 'error' })
      return
    }

    setLoading(true)
    try {
      // TODO: Create payment transaction
      // const paymentTxn = await algorand.createTransaction.payment({
      //   sender: activeAddress,
      //   receiver: contractAddress,
      //   amount: AlgoAmount.Algos(ticketPrice),
      // })

      // TODO: Call ticket contract
      // const ticketContractClient = new TicketContractClient(
      //   { sender: activeAddress, resolveBy: 'id', id: APP_ID },
      //   algorand.client.algod
      // )
      
      // const result = await ticketContractClient.purchaseTicket(
      //   { payment: paymentTxn },
      //   { sender: activeAddress }
      // )

      // PLACEHOLDER: Simulate successful purchase
      // In production, extract ticket asset ID from contract response
      const simulatedTicketId = Math.floor(Math.random() * 1000000) + 1000000
      
      setPurchasedTicketId(simulatedTicketId)
      setTicketsRemaining(prev => prev - 1)
      
      enqueueSnackbar(`Ticket #${simulatedTicketId} purchased successfully!`, { variant: 'success' })
      
      // WHY: Refresh ticket list after purchase
      // REASON: The newly minted NFT should appear in "My Tickets" section immediately
      const updatedTickets = await getUserTickets(activeAddress, algorand)
      setMyTickets(updatedTickets)
      
      // NOTE: Uncomment when contract is integrated
      // enqueueSnackbar(`Ticket #${result.return} purchased successfully!`, { variant: 'success' })
      // setPurchasedTicketId(result.return)
      
    } catch (e) {
      enqueueSnackbar((e as Error).message, { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const resetAndClose = () => {
    setPurchasedTicketId(null)
    closeModal()
  }

  return (
    <dialog id="purchase_ticket_modal" className={`modal ${openModal ? 'modal-open' : ''}`}>
      <form method="dialog" className="modal-box max-w-2xl bg-gradient-to-br from-purple-50 to-blue-50">
        {/* Header */}
        <h3 className="font-bold text-3xl mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
          🎫 Purchase Event Ticket
        </h3>

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
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {myTickets.map((ticket) => (
                    <div
                      key={ticket.assetId}
                      className="flex justify-between items-center p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg hover:shadow-md transition-shadow"
                    >
                      <div>
                        <p className="font-semibold text-gray-800">{ticket.name}</p>
                        <p className="text-sm text-gray-600">Asset ID: {ticket.assetId}</p>
                      </div>
                      <a
                        href={`https://testnet.explorer.perawallet.app/asset/${ticket.assetId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-outline btn-primary"
                      >
                        View 🔗
                      </a>
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
              </div>
            </div>

            {/* Purchase Section */}
            <button 
              className={`w-full btn btn-lg ${loading ? 'loading' : ''}`}
              onClick={onPurchaseTicket}
              disabled={loading || ticketsRemaining <= 0}
            >
              Purchase Ticket
            </button>
          </>
        ) : (
          /* Success View */
          <div className="space-y-6 text-center">
            <div className="text-6xl">✅</div>
            <h4 className="font-bold text-2xl">Purchase Successful!</h4>
            <p>Ticket Number: #{purchasedTicketId}</p>

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
