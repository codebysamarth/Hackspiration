import { useWallet, Wallet, WalletId } from '@txnlab/use-wallet-react'
import Account from './Account'

interface ConnectWalletInterface {
  openModal: boolean
  closeModal: () => void
}

const ConnectWallet = ({ openModal, closeModal }: ConnectWalletInterface) => {
  const { wallets, activeAddress } = useWallet()

  const isKmd = (wallet: Wallet) => wallet.id === WalletId.KMD

  return (
    <dialog id="connect_wallet_modal" className={`modal ${openModal ? 'modal-open' : ''}`}>
      <form method="dialog" className="modal-box">
        <h3 className="font-bold text-2xl mb-4">Select wallet provider</h3>

        <div className="grid m-2 pt-5">
          {activeAddress && (
            <>
              <Account />
              <div className="divider" />
            </>
          )}

          {!activeAddress && wallets && wallets.length > 0 &&
            wallets.map((wallet) => (
              <button
                data-test-id={`${wallet.id}-connect`}
                className="btn border-teal-800 border-1  m-2"
                key={`provider-${wallet.id}`}
                onClick={() => {
                  return wallet.connect()
                }}
              >
                {!isKmd(wallet) && (
                  <img
                    alt={`wallet_icon_${wallet.id}`}
                    src={wallet.metadata.icon}
                    style={{ objectFit: 'contain', width: '30px', height: 'auto' }}
                  />
                )}
                <span>{isKmd(wallet) ? 'LocalNet Wallet' : wallet.metadata.name}</span>
              </button>
            ))}

          {!activeAddress && (!wallets || wallets.length === 0) && (
            <div className="alert alert-warning shadow-lg">
              <div>
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="text-left">
                  <h3 className="font-bold">No Wallet Detected!</h3>
                  <div className="text-sm mt-2">
                    <p className="mb-2">Please install a wallet browser extension:</p>
                    <ul className="list-disc ml-5 space-y-1">
                      <li>
                        <a 
                          href="https://chrome.google.com/webstore/detail/pera-wallet/hcmjchkfljngfdhghmjnkiiofbljggfk" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Pera Wallet (Recommended)
                        </a>
                      </li>
                      <li>
                        <a 
                          href="https://chrome.google.com/webstore/detail/defly-wallet/jccgkpbgpgdmjooocjikogdjkfddeifg" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Defly Wallet
                        </a>
                      </li>
                    </ul>
                    <p className="mt-3 text-xs text-gray-600">After installation, refresh this page and switch wallet to TestNet</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-action ">
          <button
            data-test-id="close-wallet-modal"
            className="btn"
            onClick={() => {
              closeModal()
            }}
          >
            Close
          </button>
          {activeAddress && (
            <button
              className="btn btn-warning"
              data-test-id="logout"
              onClick={async () => {
                if (wallets) {
                  const activeWallet = wallets.find((w) => w.isActive)
                  if (activeWallet) {
                    await activeWallet.disconnect()
                  } else {
                    // Required for logout/cleanup of inactive providers
                    // For instance, when you login to localnet wallet and switch network
                    // to testnet/mainnet or vice verse.
                    localStorage.removeItem('@txnlab/use-wallet:v3')
                    window.location.reload()
                  }
                }
              }}
            >
              Logout
            </button>
          )}
        </div>
      </form>
    </dialog>
  )
}
export default ConnectWallet
