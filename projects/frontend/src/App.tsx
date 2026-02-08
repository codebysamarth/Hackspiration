import { SupportedWallet, WalletId, WalletManager, WalletProvider } from '@txnlab/use-wallet-react'
import { SnackbarProvider } from 'notistack'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './Home'
import MintNFT from './components/MintNFT'
import Bank from './components/Bank'
import Transact from './components/Transact'
import { getAlgodConfigFromViteEnvironment, getKmdConfigFromViteEnvironment } from './utils/network/getAlgoClientConfigs'

let supportedWallets: SupportedWallet[]
if (import.meta.env.VITE_ALGOD_NETWORK === 'localnet') {
  const kmdConfig = getKmdConfigFromViteEnvironment()
  supportedWallets = [
    {
      id: WalletId.KMD,
      options: {
        baseServer: kmdConfig.server,
        token: String(kmdConfig.token),
        port: String(kmdConfig.port),
      },
    },
  ]
} else {
  supportedWallets = [
    { id: WalletId.DEFLY },
    { id: WalletId.PERA },
    { id: WalletId.EXODUS },
    { id: WalletId.LUTE },
    // If you are interested in WalletConnect v2 provider
    // refer to https://github.com/TxnLab/use-wallet for detailed integration instructions
  ]
}

export default function App() {
  const algodConfig = getAlgodConfigFromViteEnvironment()

  const walletManager = new WalletManager({
    wallets: supportedWallets,
    defaultNetwork: algodConfig.network,
    networks: {
      [algodConfig.network]: {
        algod: {
          baseServer: algodConfig.server,
          port: algodConfig.port,
          token: String(algodConfig.token),
        },
      },
    },
    options: {
      resetNetwork: true,
    },
  })

  return (
    <SnackbarProvider maxSnack={3}>
      <WalletProvider manager={walletManager}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/purchase" element={<PurchaseTicketPage />} />
            <Route path="/organizer" element={<EventOrganizerPage />} />
            <Route path="/marketplace" element={<ResaleMarketplacePage />} />
          </Routes>
        </BrowserRouter>
      </WalletProvider>
    </SnackbarProvider>
  )
}

// Wrapper components for routes
function PurchaseTicketPage() {
  return <MintNFT openModal={true} closeModal={() => window.history.back()} />
}

function EventOrganizerPage() {
  return <Bank openModal={true} closeModal={() => window.history.back()} />
}

function ResaleMarketplacePage() {
  return <Transact openModal={true} setModalState={() => window.history.back()} />
}
