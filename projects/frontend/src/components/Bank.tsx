import { useEffect, useMemo, useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import algosdk, { getApplicationAddress, makePaymentTxnWithSuggestedParamsFromObject } from 'algosdk'
import { AlgorandClient, microAlgos } from '@algorandfoundation/algokit-utils'
import { BankClient, BankFactory } from '../contracts/Bank'
import { verifyTicketOwnership } from '../utils/ticketAssets'
// import { TicketContractClient, TicketContractFactory } from '../contracts/TicketContract'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

interface BankProps {
  openModal: boolean
  closeModal: () => void
}

type ScannedTicket = {
  id: string
  round: number
  ticketId: number
  timestamp?: number
  scannedBy: string
}

type EventDashboard = {
  eventName: string
  totalTickets: number
  soldTickets: number
  ticketPrice: number
  revenue: number
}

const Bank = ({ openModal, closeModal }: BankProps) => {
  const { enqueueSnackbar } = useSnackbar()
  const { activeAddress, transactionSigner } = useWallet()
  const algorand = useMemo(() => {
    const algodConfig = getAlgodConfigFromViteEnvironment()
    const indexerConfig = getIndexerConfigFromViteEnvironment()
    return AlgorandClient.fromConfig({ algodConfig, indexerConfig })
  }, [])
  const [appId, setAppId] = useState<number | ''>(0)
  const [deploying, setDeploying] = useState<boolean>(false)
  
  // Create Event form state
  const [eventName, setEventName] = useState<string>('')
  const [totalCapacity, setTotalCapacity] = useState<string>('')
  const [ticketPrice, setTicketPrice] = useState<string>('')
  const [maxResaleMultiplier, setMaxResaleMultiplier] = useState<string>('200')
  const [organizerRoyalty, setOrganizerRoyalty] = useState<string>('10')
  
  // Scan ticket state
  const [ticketAssetId, setTicketAssetId] = useState<string>('')
  
  const [loading, setLoading] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<'create' | 'manage' | 'scan'>('create')
  const [scannedTickets, setScannedTickets] = useState<ScannedTicket[]>([])
  const [eventDashboard, setEventDashboard] = useState<EventDashboard | null>(null)

  useEffect(() => {
    algorand.setDefaultSigner(transactionSigner)
  }, [algorand, transactionSigner])

  const appAddress = useMemo(() => (appId && appId > 0 ? String(getApplicationAddress(appId)) : ''), [appId])

  const refreshEventDashboard = async () => {
    try {
      if (!appId) return
      // TODO: Fetch event data from contract global state
      // const client = new TicketContractClient({ appId: BigInt(appId), algorand })
      // const globalState = await client.getGlobalState()
      
      // Placeholder data
      setEventDashboard({
        eventName: 'Algorand Developer Summit 2026',
        totalTickets: 500,
        soldTickets: 250,
        ticketPrice: 50,
        revenue: 12500,
      })
    } catch (e) {
      console.error('Error refreshing event dashboard:', e)
      enqueueSnackbar(`Error loading event data: ${(e as Error).message}`, { variant: 'error' })
    }
  }

  const refreshScannedTickets = async () => {
    try {
      if (!appId || !activeAddress) return
      const idx = algorand.client.indexer
      const appAddr = String(getApplicationAddress(appId))
      const allTransactions: ScannedTicket[] = []
      
      console.log('Searching for ticket scan transactions with app ID:', appId)
      
      // Search for application call transactions (mark_scanned calls)
      const appTxRes = await idx
        .searchForTransactions()
        .applicationID(appId)
        .txType('appl')
        .do()
      
      console.log('App call transactions found:', appTxRes.transactions?.length || 0)
      
      // Process scan transactions
      const scanTransactions = (appTxRes.transactions || [])
        .filter((t: any) => {
          // Filter for mark_scanned method calls
          const isOurApp = t.applicationTransaction && 
                          Number(t.applicationTransaction.applicationId) === Number(appId)
          console.log('Checking transaction:', t.id, {
            hasAppTxn: !!t.applicationTransaction,
            appId: t.applicationTransaction?.applicationId,
            targetAppId: Number(appId),
            isOurApp,
          })
          return isOurApp
        })
        .map((t: any) => {
          let ticketId = 0
          
          // Check logs for ticket ID
          if (t.logs && t.logs.length > 0) {
            console.log('Logs for transaction:', t.id, t.logs)
            // TODO: Parse ticket ID from logs
          }
          
          // Check application args for ticket ID
          if (t.applicationTransaction?.applicationArgs) {
            const args = t.applicationTransaction.applicationArgs
            console.log('App args for', t.id, ':', args)
            // First arg is typically the method name, second might be ticket ID
            if (args.length > 1) {
              try {
                const argBuffer = Buffer.from(args[1], 'base64')
                ticketId = argBuffer.readUIntBE(0, argBuffer.length)
              } catch (e) {
                console.error('Error parsing ticket ID:', e)
              }
            }
          }
          
          return {
            id: t.id,
            round: Number(t.confirmedRound || t['confirmed-round']),
            ticketId,
            scannedBy: t.sender,
            timestamp: Number(t.roundTime || t['round-time']),
          }
        })
      
      allTransactions.push(...scanTransactions)
      
      console.log('Total scanned tickets:', allTransactions.length)
      setScannedTickets(allTransactions.sort((a, b) => b.round - a.round))
    } catch (e) {
      console.error('Error in refreshScannedTickets:', e)
      enqueueSnackbar(`Error loading scanned tickets: ${(e as Error).message}`, { variant: 'error' })
    }
  }

  const refreshResaleListings = async () => {
    try {
      if (!appId) return
      const algod = algorand.client.algod
      // TODO: Query box storage for resale listings
      // const boxes = await algod.getApplicationBoxes(appId).do()
      // Parse resale listing data from boxes
      console.log('Refreshing resale listings...')
    } catch (e) {
      enqueueSnackbar(`Error loading resale listings: ${(e as Error).message}`, { variant: 'error' })
    }
  }

  useEffect(() => {
    void refreshEventDashboard()
    void refreshScannedTickets()
    void refreshResaleListings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, activeAddress])

  const createEvent = async () => {
    try {
      if (!activeAddress || activeAddress.trim() === '') throw new Error('Please connect your wallet first')
      if (!transactionSigner) throw new Error('Wallet signer unavailable')
      if (!eventName.trim()) throw new Error('Enter event name')
      const capacity = Number(totalCapacity)
      if (!capacity || capacity <= 0) throw new Error('Enter valid total capacity')
      const price = Number(ticketPrice)
      if (!price || price <= 0) throw new Error('Enter valid ticket price')
      const resaleMultiplier = Number(maxResaleMultiplier)
      if (!resaleMultiplier || resaleMultiplier < 100) throw new Error('Resale multiplier must be at least 100%')
      const royalty = Number(organizerRoyalty)
      if (royalty < 0 || royalty > 50) throw new Error('Organizer royalty must be between 0-50%')
      
      setLoading(true)

      // TODO: Call TicketContract create_event method
      // const factory = new TicketContractFactory({ defaultSender: activeAddress, algorand })
      // const result = await factory.send.create.createEvent({
      //   args: {
      //     eventName,
      //     totalCapacity: capacity,
      //     ticketPrice: price * 1000000, // Convert to microAlgos
      //     maxResaleMultiplier: resaleMultiplier,
      //     organizerRoyalty: royalty,
      //   }
      // })
      // const newAppId = Number(result.appClient.appId)
      
      // Placeholder simulation
      const simulatedAppId = Math.floor(Math.random() * 1000000) + 10000000
      setAppId(simulatedAppId)
      
      enqueueSnackbar(`Event created successfully! App ID: ${simulatedAppId}`, { variant: 'success' })
      
      // Reset form
      setEventName('')
      setTotalCapacity('')
      setTicketPrice('')
      setMaxResaleMultiplier('200')
      setOrganizerRoyalty('10')
      
      void refreshEventDashboard()
    } catch (e) {
      enqueueSnackbar(`Event creation failed: ${(e as Error).message}`, { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // WHY: Add state to track ticket holder info
  // REASON: Before scanning, organizers should verify WHO owns the ticket
  // to match against attendee identity
  const [ticketHolder, setTicketHolder] = useState<string>('')
  const [verifying, setVerifying] = useState(false)

  // WHY: Verify who owns a ticket NFT before scanning
  // REASON: Security measure - organizer can verify the person presenting
  // the ticket actually owns the NFT. Prevents showing tickets from screenshots.
  const verifyTicketHolder = async () => {
    const assetId = Number(ticketAssetId)
    if (!assetId || assetId <= 0) {
      enqueueSnackbar('Enter valid ticket asset ID first', { variant: 'warning' })
      return
    }

    setVerifying(true)
    try {
      const indexer = algorand.client.indexer
      const assetInfo = await indexer.lookupAssetByID(assetId).do()
      
      // Find account that holds this asset
      const balances = await indexer.searchForAssets().index(assetId).do()
      
      // Find who currently holds the NFT (amount = 1)
     const holder = assetInfo.asset.params.reserve // Contract is reserve during holding
      
      setTicketHolder(holder || 'Unknown')
      enqueueSnackbar(`Ticket owned by: ${holder?.substring(0, 10)}...`, { variant: 'info' })
    } catch (error) {
      enqueueSnackbar('Failed to verify ticket holder', { variant: 'error' })
      console.error(error)
    } finally {
      setVerifying(false)
    }
  }

  const markScanned = async () => {
    try {
      if (!activeAddress || activeAddress.trim() === '') throw new Error('Please connect your wallet first')
      if (!transactionSigner) throw new Error('Wallet signer unavailable')
      if (!appId || appId <= 0) throw new Error('Enter valid App ID')
      const assetId = Number(ticketAssetId)
      if (!assetId || assetId <= 0) throw new Error('Enter valid ticket asset ID')
      
      setLoading(true)

      // TODO: Call TicketContract mark_scanned method
      // const client = new TicketContractClient({ 
      //   appId: BigInt(appId), 
      //   algorand, 
      //   defaultSigner: transactionSigner 
      // })
      // 
      // const res = await client.send.markScanned({ 
      //   args: { ticketAssetId: assetId }, 
      //   sender: activeAddress
      // })
      
      // Placeholder simulation
      const confirmedRound = Math.floor(Math.random() * 1000000) + 30000000
      enqueueSnackbar(`Ticket #${assetId} marked as scanned in round ${confirmedRound}`, { variant: 'success' })
      setTicketAssetId('')
      void refreshScannedTickets()
    } catch (e) {
      enqueueSnackbar(`Scan failed: ${(e as Error).message}`, { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const deployContract = async () => {
    try {
      if (!activeAddress) throw new Error('Connect wallet')
      setDeploying(true)
      // TODO: Deploy TicketContract
      // const factory = new TicketContractFactory({ defaultSender: activeAddress, algorand })
      // const result = await factory.send.create.bare()
      // const newId = Number(result.appClient.appId)
      // setAppId(newId)
      
      // Placeholder
      const simulatedAppId = Math.floor(Math.random() * 1000000) + 10000000
      setAppId(simulatedAppId)
      enqueueSnackbar(`TicketContract deployed. App ID: ${simulatedAppId}`, { variant: 'success' })
    } catch (e) {
      enqueueSnackbar(`Deploy failed: ${(e as Error).message}`, { variant: 'error' })
    } finally {
      setDeploying(false)
    }
  }

  return (
    <dialog id="organizer_panel_modal" className={`modal ${openModal ? 'modal-open' : ''}`}>
      <form method="dialog" className="modal-box max-w-5xl bg-gradient-to-br from-purple-50 to-blue-50">
        {/* Header */}
        <h3 className="font-bold text-3xl mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
          ⚙️ Event Organizer Panel
        </h3>

        {/* App ID Section */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-6 border border-purple-100">
          <label className="text-sm font-semibold text-gray-700 mb-2 block">Event Contract Application ID</label>
          <div className="flex gap-2">
            <input 
              className="input input-bordered flex-1" 
              type="number" 
              value={appId} 
              onChange={(e) => setAppId(e.target.value === '' ? '' : Number(e.target.value))} 
              placeholder="Enter deployed TicketContract App ID" 
            />
            <button 
              className={`btn btn-accent ${deploying ? 'loading' : ''}`} 
              disabled={deploying || !activeAddress} 
              onClick={(e) => { e.preventDefault(); void deployContract() }}
            >
              {deploying ? 'Deploying...' : 'Deploy New'}
            </button>
          </div>
          {appAddress && (
            <div className="alert alert-info text-xs break-all mt-2">
              <span>📍 App Address: {appAddress}</span>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="tabs tabs-boxed bg-white/80 mb-6 shadow-md">
          <button 
            className={`tab tab-lg flex-1 ${activeTab === 'create' ? 'tab-active bg-gradient-to-r from-purple-500 to-blue-500 text-white' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveTab('create') }}
          >
            ➕ Create Event
          </button>
          <button 
            className={`tab tab-lg flex-1 ${activeTab === 'manage' ? 'tab-active bg-gradient-to-r from-purple-500 to-blue-500 text-white' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveTab('manage') }}
          >
            📊 Event Dashboard
          </button>
          <button 
            className={`tab tab-lg flex-1 ${activeTab === 'scan' ? 'tab-active bg-gradient-to-r from-purple-500 to-blue-500 text-white' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveTab('scan') }}
          >
            📱 Scan Tickets
          </button>
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {/* CREATE EVENT TAB */}
          {activeTab === 'create' && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-purple-100">
              <h4 className="font-bold text-xl text-gray-800 mb-4">Create New Event</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control md:col-span-2">
                  <label className="label">
                    <span className="label-text font-semibold">Event Name</span>
                  </label>
                  <input 
                    className="input input-bordered" 
                    placeholder="e.g., Algorand Developer Summit 2026" 
                    value={eventName} 
                    onChange={(e) => setEventName(e.target.value)} 
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Total Capacity</span>
                  </label>
                  <input 
                    className="input input-bordered" 
                    placeholder="e.g., 500" 
                    type="number" 
                    value={totalCapacity} 
                    onChange={(e) => setTotalCapacity(e.target.value)} 
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Ticket Price (ALGO)</span>
                  </label>
                  <input 
                    className="input input-bordered" 
                    placeholder="e.g., 50" 
                    type="number" 
                    step="0.01" 
                    value={ticketPrice} 
                    onChange={(e) => setTicketPrice(e.target.value)} 
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Max Resale Multiplier (%)</span>
                  </label>
                  <input 
                    className="input input-bordered" 
                    placeholder="e.g., 200" 
                    type="number" 
                    value={maxResaleMultiplier} 
                    onChange={(e) => setMaxResaleMultiplier(e.target.value)} 
                  />
                  <label className="label">
                    <span className="label-text-alt text-gray-500">Default: 200% (2x ticket price)</span>
                  </label>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Organizer Royalty (%)</span>
                  </label>
                  <input 
                    className="input input-bordered" 
                    placeholder="e.g., 10" 
                    type="number" 
                    min="0" 
                    max="50" 
                    value={organizerRoyalty} 
                    onChange={(e) => setOrganizerRoyalty(e.target.value)} 
                  />
                  <label className="label">
                    <span className="label-text-alt text-gray-500">Max: 50%</span>
                  </label>
                </div>
              </div>

              <div className="mt-6">
                <button 
                  className={`btn btn-lg w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 ${loading ? 'loading' : ''}`}
                  disabled={loading || !activeAddress}
                  onClick={(e) => { e.preventDefault(); void createEvent() }}
                >
                  {loading ? 'Creating Event...' : '🎪 Create Event'}
                </button>
              </div>

              <div className="alert alert-info mt-4">
                <div className="flex items-start gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current flex-shrink-0 w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span className="text-sm">Event will be created as a smart contract on Algorand blockchain. Save the App ID for future management.</span>
                </div>
              </div>
            </div>
          )}

          {/* EVENT DASHBOARD TAB */}
          {activeTab === 'manage' && (
            <div className="space-y-4">
              {eventDashboard ? (
                <>
                  {/* Dashboard Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-lg">
                      <div className="text-sm opacity-80">Event Name</div>
                      <div className="font-bold text-xl mt-1">{eventDashboard.eventName}</div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-lg">
                      <div className="text-sm opacity-80">Tickets Sold</div>
                      <div className="font-bold text-2xl mt-1">{eventDashboard.soldTickets} / {eventDashboard.totalTickets}</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white shadow-lg">
                      <div className="text-sm opacity-80">Ticket Price</div>
                      <div className="font-bold text-2xl mt-1">{eventDashboard.ticketPrice} Ⱥ</div>
                    </div>
                    <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-4 text-white shadow-lg">
                      <div className="text-sm opacity-80">Total Revenue</div>
                      <div className="font-bold text-2xl mt-1">{eventDashboard.revenue} Ⱥ</div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="bg-white rounded-xl shadow-md p-4 border border-purple-100">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">Sales Progress</span>
                      <span className="text-sm font-semibold text-purple-600">
                        {Math.round((eventDashboard.soldTickets / eventDashboard.totalTickets) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-blue-500 h-4 rounded-full transition-all duration-300"
                        style={{ width: `${(eventDashboard.soldTickets / eventDashboard.totalTickets) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Scanned Tickets Table */}
                  <div className="bg-white rounded-xl shadow-md p-4 border border-purple-100">
                    <div className="flex justify-between items-center mb-3">
                      <h5 className="font-bold text-lg text-gray-800">Recently Scanned Tickets</h5>
                      <button 
                        className="btn btn-sm btn-ghost" 
                        onClick={(e) => { e.preventDefault(); void refreshScannedTickets() }}
                      >
                        🔄 Refresh
                      </button>
                    </div>
                    <div className="overflow-x-auto max-h-64">
                      {scannedTickets.length === 0 ? (
                        <div className="text-sm text-gray-500 text-center py-4">No tickets scanned yet.</div>
                      ) : (
                        <table className="table table-zebra w-full">
                          <thead>
                            <tr>
                              <th>Ticket ID</th>
                              <th>Round</th>
                              <th>Scanned By</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {scannedTickets.slice(0, 10).map((ticket) => (
                              <tr key={ticket.id}>
                                <td className="font-mono">#{ticket.ticketId || 'N/A'}</td>
                                <td>{ticket.round}</td>
                                <td className="font-mono text-xs">{ticket.scannedBy.slice(0, 8)}...</td>
                                <td>
                                  <a 
                                    href={`https://lora.algokit.io/testnet/transaction/${ticket.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 underline text-xs"
                                  >
                                    View
                                  </a>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-white rounded-xl shadow-md p-8 border border-purple-100 text-center">
                  <div className="text-6xl mb-4">📊</div>
                  <h4 className="font-bold text-xl text-gray-800 mb-2">No Event Data</h4>
                  <p className="text-gray-600">Enter an App ID or create a new event to view dashboard</p>
                </div>
              )}
            </div>
          )}

          {/* SCAN TICKETS TAB */}
          {activeTab === 'scan' && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-purple-100">
              <h4 className="font-bold text-xl text-gray-800 mb-4">Scan & Validate Tickets</h4>
              
              <div className="bg-gradient-to-r from-purple-100 to-blue-100 rounded-xl p-4 mb-6">
                <p className="text-gray-700 text-sm">
                  📱 Enter the Ticket Asset ID to mark it as scanned. This validates the ticket at event entry.
                </p>
              </div>

              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text font-semibold">Ticket Asset ID</span>
                </label>
                <div className="flex gap-2">
                  <input 
                    className="input input-bordered input-lg flex-1" 
                    placeholder="e.g., 123456789" 
                    type="number" 
                    value={ticketAssetId} 
                    onChange={(e) => {
                      setTicketAssetId(e.target.value)
                      setTicketHolder('') // Reset holder when ID changes
                    }} 
                  />
                  {/* WHY: Add button to verify ticket ownership
                      REASON: Security - organizer can confirm who owns the ticket NFT
                      before scanning to prevent fraud (screenshots, expired transfers) */}
                  <button
                    className={`btn btn-outline btn-info ${verifying ? 'loading' : ''}`}
                    onClick={(e) => { e.preventDefault(); void verifyTicketHolder() }}
                    disabled={verifying || !ticketAssetId}
                  >
                    🔍 Verify Owner
                  </button>
                </div>
                {ticketHolder && (
                  <label className="label">
                    <span className="label-text-alt text-info font-mono">
                      Current Owner: {ticketHolder.substring(0, 20)}...{ticketHolder.substring(ticketHolder.length - 10)}
                    </span>
                  </label>
                )}
              </div>

              <button 
                className={`btn btn-lg w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 ${loading ? 'loading' : ''}`}
                disabled={loading || !activeAddress || !appId}
                onClick={(e) => { e.preventDefault(); void markScanned() }}
              >
                {loading ? 'Scanning...' : '✓ Mark as Scanned'}
              </button>

              {/* Recent Scans */}
              <div className="divider">Recent Scans</div>
              <div className="max-h-64 overflow-auto bg-gray-50 rounded-lg p-3">
                {scannedTickets.length === 0 ? (
                  <div className="text-sm text-gray-500 text-center py-4">No tickets scanned yet.</div>
                ) : (
                  <ul className="space-y-2">
                    {scannedTickets.slice(0, 5).map((ticket) => (
                      <li key={ticket.id} className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-mono font-bold text-purple-600">#{ticket.ticketId || 'N/A'}</span>
                            <span className="text-xs text-gray-500 ml-2">Round {ticket.round}</span>
                          </div>
                          <div className="badge badge-success">✓ Scanned</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-action mt-6">
          <button className="btn btn-ghost" onClick={closeModal} disabled={loading}>Close</button>
          <button 
            className="btn btn-outline btn-primary" 
            onClick={(e) => { 
              e.preventDefault(); 
              void refreshEventDashboard()
              void refreshScannedTickets()
              void refreshResaleListings()
            }}
            disabled={loading}
          >
            🔄 Refresh All
          </button>
        </div>
      </form>
    </dialog>
  )
}

export default Bank


