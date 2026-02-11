import { useWallet } from '@txnlab/use-wallet-react'
import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from './utils/network/getAlgoClientConfigs'
import { TicketContractFactory } from './contracts/TicketContract'
import { ORGANIZER_ADDRESS, HARDCODED_APP_ID, SINGLE_ORGANIZER_MODE } from './config/organizerConfig'
import ConnectWallet from './components/ConnectWallet.js'
import AppCalls from './components/AppCalls.js'
import SendAlgo from './components/SendAlgo.js'
import MintNFT from './components/MintNFT.js'
import CreateASA from './components/CreateASA.js'
import AssetOptIn from './components/AssetOptIn.js'
import Bank from './components/Bank.js'

interface HomeProps {}

const Home: React.FC<HomeProps> = () => {
  const [openWalletModal, setOpenWalletModal] = useState<boolean>(false)
  const [appCallsDemoModal, setAppCallsDemoModal] = useState<boolean>(false)
  const [sendAlgoModal, setSendAlgoModal] = useState<boolean>(false)
  const [mintNftModal, setMintNftModal] = useState<boolean>(false)
  const [createAsaModal, setCreateAsaModal] = useState<boolean>(false)
  const [assetOptInModal, setAssetOptInModal] = useState<boolean>(false)
  const [bankModal, setBankModal] = useState<boolean>(false)
  const { activeAddress } = useWallet()
  const navigate = useNavigate()

  // Real event data state — fetched from blockchain contract
  const [eventName, setEventName] = useState<string>('No Event Created')
  const [ticketsSold, setTicketsSold] = useState<number>(0)
  const [totalTickets, setTotalTickets] = useState<number>(0)
  const [ticketPrice, setTicketPrice] = useState<number>(0)
  const [maxResalePrice, setMaxResalePrice] = useState<number>(0)
  const [eventDate, setEventDate] = useState<number>(0)
  const [eventLocation, setEventLocation] = useState<string>('')
  const [eventLoading, setEventLoading] = useState<boolean>(false)

  const algorand = useMemo(() => {
    const algodConfig = getAlgodConfigFromViteEnvironment()
    const indexerConfig = getIndexerConfigFromViteEnvironment()
    return AlgorandClient.fromConfig({ algodConfig, indexerConfig })
  }, [])

  // Fetch live event data from deployed contract using state.global (no sender needed)
  useEffect(() => {
    const fetchEventData = async () => {
      // Get App ID: hardcoded in single-organizer mode, otherwise from localStorage
      let appIdToUse: string | null
      if (SINGLE_ORGANIZER_MODE && HARDCODED_APP_ID > BigInt(0)) {
        appIdToUse = HARDCODED_APP_ID.toString()
      } else {
        appIdToUse = localStorage.getItem('TICKET_CONTRACT_APP_ID')
      }
      
      if (!appIdToUse) return

      setEventLoading(true)
      try {
        const appId = BigInt(appIdToUse)
        const factory = new TicketContractFactory({ algorand })
        const client = factory.getAppClientById({ appId })

        // Use state.global.getAll() — reads on-chain state directly, no wallet/sender needed
        const gs = await client.state.global.getAll()
        setEventName(gs.eventName ?? 'Unknown')
        setTotalTickets(Number(gs.totalTickets ?? 0))
        setTicketsSold(Number(gs.ticketsSold ?? 0))
        setTicketPrice(Number(gs.ticketPrice ?? 0) / 1_000_000)
        setMaxResalePrice(Number(gs.maxResalePrice ?? 0) / 1_000_000)
        setEventDate(Number(gs.eventDate ?? 0))
        setEventLocation(gs.eventLocation ?? '')
      } catch (e) {
        console.error('Failed to fetch event data:', e)
        // If the stored App ID is stale / incompatible, clear it (only in multi-organizer mode)
        if (!SINGLE_ORGANIZER_MODE) {
          localStorage.removeItem('TICKET_CONTRACT_APP_ID')
        }
        setTotalTickets(0)
        setEventName(SINGLE_ORGANIZER_MODE ? 'Event not configured' : 'No Event Created')
      } finally {
        setEventLoading(false)
      }
    }

    void fetchEventData()

    // Listen for localStorage changes (only in multi-organizer mode)
    if (!SINGLE_ORGANIZER_MODE) {
      const onStorage = () => void fetchEventData()
      window.addEventListener('storage', onStorage)
      return () => window.removeEventListener('storage', onStorage)
    }
    
    // No cleanup needed in single-organizer mode
    return undefined
  }, [algorand])

  const toggleWalletModal = () => {
    console.log('Toggle wallet modal clicked! Current state:', openWalletModal)
    setOpenWalletModal(!openWalletModal)
  }

  const toggleAppCallsModal = () => {
    setAppCallsDemoModal(!appCallsDemoModal)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-violet-800 to-blue-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-purple-500/20 rounded-full blur-3xl -top-48 -left-48 animate-pulse"></div>
        <div className="absolute w-96 h-96 bg-blue-500/20 rounded-full blur-3xl -bottom-48 -right-48 animate-pulse delay-1000"></div>
      </div>

      {/* Top-right wallet connect button */}
      <div className="absolute top-4 right-4 z-50">
        <button
          data-test-id="connect-wallet"
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-full font-semibold shadow-lg cursor-pointer transition-all"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            toggleWalletModal()
          }}
          type="button"
        >
          {activeAddress ? 'Wallet Connected' : 'Connect Wallet'}
        </button>
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen px-4 py-12">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16 pt-8">
            <h1 className="text-6xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-pink-200 to-blue-200 mb-6 tracking-tight">
              TicketChain
            </h1>
            <p className="text-2xl md:text-3xl text-purple-100 font-light mb-4">
              Blockchain Event Ticketing
            </p>
            <p className="text-lg text-purple-200/80 max-w-2xl mx-auto">
              Secure, transparent, and decentralized ticketing powered by Algorand blockchain
            </p>
          </div>

          {/* Live Event Status Section */}
          <div className="backdrop-blur-lg bg-white/10 rounded-3xl p-8 shadow-2xl border border-white/20 mb-12 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white text-center flex-1">🎪 Live Event Status</h2>
              {totalTickets > 0 && (
                <button
                  className="btn btn-sm btn-ghost text-purple-200 hover:text-white"
                  onClick={() => {
                    localStorage.removeItem('TICKET_CONTRACT_APP_ID')
                    setTotalTickets(0)
                    setEventName('No Event Created')
                    setTicketsSold(0)
                    setTicketPrice(0)
                    setMaxResalePrice(0)
                    setEventDate(0)
                    setEventLocation('')
                    window.dispatchEvent(new Event('storage'))
                  }}
                  title="Clear saved event data and start fresh"
                >
                  🗑️ Reset
                </button>
              )}
            </div>
            {totalTickets > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <p className="text-purple-300 text-sm uppercase tracking-wide mb-2">Event Name</p>
                  <p className="text-white text-xl font-semibold">{eventLoading ? '...' : eventName}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <p className="text-purple-300 text-sm uppercase tracking-wide mb-2">Tickets Sold / Total</p>
                  <p className="text-white text-xl font-semibold">
                    {ticketsSold} / {totalTickets} tickets
                  </p>
                  <div className="w-full bg-white/10 rounded-full h-2 mt-3">
                    <div 
                      className="bg-gradient-to-r from-purple-400 to-blue-400 h-2 rounded-full transition-all"
                      style={{ width: `${totalTickets > 0 ? (ticketsSold / totalTickets) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <p className="text-purple-200/60 text-xs mt-2">{totalTickets - ticketsSold} remaining</p>
                </div>
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <p className="text-purple-300 text-sm uppercase tracking-wide mb-2">Ticket Price</p>
                  <p className="text-white text-xl font-semibold">{ticketPrice} ALGO</p>
                </div>
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <p className="text-purple-300 text-sm uppercase tracking-wide mb-2">Max Resale Price</p>
                  <p className="text-white text-xl font-semibold">{maxResalePrice} ALGO</p>
                </div>
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <p className="text-purple-300 text-sm uppercase tracking-wide mb-2">Event Date</p>
                  <p className="text-white text-xl font-semibold">
                    {eventDate > 0 ? new Date(eventDate * 1000).toLocaleString() : 'Not set'}
                  </p>
                  {eventDate > 0 && Date.now() / 1000 > eventDate && (
                    <span className="badge badge-error mt-2">Expired</span>
                  )}
                  {eventDate > 0 && Date.now() / 1000 <= eventDate && (
                    <span className="badge badge-success mt-2">Upcoming</span>
                  )}
                </div>
                <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <p className="text-purple-300 text-sm uppercase tracking-wide mb-2">Location</p>
                  <p className="text-white text-xl font-semibold">{eventLocation || 'TBD'}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-purple-200/80 text-lg">
                  {SINGLE_ORGANIZER_MODE ? 'Event not configured yet' : 'No event deployed yet'}
                </p>
                <p className="text-purple-300/60 text-sm mt-2">
                  {SINGLE_ORGANIZER_MODE 
                    ? 'The event organizer needs to set up the contract first' 
                    : 'Create an event from the Organizer Panel to see live data here'}
                </p>
              </div>
            )}
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {/* Purchase Tickets */}
            <div className="group relative overflow-hidden backdrop-blur-lg bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-2xl shadow-2xl border border-white/20 hover:border-purple-400/50 transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-6 flex flex-col h-full">
                <div className="text-5xl mb-4">🎫</div>
                <h2 className="text-2xl font-bold text-white mb-3">Purchase Tickets</h2>
                <p className="text-purple-100 mb-6 flex-grow">Buy verified tickets directly from the event organizer</p>
                <button 
                  className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-xl border border-white/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!activeAddress}
                  onClick={() => navigate('/purchase')}
                >
                  Buy Now
                </button>
              </div>
            </div>

            {/* Resale Marketplace */}
            <div className="group relative overflow-hidden backdrop-blur-lg bg-gradient-to-br from-blue-500/30 to-cyan-500/30 rounded-2xl shadow-2xl border border-white/20 hover:border-blue-400/50 transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-6 flex flex-col h-full">
                <div className="text-5xl mb-4">🔄</div>
                <h2 className="text-2xl font-bold text-white mb-3">Resale Marketplace</h2>
                <p className="text-blue-100 mb-6 flex-grow">Buy and sell tickets safely on our peer-to-peer marketplace</p>
                <button 
                  className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-xl border border-white/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!activeAddress}
                  onClick={() => navigate('/marketplace')}
                >
                  Explore
                </button>
              </div>
            </div>

            {/* Organizer Panel */}
            <div className="group relative overflow-hidden backdrop-blur-lg bg-gradient-to-br from-violet-500/30 to-indigo-500/30 rounded-2xl shadow-2xl border border-white/20 hover:border-violet-400/50 transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-6 flex flex-col h-full">
                <div className="text-5xl mb-4">⚙️</div>
                <h2 className="text-2xl font-bold text-white mb-3">Organizer Panel</h2>
                <p className="text-violet-100 mb-6 flex-grow">Create and manage your events with full control</p>
                <button 
                  className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-xl border border-white/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!activeAddress}
                  onClick={() => navigate('/organizer')}
                >
                  Manage
                </button>
              </div>
            </div>

            {/* Scan Tickets */}
            <div className="group relative overflow-hidden backdrop-blur-lg bg-gradient-to-br from-fuchsia-500/30 to-purple-500/30 rounded-2xl shadow-2xl border border-white/20 hover:border-fuchsia-400/50 transition-all duration-300 hover:scale-105">
              <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative p-6 flex flex-col h-full">
                <div className="text-5xl mb-4">📱</div>
                <h2 className="text-2xl font-bold text-white mb-3">Scan Tickets</h2>
                <p className="text-fuchsia-100 mb-6 flex-grow">Validate ticket authenticity at event entry</p>
                <button 
                  className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-xl border border-white/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!activeAddress}
                  onClick={() => navigate('/organizer?tab=scan')}
                >
                  Scan
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConnectWallet openModal={openWalletModal} closeModal={toggleWalletModal} />
      <AppCalls openModal={appCallsDemoModal} setModalState={setAppCallsDemoModal} />
      <SendAlgo openModal={sendAlgoModal} closeModal={() => setSendAlgoModal(false)} />
      <MintNFT openModal={mintNftModal} closeModal={() => setMintNftModal(false)} />
      <CreateASA openModal={createAsaModal} closeModal={() => setCreateAsaModal(false)} />
      <AssetOptIn openModal={assetOptInModal} closeModal={() => setAssetOptInModal(false)} />
      <Bank openModal={bankModal} closeModal={() => setBankModal(false)} />
    </div>
  )
}

export default Home
