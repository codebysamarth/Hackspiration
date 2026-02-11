import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import { getApplicationAddress } from 'algosdk'
import { AlgorandClient, algo } from '@algorandfoundation/algokit-utils'
import { TicketContractFactory } from '../contracts/TicketContract'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import { Html5Qrcode } from 'html5-qrcode'
import { ORGANIZER_ADDRESS, HARDCODED_APP_ID, SINGLE_ORGANIZER_MODE } from '../config/organizerConfig'

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
    <dialog id="organizer_panel_modal" className={`modal ${openModal ? 'modal-open' : ''}`}>
      <form method="dialog" className="modal-box max-w-5xl bg-gradient-to-br from-purple-50 to-blue-50">
        <h3 className="font-bold text-3xl mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
          {isOrganizer ? '⚙️ Event Organizer Panel' : '📊 Event Dashboard'}
        </h3>

        {/* Single-organizer mode info */}
        {SINGLE_ORGANIZER_MODE && !isOrganizer && (
          <div className="alert alert-info mb-6">
            <div className="text-center w-full">
              <p><strong>Viewer Mode:</strong> You can view event data and scan tickets.</p>
              <p className="text-sm">Only the event organizer can create and manage events.</p>
            </div>
          </div>
        )}

        {appId && Number(appId) > 0 && (
          <div className="bg-white rounded-xl shadow-md p-4 mb-6 border border-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-gray-700">
                  {SINGLE_ORGANIZER_MODE ? 'Event Contract' : 'Active Contract'}
                </span>
                <p className="text-lg font-mono text-purple-700 mt-1">App ID: {appId}</p>
              </div>
              {eventDashboard && isPast(eventDashboard.eventDate)
                ? <span className="badge badge-error badge-lg">Event Expired</span>
                : <span className="badge badge-success badge-lg">Connected</span>}
              {canManageEvents && (
                <button className="btn btn-sm btn-ghost text-gray-500" onClick={e => {
                  e.preventDefault()
                  if (SINGLE_ORGANIZER_MODE) {
                    alert('Cannot reset in single-organizer mode. Contact the organizer.')
                    return
                  }
                  localStorage.removeItem('TICKET_CONTRACT_APP_ID')
                  setAppId('')
                  setEventDashboard(null)
                  setRevenueData(null)
                  setScannedTickets([])
                  setActiveTab('create')
                  window.dispatchEvent(new Event('storage'))
                }} title="Clear saved App ID and start fresh">🗑️</button>
              )}
            </div>
            {appAddress && <div className="text-xs text-gray-500 mt-2 break-all">App Address: {appAddress}</div>}
          </div>
        )}

        {/* Tabs */}
        <div className="tabs tabs-boxed bg-white/80 mb-6 shadow-md">
          {(['create', 'manage', 'scan', 'revenue'] as const)
            .filter(t => canCreateEvents || t !== 'create') // Hide create tab for non-organizers
            .map(t => (
            <button key={t} className={`tab tab-lg flex-1 ${activeTab === t ? 'tab-active bg-gradient-to-r from-purple-500 to-blue-500 text-white' : ''}`}
              onClick={e => { e.preventDefault(); setActiveTab(t) }}>
              {t === 'create' && '➕ Create'}{t === 'manage' && '📊 Dashboard'}
              {t === 'scan' && '📱 Scanner'}{t === 'revenue' && '💰 Revenue'}
            </button>
          ))}
        </div>

        <div className="min-h-[400px]">
          {/* ─── CREATE EVENT (organizer only) ──────── */}
          {activeTab === 'create' && canCreateEvents && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-purple-100">
              <h4 className="font-bold text-xl text-gray-800 mb-4">Create New Event</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control md:col-span-2">
                  <label className="label"><span className="label-text font-semibold">Event Name</span></label>
                  <input className="input input-bordered" placeholder="e.g., Algorand Developer Summit 2026" value={eventName} onChange={e => setEventName(e.target.value)} />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text font-semibold">Event Date & Time</span></label>
                  <input className="input input-bordered" type="datetime-local" value={eventDate} onChange={e => setEventDate(e.target.value)} />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text font-semibold">Location</span></label>
                  <input className="input input-bordered" placeholder="e.g., Pune, India" value={eventLocation} onChange={e => setEventLocation(e.target.value)} />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text font-semibold">Total Capacity</span></label>
                  <input className="input input-bordered" placeholder="500" type="number" value={totalCapacity} onChange={e => setTotalCapacity(e.target.value)} />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text font-semibold">Ticket Price (ALGO)</span></label>
                  <input className="input input-bordered" placeholder="50" type="number" step="0.01" value={ticketPrice} onChange={e => setTicketPrice(e.target.value)} />
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text font-semibold">Max Resale (%)</span></label>
                  <input className="input input-bordered" placeholder="200" type="number" value={maxResaleMultiplier} onChange={e => setMaxResaleMultiplier(e.target.value)} />
                  <label className="label"><span className="label-text-alt text-gray-500">200% = max 2x price</span></label>
                </div>
                <div className="form-control">
                  <label className="label"><span className="label-text font-semibold">Organizer Royalty (%)</span></label>
                  <input className="input input-bordered" placeholder="10" type="number" min="0" max="50" value={organizerRoyalty} onChange={e => setOrganizerRoyalty(e.target.value)} />
                  <label className="label"><span className="label-text-alt text-gray-500">Max: 50%</span></label>
                </div>
              </div>
              <div className="mt-6">
                <button className={`btn btn-lg w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 ${loading ? 'loading' : ''}`}
                  disabled={loading || !activeAddress} onClick={e => { e.preventDefault(); void createEvent() }}>
                  {loading ? 'Creating...' : '🎪 Create Event'}
                </button>
              </div>
              <div className="alert alert-info mt-4">
                <div className="text-sm">
                  <p className="font-semibold">Refund Policy: 90% before 24h of event, 50% within 24h. No refund after event.</p>
                </div>
              </div>
            </div>
          )}

          {/* ─── DASHBOARD ───────────────────────────── */}
          {activeTab === 'manage' && (
            <div className="space-y-4">
              {eventDashboard ? (<>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-lg">
                    <div className="text-sm opacity-80">Event</div><div className="font-bold text-lg mt-1">{eventDashboard.eventName}</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-lg">
                    <div className="text-sm opacity-80">Tickets</div><div className="font-bold text-2xl mt-1">{eventDashboard.soldTickets}/{eventDashboard.totalTickets}</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white shadow-lg">
                    <div className="text-sm opacity-80">Price</div><div className="font-bold text-2xl mt-1">{eventDashboard.ticketPrice} ALGO</div>
                  </div>
                  <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-4 text-white shadow-lg">
                    <div className="text-sm opacity-80">Revenue</div><div className="font-bold text-2xl mt-1">{eventDashboard.revenue.toFixed(2)} ALGO</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl shadow-md p-4 border border-purple-100">
                    <div className="text-sm font-semibold text-gray-600">Event Date</div>
                    <div className="text-lg mt-1">{fmtDate(eventDashboard.eventDate)}
                      {isPast(eventDashboard.eventDate) ? <span className="badge badge-error ml-2">Expired</span> : eventDashboard.eventDate > 0 && <span className="badge badge-success ml-2">Upcoming</span>}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl shadow-md p-4 border border-purple-100">
                    <div className="text-sm font-semibold text-gray-600">Location</div>
                    <div className="text-lg mt-1">{eventDashboard.location || 'TBD'}</div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-md p-4 border border-purple-100">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">Sales Progress</span>
                    <span className="text-sm font-semibold text-purple-600">{eventDashboard.totalTickets > 0 ? Math.round(eventDashboard.soldTickets / eventDashboard.totalTickets * 100) : 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div className="bg-gradient-to-r from-purple-500 to-blue-500 h-4 rounded-full transition-all" style={{ width: `${eventDashboard.totalTickets > 0 ? eventDashboard.soldTickets / eventDashboard.totalTickets * 100 : 0}%` }}></div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-md p-4 border border-purple-100">
                  <div className="flex justify-between items-center mb-3">
                    <h5 className="font-bold text-lg text-gray-800">Scanned Tickets</h5>
                    <button className="btn btn-sm btn-ghost" onClick={e => { e.preventDefault(); void refreshScannedTickets() }}>🔄</button>
                  </div>
                  {scannedTickets.length === 0 ? <div className="text-sm text-gray-500 text-center py-4">None yet</div> : (
                    <div className="overflow-x-auto max-h-48">
                      <table className="table table-zebra w-full"><thead><tr><th>Asset ID</th><th>Scanned At</th><th>Status</th></tr></thead>
                        <tbody>{scannedTickets.slice(0, 10).map(t => (
                          <tr key={t.id}><td className="font-mono text-purple-600 font-bold">#{t.ticketId}</td><td>{t.timestamp ? new Date(t.timestamp * 1000).toLocaleString() : '-'}</td><td><span className="badge badge-success">✓</span></td></tr>
                        ))}</tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>) : (
                <div className="bg-white rounded-xl shadow-md p-8 border border-purple-100 text-center">
                  <div className="text-6xl mb-4">📊</div><h4 className="font-bold text-xl text-gray-800 mb-2">No Event Data</h4><p className="text-gray-600">Create an event first</p>
                </div>
              )}
            </div>
          )}

          {/* ─── SCANNER TAB with Camera QR ──────────── */}
          {activeTab === 'scan' && (
            <div className="bg-white rounded-xl shadow-lg p-6 border border-purple-100">
              <h4 className="font-bold text-xl text-gray-800 mb-4">Scan & Validate Tickets</h4>
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-semibold text-gray-700">📷 Camera Scanner</span>
                  <button className={`btn btn-sm ${scannerActive ? 'btn-error' : 'btn-primary'}`}
                    onClick={e => { e.preventDefault(); scannerActive ? void stopScanner() : void startScanner() }} disabled={loading}>
                    {scannerActive ? '⬛ Stop' : '📸 Start Camera'}
                  </button>
                </div>
                <div id={scannerContainerId} className="w-full max-w-md mx-auto rounded-xl overflow-hidden border-2 border-dashed border-purple-300 min-h-[40px]" />
                {scannerActive && <p className="text-sm text-center text-purple-500 mt-2 animate-pulse">Point camera at ticket QR...</p>}
              </div>
              <div className="divider">OR enter manually</div>
              <div className="form-control mb-4">
                <label className="label"><span className="label-text font-semibold">Ticket Asset ID</span></label>
                <div className="flex gap-2">
                  <input className="input input-bordered input-lg flex-1" placeholder="e.g., 123456789" type="number"
                    value={ticketAssetId} onChange={e => { setTicketAssetId(e.target.value); setTicketHolder('') }} />
                  <button className={`btn btn-outline btn-info ${verifying ? 'loading' : ''}`}
                    onClick={e => { e.preventDefault(); void verifyTicketHolder() }} disabled={verifying || !ticketAssetId}>🔍 Verify</button>
                </div>
                {ticketHolder && <label className="label"><span className="label-text-alt text-info font-mono">Owner: {ticketHolder.substring(0, 20)}...{ticketHolder.slice(-8)}</span></label>}
              </div>
              <button className={`btn btn-lg w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white ${loading ? 'loading' : ''}`}
                disabled={loading || !activeAddress || !appId} onClick={e => { e.preventDefault(); void markScanned() }}>
                {loading ? 'Scanning...' : '✓ Mark as Scanned'}
              </button>
              <div className="divider">Recent Scans</div>
              <div className="max-h-48 overflow-auto bg-gray-50 rounded-lg p-3">
                {scannedTickets.length === 0 ? <div className="text-sm text-gray-500 text-center py-4">None yet</div> : (
                  <ul className="space-y-2">{scannedTickets.slice(0, 5).map(t => (
                    <li key={t.id} className="bg-white rounded-lg p-3 shadow-sm border border-gray-200">
                      <div className="flex justify-between items-center">
                        <div><span className="font-mono font-bold text-purple-600">#{t.ticketId}</span><span className="text-xs text-gray-500 ml-2">{t.timestamp ? new Date(t.timestamp * 1000).toLocaleString() : ''}</span></div>
                        <span className="badge badge-success">✓</span>
                      </div>
                    </li>
                  ))}</ul>
                )}
              </div>
            </div>
          )}

          {/* ─── REVENUE ANALYTICS ───────────────────── */}
          {activeTab === 'revenue' && (
            <div className="space-y-4">
              {revenueData ? (<>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 text-white shadow-lg">
                    <div className="text-sm opacity-80">Ticket Sales</div><div className="font-bold text-2xl mt-1">{revenueData.primaryRevenue.toFixed(2)} ALGO</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-4 text-white shadow-lg">
                    <div className="text-sm opacity-80">Resale Royalties</div><div className="font-bold text-2xl mt-1">{revenueData.resaleRevenue.toFixed(2)} ALGO</div>
                  </div>
                  <div className="bg-gradient-to-br from-red-400 to-red-600 rounded-xl p-4 text-white shadow-lg">
                    <div className="text-sm opacity-80">Refunds Paid</div><div className="font-bold text-2xl mt-1">{revenueData.totalRefunded.toFixed(2)} ALGO</div>
                  </div>
                  <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-4 text-white shadow-lg">
                    <div className="text-sm opacity-80">Contract Balance</div><div className="font-bold text-2xl mt-1">{revenueData.appBalance.toFixed(4)} ALGO</div>
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-md p-6 border border-purple-100">
                  <div className="text-sm font-semibold text-gray-600 mb-1">Net Revenue (Sales + Royalties - Refunds)</div>
                  <div className="text-3xl font-bold text-green-600">{(revenueData.primaryRevenue + revenueData.resaleRevenue - revenueData.totalRefunded).toFixed(2)} ALGO</div>
                </div>
                <button className={`btn btn-lg w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white ${loading ? 'loading' : ''}`}
                  disabled={loading || !activeAddress || !appId || (eventDashboard ? !isPast(eventDashboard.eventDate) : true)}
                  onClick={e => { e.preventDefault(); void withdrawRevenue() }}>
                  {eventDashboard && !isPast(eventDashboard.eventDate)
                    ? `💰 Withdraw After Event (${fmtDate(eventDashboard.eventDate)})` : loading ? 'Withdrawing...' : '💰 Withdraw Revenue'}
                </button>
                {eventDashboard && !isPast(eventDashboard.eventDate) && <p className="text-xs text-center text-gray-500 mt-1">Revenue locked until event ends to cover refunds</p>}
              </>) : (
                <div className="bg-white rounded-xl shadow-md p-8 border border-purple-100 text-center">
                  <div className="text-6xl mb-4">💰</div><h4 className="font-bold text-xl text-gray-800 mb-2">No Revenue Data</h4><p className="text-gray-600">Create an event first</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-action mt-6">
          <button className="btn btn-ghost" onClick={closeModal} disabled={loading}>Close</button>
          <button className="btn btn-outline btn-primary" onClick={e => { e.preventDefault(); void refreshEventDashboard(); void refreshScannedTickets(); void refreshRevenueData() }} disabled={loading}>🔄 Refresh</button>
        </div>
      </form>
    </dialog>
  )
}

export default Bank


