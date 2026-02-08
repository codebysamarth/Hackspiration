// src/components/Home.tsx
import { useWallet } from '@txnlab/use-wallet-react'
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ConnectWallet from './components/ConnectWallet'
import AppCalls from './components/AppCalls'
import SendAlgo from './components/SendAlgo'
import MintNFT from './components/MintNFT'
import CreateASA from './components/CreateASA'
import AssetOptIn from './components/AssetOptIn'
import Bank from './components/Bank'

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

  // Event data state (placeholder values - will be fetched from contract)
  const [eventName] = useState<string>('Algorand Developer Summit 2026')
  const [ticketsAvailable] = useState<number>(250)
  const [totalTickets] = useState<number>(500)
  const [ticketPrice] = useState<number>(50)
  const [maxResalePrice] = useState<number>(75)

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
            <h2 className="text-2xl font-bold text-white mb-6 text-center">🎪 Live Event Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <p className="text-purple-300 text-sm uppercase tracking-wide mb-2">Event Name</p>
                <p className="text-white text-xl font-semibold">{eventName}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <p className="text-purple-300 text-sm uppercase tracking-wide mb-2">Availability</p>
                <p className="text-white text-xl font-semibold">
                  {ticketsAvailable} / {totalTickets} tickets
                </p>
                <div className="w-full bg-white/10 rounded-full h-2 mt-3">
                  <div 
                    className="bg-gradient-to-r from-purple-400 to-blue-400 h-2 rounded-full transition-all"
                    style={{ width: `${(ticketsAvailable / totalTickets) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <p className="text-purple-300 text-sm uppercase tracking-wide mb-2">Ticket Price</p>
                <p className="text-white text-xl font-semibold">{ticketPrice} ALGO</p>
              </div>
              <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <p className="text-purple-300 text-sm uppercase tracking-wide mb-2">Max Resale Price</p>
                <p className="text-white text-xl font-semibold">{maxResalePrice} ALGO</p>
              </div>
            </div>
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
                  onClick={() => navigate('/organizer')}
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
