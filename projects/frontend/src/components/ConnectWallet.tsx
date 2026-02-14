import { useWallet, Wallet, WalletId } from '@txnlab/use-wallet-react'
import Account from './Account'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog'
import { Button } from './ui/button'
import { AlertTriangle, ExternalLink, LogOut, Wallet as WalletIcon } from 'lucide-react'

interface ConnectWalletInterface {
  openModal: boolean
  closeModal: () => void
}

const ConnectWallet = ({ openModal, closeModal }: ConnectWalletInterface) => {
  const { wallets, activeAddress } = useWallet()

  const isKmd = (wallet: Wallet) => wallet.id === WalletId.KMD

  return (
    <Dialog open={openModal} onOpenChange={(open) => { if (!open) closeModal() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WalletIcon className="h-5 w-5 text-primary" />
            Connect Wallet
          </DialogTitle>
          <DialogDescription>
            Choose a wallet to connect to TicketChain
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {activeAddress && (
            <>
              <Account />
              <div className="h-px bg-border my-4" />
            </>
          )}

          {!activeAddress && wallets && wallets.length > 0 &&
            wallets.map((wallet) => (
              <button
                data-test-id={`${wallet.id}-connect`}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent hover:border-accent-foreground/20 transition-all duration-200 text-left cursor-pointer"
                key={`provider-${wallet.id}`}
                onClick={() => {
                  return wallet.connect()
                }}
              >
                {!isKmd(wallet) && (
                  <img
                    alt={`wallet_icon_${wallet.id}`}
                    src={wallet.metadata.icon}
                    className="w-8 h-8 rounded-lg object-contain"
                  />
                )}
                {isKmd(wallet) && (
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-sm font-semibold">K</div>
                )}
                <span className="text-sm font-medium">{isKmd(wallet) ? 'LocalNet Wallet' : wallet.metadata.name}</span>
              </button>
            ))}

          {!activeAddress && (!wallets || wallets.length === 0) && (
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <p className="text-sm font-semibold text-amber-800">No Wallet Detected</p>
              </div>
              <p className="text-xs text-amber-700 mb-2">Install a wallet extension:</p>
              <ul className="text-xs text-amber-700 space-y-1.5 ml-4 list-disc">
                <li>
                  <a href="https://chrome.google.com/webstore/detail/pera-wallet/hcmjchkfljngfdhghmjnkiiofbljggfk" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                    Pera Wallet (Recommended) <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>
                  <a href="https://chrome.google.com/webstore/detail/defly-wallet/jccgkpbgpgdmjooocjikogdjkfddeifg" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                    Defly Wallet <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
              </ul>
              <p className="text-xs text-amber-600 mt-2">After installation, refresh this page.</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {activeAddress && (
            <Button
              variant="destructive"
              size="sm"
              data-test-id="logout"
              onClick={async () => {
                if (wallets) {
                  const activeWallet = wallets.find((w) => w.isActive)
                  if (activeWallet) {
                    await activeWallet.disconnect()
                  } else {
                    localStorage.removeItem('@txnlab/use-wallet:v3')
                    window.location.reload()
                  }
                }
                closeModal()
              }}
            >
              <LogOut className="h-4 w-4" />
              Disconnect
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            data-test-id="close-wallet-modal"
            onClick={() => { closeModal() }}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default ConnectWallet
