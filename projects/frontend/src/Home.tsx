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
import { Button } from './components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Badge } from './components/ui/badge'
import { Progress } from './components/ui/progress'
import { Separator } from './components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './components/ui/tooltip'
import {
  Ticket, ShoppingCart, RefreshCw, Settings, QrCode, Wallet, Activity, MapPin, Calendar, DollarSign, Users, TrendingUp, ArrowRight, Shield, Zap, Globe
} from 'lucide-react'

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

  const salesPercent = totalTickets > 0 ? Math.round((ticketsSold / totalTickets) * 100) : 0

  return (
    <TooltipProvider>
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* ── Top Nav ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Ticket className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold tracking-tight">TicketChain</span>
            </div>
            <Badge variant="outline" className="text-[11px] border-primary/30 text-primary font-medium">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
              Algorand TestNet
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            {activeAddress && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className="hidden sm:flex gap-1.5 py-1.5 px-3 font-mono text-xs">
                    <Activity className="h-3 w-3 text-emerald-500" />
                    {activeAddress.slice(0, 6)}...{activeAddress.slice(-4)}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{activeAddress}</p>
                </TooltipContent>
              </Tooltip>
            )}
            <Button
              data-test-id="connect-wallet"
              variant={activeAddress ? 'outline' : 'default'}
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                toggleWalletModal()
              }}
              type="button"
              className={activeAddress ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' : ''}
            >
              <Wallet className="h-4 w-4" />
              {activeAddress ? 'Connected' : 'Connect Wallet'}
            </Button>
          </div>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        {/* Hero */}
        <section className="text-center pt-6 pb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Shield className="h-3.5 w-3.5" />
            Powered by Algorand Blockchain
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text">
            Blockchain Event Ticketing
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-8">
            Secure NFT tickets on Algorand. No scalpers, no fraud, full transparency. 
            Every ticket is verifiable on-chain.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-amber-500" />
              <span>Instant Delivery</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-emerald-500" />
              <span>Anti-Scalping</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-blue-500" />
              <span>On-Chain Verified</span>
            </div>
          </div>
        </section>

        {/* ── Live Event Status ───────────────────────────── */}
        <Card className="mb-8 animate-slide-up overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {totalTickets > 0 && (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                )}
                <CardTitle className="text-lg">Live Event Status</CardTitle>
              </div>
              {totalTickets > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
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
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  Reset
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {totalTickets > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* Event Name */}
                <Card className="col-span-2 md:col-span-1 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                  <CardContent className="pt-5 pb-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Event</p>
                    <p className="text-lg font-semibold">{eventLoading ? '...' : eventName}</p>
                  </CardContent>
                </Card>

                {/* Tickets Sold */}
                <Card className="bg-muted/50">
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tickets Sold</p>
                    </div>
                    <p className="text-2xl font-bold">{ticketsSold}<span className="text-sm font-normal text-muted-foreground"> / {totalTickets}</span></p>
                    <Progress value={salesPercent} className="mt-3 h-1.5" />
                    <p className="text-xs text-muted-foreground mt-1.5">{totalTickets - ticketsSold} remaining</p>
                  </CardContent>
                </Card>

                {/* Ticket Price */}
                <Card className="bg-muted/50">
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ticket Price</p>
                    </div>
                    <p className="text-2xl font-bold">{ticketPrice} <span className="text-sm font-normal text-muted-foreground">ALGO</span></p>
                  </CardContent>
                </Card>

                {/* Max Resale */}
                <Card className="bg-muted/50">
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Max Resale</p>
                    </div>
                    <p className="text-2xl font-bold">{maxResalePrice} <span className="text-sm font-normal text-muted-foreground">ALGO</span></p>
                  </CardContent>
                </Card>

                {/* Event Date */}
                <Card className="bg-muted/50">
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</p>
                    </div>
                    <p className="text-sm font-semibold">
                      {eventDate > 0 ? new Date(eventDate * 1000).toLocaleDateString('en-US', { 
                        month: 'short', day: 'numeric', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      }) : 'Not set'}
                    </p>
                    {eventDate > 0 && Date.now() / 1000 > eventDate && (
                      <Badge variant="destructive" className="mt-2 text-[10px]">Expired</Badge>
                    )}
                    {eventDate > 0 && Date.now() / 1000 <= eventDate && (
                      <Badge variant="success" className="mt-2 text-[10px]">Upcoming</Badge>
                    )}
                  </CardContent>
                </Card>

                {/* Location */}
                <Card className="bg-muted/50">
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Location</p>
                    </div>
                    <p className="text-sm font-semibold">{eventLocation || 'TBD'}</p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="font-semibold mb-1">
                  {SINGLE_ORGANIZER_MODE ? 'Event not configured' : 'No event deployed'}
                </p>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  {SINGLE_ORGANIZER_MODE 
                    ? 'The event organizer needs to set up the contract first' 
                    : 'Create an event from the Organizer Panel to see live data here'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── For Attendees ────────────────────────────────── */}
        <section className="mb-10">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="h-5 w-1.5 rounded-full bg-primary"></div>
            <h2 className="text-lg font-semibold">For Attendees</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Purchase Tickets */}
            <Card className="group hover:border-primary/30 transition-all duration-300 hover:shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                    <Ticket className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base">Purchase Tickets</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0 flex flex-col flex-grow">
                <CardDescription className="mb-5 leading-relaxed">
                  Buy verified tickets minted as NFTs on Algorand. Instant delivery to your wallet.
                </CardDescription>
                <Button
                  className="w-full mt-auto group/btn"
                  disabled={!activeAddress}
                  onClick={() => navigate('/purchase')}
                >
                  {activeAddress ? (
                    <>Buy Tickets <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" /></>
                  ) : (
                    <>
                      <Wallet className="h-4 w-4" /> Connect Wallet First
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Resale Marketplace */}
            <Card className="group hover:border-cyan-500/30 transition-all duration-300 hover:shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white transition-all duration-300">
                    <RefreshCw className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base">Resale Marketplace</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0 flex flex-col flex-grow">
                <CardDescription className="mb-5 leading-relaxed">
                  Buy and sell tickets with built-in price controls and automated royalty distribution.
                </CardDescription>
                <Button
                  className="w-full mt-auto group/btn"
                  disabled={!activeAddress}
                  onClick={() => navigate('/marketplace')}
                >
                  {activeAddress ? (
                    <>Explore Marketplace <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" /></>
                  ) : (
                    <>
                      <Wallet className="h-4 w-4" /> Connect Wallet First
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ── For Organizers ───────────────────────────────── */}
        <section className="mb-10">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="h-5 w-1.5 rounded-full bg-violet-600"></div>
            <h2 className="text-lg font-semibold">For Organizers</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Organizer Panel */}
            <Card className="group hover:border-violet-500/30 transition-all duration-300 hover:shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-600 group-hover:bg-violet-600 group-hover:text-white transition-all duration-300">
                    <Settings className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base">Organizer Panel</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0 flex flex-col flex-grow">
                <CardDescription className="mb-5 leading-relaxed">
                  Create events, set pricing, manage capacity, and monitor real-time sales.
                </CardDescription>
                <Button
                  className="w-full mt-auto group/btn"
                  disabled={!activeAddress}
                  onClick={() => navigate('/organizer')}
                >
                  {activeAddress ? (
                    <>Manage Events <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" /></>
                  ) : (
                    <>
                      <Wallet className="h-4 w-4" /> Connect Wallet First
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Scan Tickets */}
            <Card className="group hover:border-pink-500/30 transition-all duration-300 hover:shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-600 group-hover:bg-pink-600 group-hover:text-white transition-all duration-300">
                    <QrCode className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base">Scan Tickets</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0 flex flex-col flex-grow">
                <CardDescription className="mb-5 leading-relaxed">
                  Validate ticket authenticity at entry with QR scanner and on-chain verification.
                </CardDescription>
                <Button
                  className="w-full mt-auto group/btn"
                  disabled={!activeAddress}
                  onClick={() => navigate('/organizer?tab=scan')}
                >
                  {activeAddress ? (
                    <>Scan Tickets <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" /></>
                  ) : (
                    <>
                      <Wallet className="h-4 w-4" /> Connect Wallet First
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t pt-8 pb-6 mt-12">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
                <Ticket className="h-3 w-3 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">TicketChain</span>
            </div>
            <p>Built on Algorand &mdash; Transparent, secure, decentralized.</p>
          </div>
        </footer>
      </main>

      <ConnectWallet openModal={openWalletModal} closeModal={toggleWalletModal} />
      <AppCalls openModal={appCallsDemoModal} setModalState={setAppCallsDemoModal} />
      <SendAlgo openModal={sendAlgoModal} closeModal={() => setSendAlgoModal(false)} />
      <MintNFT openModal={mintNftModal} closeModal={() => setMintNftModal(false)} />
      <CreateASA openModal={createAsaModal} closeModal={() => setCreateAsaModal(false)} />
      <AssetOptIn openModal={assetOptInModal} closeModal={() => setAssetOptInModal(false)} />
      <Bank openModal={bankModal} closeModal={() => setBankModal(false)} />
    </div>
    </TooltipProvider>
  )
}

export default Home
