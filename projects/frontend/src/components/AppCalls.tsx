import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import { useEffect, useState } from 'react'
import { CounterClient } from '../contracts/Counter'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Card, CardContent } from './ui/card'
import { Hash, Plus } from 'lucide-react'

interface AppCallsInterface {
  openModal: boolean
  setModalState: (value: boolean) => void
}

const AppCalls = ({ openModal, setModalState }: AppCallsInterface) => {
  const [loading, setLoading] = useState<boolean>(false)
  // Fixed deployed application ID so users don't need to deploy repeatedly
  const FIXED_APP_ID = 747652603
  const [appId, setAppId] = useState<number | null>(FIXED_APP_ID)
  const [currentCount, setCurrentCount] = useState<number>(0)
  const { enqueueSnackbar } = useSnackbar()
  const { activeAccount, activeAddress, transactionSigner: TransactionSigner } = useWallet()

  const algodConfig = getAlgodConfigFromViteEnvironment()
  const indexerConfig = getIndexerConfigFromViteEnvironment()
  const algorand = AlgorandClient.fromConfig({
    algodConfig,
    indexerConfig,
  })
  
  
  algorand.setDefaultSigner(TransactionSigner)

  // Separate function to fetch current count
  const fetchCount = async (appId: number): Promise<number> => {
    try {
      const counterClient = new CounterClient({
        appId: BigInt(appId),
        algorand,
        defaultSigner: TransactionSigner,
      })
      const state = await counterClient.appClient.getGlobalState()
      return typeof state.count.value === 'bigint' 
        ? Number(state.count.value) 
        : parseInt(state.count.value, 10)
    } catch (e) {
      enqueueSnackbar(`Error fetching count: ${(e as Error).message}`, { variant: 'error' })
      return 0
    }
  }

  // Auto-load current count for the fixed app ID
  useEffect(() => {
    const load = async () => {
      if (appId) {
        const count = await fetchCount(appId)
        setCurrentCount(count)
      }
    }
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, TransactionSigner])

  const incrementCounter = async () => {
    if (!appId) {
      enqueueSnackbar('Missing App ID', { variant: 'error' })
      return
    }

    setLoading(true)
    try {
      const counterClient = new CounterClient({
        appId: BigInt(appId),
        algorand,
        defaultSigner: TransactionSigner,
      })

      // Increment the counter
      await counterClient.send.incrCounter({args: [], sender: activeAddress ?? undefined})
      
      // Fetch and set updated count
      const count = await fetchCount(appId)
      setCurrentCount(count)
      
      enqueueSnackbar(`Counter incremented! New count: ${count}`, { 
        variant: 'success' 
      })
    } catch (e) {
      enqueueSnackbar(`Error incrementing counter: ${(e as Error).message}`, { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={openModal} onOpenChange={(open) => setModalState(open)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-primary" />
            Counter Contract
          </DialogTitle>
          <DialogDescription>
            Interact with the on-chain counter smart contract
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          {appId && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">App ID</p>
                    <p className="text-sm font-mono font-semibold">{appId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Count</p>
                    <p className="text-3xl font-bold text-primary">{currentCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          <Button
            className="w-full"
            onClick={incrementCounter}
            disabled={loading || !appId}
            loading={loading}
          >
            <Plus className="h-4 w-4" />
            {loading ? 'Processing...' : 'Increment Counter'}
          </Button>
          <p className="text-xs text-muted-foreground text-center">Requires deployed contract</p>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => setModalState(false)} disabled={loading}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AppCalls