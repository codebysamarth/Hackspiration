import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import { useMemo, useState } from 'react'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Link } from 'lucide-react'

interface AssetOptInProps {
  openModal: boolean
  closeModal: () => void
}

const AssetOptIn = ({ openModal, closeModal }: AssetOptInProps) => {
  const { activeAddress, transactionSigner } = useWallet()
  const { enqueueSnackbar } = useSnackbar()
  const [asaId, setAsaId] = useState('')
  const [loading, setLoading] = useState(false)

  const algorand = useMemo(() => {
    const algodConfig = getAlgodConfigFromViteEnvironment()
    const client = AlgorandClient.fromConfig({ algodConfig })
    client.setDefaultSigner(transactionSigner)
    return client
  }, [transactionSigner])

  const onOptIn = async () => {
    if (!activeAddress) return enqueueSnackbar('Connect a wallet first', { variant: 'error' })
    const id = BigInt(asaId)
    if (id <= 0n) return enqueueSnackbar('Enter a valid ASA ID', { variant: 'error' })
    setLoading(true)
    try {
      await algorand.send.assetOptIn({ sender: activeAddress, assetId: id })
      enqueueSnackbar('Opt-in successful', { variant: 'success' })
      closeModal()
    } catch (e) {
      enqueueSnackbar((e as Error).message, { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={openModal} onOpenChange={(open) => { if (!open) closeModal() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Link className="h-5 w-5 text-primary" />Asset Opt-In</DialogTitle>
          <DialogDescription>Opt-in to receive an Algorand Standard Asset</DialogDescription>
        </DialogHeader>
        <div>
          <Label htmlFor="asaOptId">ASA ID</Label>
          <Input id="asaOptId" className="mt-1.5" placeholder="ASA ID" value={asaId} onChange={(e) => setAsaId(e.target.value)} />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={closeModal} disabled={loading}>Close</Button>
          <Button onClick={onOptIn} loading={loading} disabled={loading}>{!loading && 'Opt-In'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AssetOptIn

