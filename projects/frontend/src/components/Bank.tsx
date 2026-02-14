import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import { getApplicationAddress } from 'algosdk'
import { AlgorandClient, algo } from '@algorandfoundation/algokit-utils'
import { TicketContractFactory } from '../contracts/TicketContract'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import { Html5Qrcode } from 'html5-qrcode'
import { ORGANIZER_ADDRESS, HARDCODED_APP_ID, SINGLE_ORGANIZER_MODE } from '../config/organizerConfig'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Progress } from './ui/progress'
import { Separator } from './ui/separator'
import {
  Settings, BarChart3, QrCode, DollarSign, Plus, Camera, CameraOff,
  RefreshCw, Wallet, AlertTriangle, Info, CheckCircle2, Calendar,
  MapPin, Users, TrendingUp, ArrowDownToLine, Eye, RotateCcw,
  ExternalLink, Ticket,
} from 'lucide-react'

interface BankProps {
  openModal: boolean
  closeModal: () => void
}

type ScannedTicket = {
  id: string
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
  eventDate: number
  location: string
}

type RevenueData = {
  primaryRevenue: number
  resaleRevenue: number
  totalRefunded: number
  appBalance: number
}

const Bank = ({ openModal, closeModal }: BankProps) => {
  const { enqueueSnackbar } = useSnackbar()
  const { activeAddress, transactionSigner } = useWallet()
  const algorand = useMemo(() => {
    const algodConfig = getAlgodConfigFromViteEnvironment()
    const indexerConfig = getIndexerConfigFromViteEnvironment()
    return AlgorandClient.fromConfig({ algodConfig, indexerConfig })
  }, [])
  // Single-organizer mode: use hardcoded App ID or localStorage for organizer
  const [appId, setAppId] = useState<number | ''>(() => {
    if (SINGLE_ORGANIZER_MODE && HARDCODED_APP_ID > BigInt(0)) {
      return Number(HARDCODED_APP_ID)
    }
    const stored = localStorage.getItem('TICKET_CONTRACT_APP_ID')
    return stored ? Number(stored) : ''
  })

  // Create Event form
  const [eventName, setEventName] = useState('')
  const [totalCapacity, setTotalCapacity] = useState('')
  const [ticketPrice, setTicketPrice] = useState('')
  const [maxResaleMultiplier, setMaxResaleMultiplier] = useState('200')
  const [organizerRoyalty, setOrganizerRoyalty] = useState('10')
  const [eventDate, setEventDate] = useState('')
  const [eventLocation, setEventLocation] = useState('')

  // Scan
  const [ticketAssetId, setTicketAssetId] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'create' | 'manage' | 'scan' | 'revenue'>(() => {
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab')
    if (tab === 'scan' || tab === 'manage' || tab === 'revenue') return tab
    return 'create'
  })
  const [scannedTickets, setScannedTickets] = useState<ScannedTicket[]>([])
  const [eventDashboard, setEventDashboard] = useState<EventDashboard | null>(null)
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null)
  const [ticketHolder, setTicketHolder] = useState('')
  const [verifying, setVerifying] = useState(false)

  // QR Scanner
  const [scannerActive, setScannerActive] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const scannerContainerId = 'qr-reader'

  useEffect(() => { algorand.setDefaultSigner(transactionSigner) }, [algorand, transactionSigner])

  useEffect(() => {
    // Only organizer can save App ID to localStorage in single-organizer mode
    if (appId && Number(appId) > 0) {
      if (!SINGLE_ORGANIZER_MODE || activeAddress === ORGANIZER_ADDRESS) {
        localStorage.setItem('TICKET_CONTRACT_APP_ID', String(appId))
      }
    }
  }, [appId, activeAddress])

  const appAddress = useMemo(() => (appId && appId > 0 ? String(getApplicationAddress(appId)) : ''), [appId])

  // ─── Box key builder ──────────────────────────────────────
  const buildBoxKey = useCallback((prefix: string, id: number | bigint) => {
    const key = new Uint8Array(prefix.length + 8)
    new TextEncoder().encode(prefix).forEach((b, i) => { key[i] = b })
    new DataView(key.buffer, prefix.length, 8).setBigUint64(0, BigInt(id), false)
    return key
  }, [])

  // ─── Data refresh (uses state.global — no sender/wallet needed) ───
  const refreshEventDashboard = async () => {
    try {
      if (!appId) return
      const factory = new TicketContractFactory({ algorand })
      const client = factory.getAppClientById({ appId: BigInt(appId) })
      const gs = await client.state.global.getAll()
      setEventDashboard({
        eventName: gs.eventName ?? 'Unknown',
        totalTickets: Number(gs.totalTickets ?? 0),
        soldTickets: Number(gs.ticketsSold ?? 0),
        ticketPrice: Number(gs.ticketPrice ?? 0) / 1e6,
        revenue: Number(gs.ticketsSold ?? 0) * Number(gs.ticketPrice ?? 0) / 1e6,
        eventDate: Number(gs.eventDate ?? 0),
        location: gs.eventLocation ?? 'TBD',
      })
    } catch (e) {
      console.error('Dashboard refresh error:', e)
      setEventDashboard(null)
    }
  }

  const refreshRevenueData = async () => {
    try {
      if (!appId) return
      const factory = new TicketContractFactory({ algorand })
      const client = factory.getAppClientById({ appId: BigInt(appId) })
      const gs = await client.state.global.getAll()
      let balance = 0
      try {
        const acct = await algorand.client.algod.accountInformation(appAddress).do()
        balance = Number(acct.amount) / 1e6
      } catch { /* app may not exist yet */ }
      setRevenueData({
        primaryRevenue: Number(gs.totalPrimaryRevenue ?? 0) / 1e6,
        resaleRevenue: Number(gs.totalResaleRevenue ?? 0) / 1e6,
        totalRefunded: Number(gs.totalRefunded ?? 0) / 1e6,
        appBalance: balance,
      })
    } catch (e) {
      console.error('Revenue refresh error:', e)
      setRevenueData(null)
    }
  }

  const refreshScannedTickets = async () => {
    try {
      if (!appId) return
      const algod = algorand.client.algod
      const boxesResp = await algod.getApplicationBoxes(appId as number).do()
      const list: ScannedTicket[] = []
      for (const box of boxesResp.boxes) {
        const nameBytes = new Uint8Array(box.name)
        const prefix = String.fromCharCode(...nameBytes.slice(0, 8))
        if (!prefix.startsWith('scanned_') || nameBytes.length < 16) continue
        const tid = Number(new DataView(nameBytes.buffer, nameBytes.byteOffset + 8, 8).getBigUint64(0, false))
        const bd = await algod.getApplicationBoxByName(appId as number, box.name).do()
        const val = bd.value as Uint8Array
        const ts = val.length >= 8 ? Number(new DataView(val.buffer, val.byteOffset, 8).getBigUint64(0, false)) : 0
        list.push({ id: `s_${tid}`, ticketId: tid, scannedBy: activeAddress || 'unknown', timestamp: ts })
      }
      setScannedTickets(list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)))
    } catch { setScannedTickets([]) }
  }

  // ─── Create Event ─────────────────────────────────────────
  const createEvent = async () => {
    try {
      if (!activeAddress) throw new Error('Connect wallet first')
      if (!transactionSigner) throw new Error('Wallet signer unavailable')
      if (!eventName.trim()) throw new Error('Enter event name')
      const cap = Number(totalCapacity); if (!cap || cap <= 0) throw new Error('Enter valid capacity')
      const price = Number(ticketPrice); if (!price || price <= 0) throw new Error('Enter valid ticket price')
      const resM = Number(maxResaleMultiplier); if (!resM || resM < 100) throw new Error('Resale multiplier >= 100%')
      const roy = Number(organizerRoyalty); if (roy < 0 || roy > 50) throw new Error('Royalty 0-50%')
      if (!eventDate) throw new Error('Select event date & time')
      const evTs = BigInt(Math.floor(new Date(eventDate).getTime() / 1000))
      if (evTs <= BigInt(Math.floor(Date.now() / 1000))) throw new Error('Event date must be in the future')

      setLoading(true)
      enqueueSnackbar('Approve transactions in wallet...', { variant: 'info' })
      algorand.setDefaultSigner(transactionSigner)
      const factory = new TicketContractFactory({ algorand, defaultSender: activeAddress })

      enqueueSnackbar('Step 1/3: Creating application...', { variant: 'info' })
      const { appClient } = await factory.send.create.bare({ sender: activeAddress, validityWindow: 30 })

      enqueueSnackbar('Step 2/3: Funding app account...', { variant: 'info' })
      await algorand.send.payment({
        sender: activeAddress, receiver: String(getApplicationAddress(Number(appClient.appId))),
        amount: algo(0.3), signer: transactionSigner, validityWindow: 30,
      })

      enqueueSnackbar('Step 3/3: Initializing event...', { variant: 'info' })
      await appClient.send.createEvent({
        args: {
          name: eventName, capacity: BigInt(cap), price: BigInt(Math.round(price * 1e6)),
          maxResaleMultiplier: BigInt(resM), royalty: BigInt(roy),
          eventDate: evTs, location: eventLocation || 'TBD',
        },
        sender: activeAddress, validityWindow: 30,
      })

      const newId = Number(appClient.appId)
      setAppId(newId)
      localStorage.setItem('TICKET_CONTRACT_APP_ID', String(newId))
      enqueueSnackbar(`Event "${eventName}" created! App ID: ${newId}`, { variant: 'success' })
      setEventName(''); setTotalCapacity(''); setTicketPrice(''); setMaxResaleMultiplier('200')
      setOrganizerRoyalty('10'); setEventDate(''); setEventLocation('')
      void refreshEventDashboard()
    } catch (e) {
      const m = (e as Error).message
      if (m.includes('cancelled') || m.includes('rejected') || m.includes('user denied'))
        enqueueSnackbar('Transaction cancelled', { variant: 'warning' })
      else enqueueSnackbar(`Error: ${m}`, { variant: 'error' })
    } finally { setLoading(false) }
  }

  // ─── Verify ticket holder ─────────────────────────────────
  const verifyTicketHolder = async () => {
    const id = Number(ticketAssetId)
    if (!id || id <= 0) { enqueueSnackbar('Enter valid asset ID', { variant: 'warning' }); return }
    setVerifying(true)
    try {
      const bal = await algorand.client.indexer.lookupAssetBalances(id).do()
      const holders = (bal.balances || []).filter((b: any) => Number(b.amount) > 0)
      if (holders.length) { setTicketHolder(holders[0].address); enqueueSnackbar(`Owner: ${holders[0].address.substring(0, 10)}...`, { variant: 'info' }) }
      else { setTicketHolder('No holder found'); enqueueSnackbar('No holder found', { variant: 'warning' }) }
    } catch { enqueueSnackbar('Verification failed', { variant: 'error' }) }
    finally { setVerifying(false) }
  }

  // ─── Mark scanned ─────────────────────────────────────────
  const markScanned = async (override?: number) => {
    try {
      if (!activeAddress || !transactionSigner) throw new Error('Connect wallet first')
      if (!appId || appId <= 0) throw new Error('No App ID')
      const aid = override || Number(ticketAssetId)
      if (!aid || aid <= 0) throw new Error('Enter valid asset ID')
      setLoading(true)
      const factory = new TicketContractFactory({ algorand })
      const client = factory.getAppClientById({ appId: BigInt(appId) })
      const bk = buildBoxKey('scanned_', aid)
      try {
        const c = await client.send.isScanned({ args: { ticketId: BigInt(aid) }, sender: activeAddress, signer: transactionSigner, boxReferences: [{ appId: BigInt(appId), name: bk }] })
        if (c.return) { enqueueSnackbar(`#${aid} already scanned!`, { variant: 'warning' }); return }
      } catch { /* not scanned */ }
      await client.send.markScanned({ args: { ticketId: BigInt(aid) }, sender: activeAddress, signer: transactionSigner, boxReferences: [{ appId: BigInt(appId), name: bk }], extraFee: algo(0.001) })
      enqueueSnackbar(`Ticket #${aid} scanned!`, { variant: 'success' })
      setTicketAssetId(''); setTicketHolder('')
      void refreshScannedTickets()
    } catch (e) {
      const m = (e as Error).message
      if (m.includes('Only event organizer')) enqueueSnackbar('Only organizer can scan', { variant: 'error' })
      else if (m.includes('already scanned')) enqueueSnackbar('Already scanned!', { variant: 'error' })
      else enqueueSnackbar(`Scan failed: ${m}`, { variant: 'error' })
    } finally { setLoading(false) }
  }

  // ─── Withdraw ─────────────────────────────────────────────
  const withdrawRevenue = async () => {
    try {
      if (!activeAddress || !appId) throw new Error('No session')
      setLoading(true)
      const factory = new TicketContractFactory({ algorand })
      const client = factory.getAppClientById({ appId: BigInt(appId) })
      const r = await client.send.withdrawRevenue({ args: [], sender: activeAddress, signer: transactionSigner, extraFee: algo(0.001) })
      enqueueSnackbar(`Withdrew ${(Number(r.return!) / 1e6).toFixed(4)} ALGO!`, { variant: 'success' })
      void refreshRevenueData()
    } catch (e) {
      const m = (e as Error).message
      if (m.includes('Cannot withdraw before')) enqueueSnackbar('Cannot withdraw before event date', { variant: 'warning' })
      else enqueueSnackbar(`Withdraw failed: ${m}`, { variant: 'error' })
    } finally { setLoading(false) }
  }

  // ─── QR Camera Scanner ────────────────────────────────────
  const startScanner = useCallback(async () => {
    if (scannerRef.current) return
    try {
      const qr = new Html5Qrcode(scannerContainerId)
      scannerRef.current = qr
      setScannerActive(true)
      await qr.start(
        { facingMode: 'environment' }, { fps: 10, qrbox: { width: 250, height: 250 } },
        (text: string) => {
          const parsed = parseInt(text.replace(/\D/g, ''), 10)
          if (parsed > 0) {
            setTicketAssetId(String(parsed))
            enqueueSnackbar(`QR: Asset ID ${parsed}`, { variant: 'info' })
            void stopScanner()
            void markScanned(parsed)
          } else enqueueSnackbar('Invalid QR', { variant: 'warning' })
        },
        () => {},
      )
    } catch (e) {
      enqueueSnackbar(`Camera error: ${(e as Error).message}`, { variant: 'error' })
      setScannerActive(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, activeAddress])

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop() } catch {}
      try { scannerRef.current.clear() } catch {}
      scannerRef.current = null
    }
    setScannerActive(false)
  }, [])

  useEffect(() => { if (!openModal) void stopScanner() }, [openModal, stopScanner])

  useEffect(() => {
    if (openModal && appId) {
      void refreshEventDashboard(); void refreshScannedTickets(); void refreshRevenueData()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openModal, appId])

  // Check if current user is the organizer
  const isOrganizer = !SINGLE_ORGANIZER_MODE || activeAddress === ORGANIZER_ADDRESS
  const canCreateEvents = isOrganizer
  const canManageEvents = isOrganizer

  const fmtDate = (ts: number) => ts > 0 ? new Date(ts * 1000).toLocaleString() : 'Not set'
  const isPast = (ts: number) => ts > 0 && Date.now() / 1000 > ts

  return (
    <Dialog open={openModal} onOpenChange={(open) => { if (!open) closeModal() }}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            {isOrganizer ? 'Event Organizer Panel' : 'Event Dashboard'}
          </DialogTitle>
          <DialogDescription>Manage your events and scan tickets</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
          {/* Viewer-mode banner */}
          {SINGLE_ORGANIZER_MODE && !isOrganizer && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Info className="w-5 h-5 text-primary flex-shrink-0" />
              <p className="text-sm"><strong>Viewer Mode.</strong> Only the organizer can create and manage events.</p>
            </div>
          )}

          {/* Contract info bar */}
          {appId && Number(appId) > 0 && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contract</span>
                <p className="text-sm font-mono font-semibold">App ID: {appId}</p>
              </div>
              <div className="flex items-center gap-2">
                {eventDashboard && isPast(eventDashboard.eventDate)
                  ? <Badge variant="destructive">Expired</Badge>
                  : <Badge variant="success">Active</Badge>}
                {canManageEvents && !SINGLE_ORGANIZER_MODE && (
                  <Button variant="ghost" size="sm" onClick={e => {
                    e.preventDefault()
                    localStorage.removeItem('TICKET_CONTRACT_APP_ID')
                    setAppId('')
                    setEventDashboard(null)
                    setRevenueData(null)
                    setScannedTickets([])
                    setActiveTab('create')
                    window.dispatchEvent(new Event('storage'))
                  }}>
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="w-full">
              {canCreateEvents && <TabsTrigger value="create" className="flex-1"><Plus className="h-3.5 w-3.5 mr-1.5" />Create</TabsTrigger>}
              <TabsTrigger value="manage" className="flex-1"><BarChart3 className="h-3.5 w-3.5 mr-1.5" />Dashboard</TabsTrigger>
              <TabsTrigger value="scan" className="flex-1"><QrCode className="h-3.5 w-3.5 mr-1.5" />Scanner</TabsTrigger>
              <TabsTrigger value="revenue" className="flex-1"><DollarSign className="h-3.5 w-3.5 mr-1.5" />Revenue</TabsTrigger>
            </TabsList>

            {/* ─── CREATE EVENT ──────── */}
            {canCreateEvents && (
              <TabsContent value="create" className="space-y-5 mt-5">
                <h4 className="text-lg font-semibold flex items-center gap-2"><Plus className="h-4 w-4 text-primary" />Create New Event</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="eventName">Event Name</Label>
                    <Input id="eventName" className="mt-1.5" placeholder="e.g., Algorand Developer Summit 2026" value={eventName} onChange={e => setEventName(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="eventDate">Event Date & Time</Label>
                    <Input id="eventDate" className="mt-1.5" type="datetime-local" value={eventDate} onChange={e => setEventDate(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="eventLocation">Location</Label>
                    <Input id="eventLocation" className="mt-1.5" placeholder="e.g., Pune, India" value={eventLocation} onChange={e => setEventLocation(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="totalCapacity">Total Capacity</Label>
                    <Input id="totalCapacity" className="mt-1.5" placeholder="500" type="number" value={totalCapacity} onChange={e => setTotalCapacity(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="ticketPrice">Ticket Price (ALGO)</Label>
                    <Input id="ticketPrice" className="mt-1.5" placeholder="50" type="number" step="0.01" value={ticketPrice} onChange={e => setTicketPrice(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="maxResale">Max Resale (%)</Label>
                    <Input id="maxResale" className="mt-1.5" placeholder="200" type="number" value={maxResaleMultiplier} onChange={e => setMaxResaleMultiplier(e.target.value)} />
                    <p className="text-xs text-muted-foreground mt-1">200% = max 2x original price</p>
                  </div>
                  <div>
                    <Label htmlFor="royalty">Organizer Royalty (%)</Label>
                    <Input id="royalty" className="mt-1.5" placeholder="10" type="number" min={0} max={50} value={organizerRoyalty} onChange={e => setOrganizerRoyalty(e.target.value)} />
                    <p className="text-xs text-muted-foreground mt-1">Max: 50%</p>
                  </div>
                </div>
                <Button className="w-full h-12 text-base" disabled={loading || !activeAddress} loading={loading}
                  onClick={e => { e.preventDefault(); void createEvent() }}>
                  {!loading && 'Create Event'}
                </Button>
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-xs"><strong>Refund Policy:</strong> 90% before 24h of event, 50% within 24h. No refund after event starts.</p>
                </div>
              </TabsContent>
            )}

            {/* ─── DASHBOARD ───────────────────────────── */}
            <TabsContent value="manage" className="space-y-5 mt-5">
              {eventDashboard ? (<>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Event</p>
                      <p className="text-base font-semibold mt-1">{eventDashboard.eventName}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Users className="h-3 w-3" />Tickets</p>
                      <p className="text-2xl font-bold mt-1">{eventDashboard.soldTickets}<span className="text-sm font-normal text-muted-foreground">/{eventDashboard.totalTickets}</span></p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Ticket className="h-3 w-3" />Price</p>
                      <p className="text-2xl font-bold mt-1">{eventDashboard.ticketPrice} <span className="text-sm font-normal text-muted-foreground">ALGO</span></p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1"><TrendingUp className="h-3 w-3" />Revenue</p>
                      <p className="text-2xl font-bold text-emerald-600 mt-1">{eventDashboard.revenue.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">ALGO</span></p>
                    </CardContent>
                  </Card>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Calendar className="h-3 w-3" />Event Date</p>
                      <p className="text-sm font-semibold mt-1 flex items-center gap-2">
                        {fmtDate(eventDashboard.eventDate)}
                        {isPast(eventDashboard.eventDate) ? <Badge variant="destructive">Expired</Badge> : eventDashboard.eventDate > 0 && <Badge variant="success">Upcoming</Badge>}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1"><MapPin className="h-3 w-3" />Location</p>
                      <p className="text-sm font-semibold mt-1">{eventDashboard.location || 'TBD'}</p>
                    </CardContent>
                  </Card>
                </div>
                {/* Progress bar */}
                <Card>
                  <CardContent className="pt-5">
                    <div className="flex justify-between mb-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sales Progress</span>
                      <span className="text-sm font-semibold text-primary">{eventDashboard.totalTickets > 0 ? Math.round(eventDashboard.soldTickets / eventDashboard.totalTickets * 100) : 0}%</span>
                    </div>
                    <Progress value={eventDashboard.totalTickets > 0 ? eventDashboard.soldTickets / eventDashboard.totalTickets * 100 : 0} />
                  </CardContent>
                </Card>
                {/* Scanned tickets table */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-sm">Scanned Tickets</CardTitle>
                      <Button variant="ghost" size="sm" onClick={e => { e.preventDefault(); void refreshScannedTickets() }}>
                        <RefreshCw className="h-3.5 w-3.5" />Refresh
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {scannedTickets.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No tickets scanned yet</p> : (
                      <div className="overflow-x-auto max-h-48">
                        <table className="w-full text-sm">
                          <thead><tr className="border-b"><th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Asset ID</th><th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Scanned At</th><th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Status</th></tr></thead>
                          <tbody>{scannedTickets.slice(0, 10).map(t => (
                            <tr key={t.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors"><td className="py-2 px-3 font-mono text-primary font-semibold">#{t.ticketId}</td><td className="py-2 px-3 text-muted-foreground">{t.timestamp ? new Date(t.timestamp * 1000).toLocaleString() : '-'}</td><td className="py-2 px-3"><Badge variant="success">Verified</Badge></td></tr>
                          ))}</tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>) : (
                <div className="text-center py-16">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="font-semibold mb-1">No Event Data</p>
                  <p className="text-sm text-muted-foreground">Create an event first to see your dashboard</p>
                </div>
              )}
            </TabsContent>

            {/* ─── SCANNER TAB ──────────── */}
            <TabsContent value="scan" className="space-y-5 mt-5">
              <h4 className="text-lg font-semibold flex items-center gap-2"><QrCode className="h-4 w-4 text-primary" />Scan & Validate Tickets</h4>
              {/* Camera scanner */}
              <Card>
                <CardContent className="pt-5">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-sm font-medium">Camera Scanner</p>
                    <Button
                      variant={scannerActive ? 'destructive' : 'default'}
                      size="sm"
                      onClick={e => { e.preventDefault(); scannerActive ? void stopScanner() : void startScanner() }}
                      disabled={loading}
                    >
                      {scannerActive ? <><CameraOff className="h-3.5 w-3.5" />Stop Camera</> : <><Camera className="h-3.5 w-3.5" />Start Camera</>}
                    </Button>
                  </div>
                  <div id={scannerContainerId} className="w-full max-w-md mx-auto rounded-xl overflow-hidden border-2 border-dashed border-border min-h-[40px] bg-muted/30" />
                  {scannerActive && <p className="text-xs text-center text-primary mt-2 animate-pulse">Point camera at ticket QR code...</p>}
                </CardContent>
              </Card>

              <div className="flex items-center gap-3 text-xs text-muted-foreground"><Separator className="flex-1" />or enter manually<Separator className="flex-1" /></div>

              {/* Manual entry */}
              <div>
                <Label htmlFor="scanAssetId">Ticket Asset ID</Label>
                <div className="flex gap-2 mt-1.5">
                  <Input id="scanAssetId" className="flex-1" placeholder="e.g., 123456789" type="number"
                    value={ticketAssetId} onChange={e => { setTicketAssetId(e.target.value); setTicketHolder('') }} />
                  <Button variant="outline" onClick={e => { e.preventDefault(); void verifyTicketHolder() }} disabled={verifying || !ticketAssetId} loading={verifying}>
                    {!verifying && <><Eye className="h-3.5 w-3.5" />Verify</>}
                  </Button>
                </div>
                {ticketHolder && <p className="text-xs text-muted-foreground mt-1.5 font-mono">Owner: {ticketHolder.substring(0, 20)}...{ticketHolder.slice(-8)}</p>}
              </div>

              <Button className="w-full h-12" variant="success" disabled={loading || !activeAddress || !appId} loading={loading}
                onClick={e => { e.preventDefault(); void markScanned() }}>
                {!loading && <><CheckCircle2 className="h-4 w-4" />Mark as Scanned</>}
              </Button>

              {/* Recent scans */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Recent Scans</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {scannedTickets.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No tickets scanned yet</p> : (
                    <ul className="space-y-2 max-h-48 overflow-auto">{scannedTickets.slice(0, 5).map(t => (
                      <li key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-primary">#{t.ticketId}</span>
                          <span className="text-xs text-muted-foreground">{t.timestamp ? new Date(t.timestamp * 1000).toLocaleString() : ''}</span>
                        </div>
                        <Badge variant="success">Verified</Badge>
                      </li>
                    ))}</ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ─── REVENUE ANALYTICS ───────────────────── */}
            <TabsContent value="revenue" className="space-y-5 mt-5">
              {revenueData ? (<>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ticket Sales</p>
                      <p className="text-2xl font-bold text-emerald-600 mt-1">{revenueData.primaryRevenue.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">ALGO</span></p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Resale Royalties</p>
                      <p className="text-2xl font-bold text-primary mt-1">{revenueData.resaleRevenue.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">ALGO</span></p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Refunds Paid</p>
                      <p className="text-2xl font-bold text-red-500 mt-1">{revenueData.totalRefunded.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">ALGO</span></p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contract Balance</p>
                      <p className="text-2xl font-bold mt-1">{revenueData.appBalance.toFixed(4)} <span className="text-sm font-normal text-muted-foreground">ALGO</span></p>
                    </CardContent>
                  </Card>
                </div>
                <Card className="bg-emerald-50/50 border-emerald-200">
                  <CardContent className="pt-5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Net Revenue</p>
                    <p className="text-3xl font-bold text-emerald-600">{(revenueData.primaryRevenue + revenueData.resaleRevenue - revenueData.totalRefunded).toFixed(2)} <span className="text-base font-normal text-muted-foreground">ALGO</span></p>
                  </CardContent>
                </Card>
                <Button className="w-full h-12" variant="warning"
                  disabled={loading || !activeAddress || !appId || (eventDashboard ? !isPast(eventDashboard.eventDate) : true)}
                  loading={loading}
                  onClick={e => { e.preventDefault(); void withdrawRevenue() }}>
                  {!loading && (
                    eventDashboard && !isPast(eventDashboard.eventDate)
                      ? <><Calendar className="h-4 w-4" />Withdraw After Event ({fmtDate(eventDashboard.eventDate)})</>
                      : <><ArrowDownToLine className="h-4 w-4" />Withdraw Revenue</>
                  )}
                </Button>
                {eventDashboard && !isPast(eventDashboard.eventDate) && <p className="text-xs text-center text-muted-foreground">Revenue locked until event ends to cover refunds</p>}
              </>) : (
                <div className="text-center py-16">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <DollarSign className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="font-semibold mb-1">No Revenue Data</p>
                  <p className="text-sm text-muted-foreground">Create an event first to track revenue</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={closeModal} disabled={loading}>Close</Button>
          <Button variant="outline" size="sm" onClick={e => { e.preventDefault(); void refreshEventDashboard(); void refreshScannedTickets(); void refreshRevenueData() }} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5" />Refresh
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default Bank


