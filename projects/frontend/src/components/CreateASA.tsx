import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import { useMemo, useState } from 'react'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Coins } from 'lucide-react'

interface CreateASAProps {
  openModal: boolean
  closeModal: () => void
}

const CreateASA = ({ openModal, closeModal }: CreateASAProps) => {
  const { activeAddress, transactionSigner } = useWallet()
  const { enqueueSnackbar } = useSnackbar()
  const [name, setName] = useState('MyToken')
  const [unit, setUnit] = useState('MTK')
  const [decimals, setDecimals] = useState('6')
  const [total, setTotal] = useState('1000000')
  const [loading, setLoading] = useState(false)

  const algorand = useMemo(() => {
    const algodConfig = getAlgodConfigFromViteEnvironment()
    const client = AlgorandClient.fromConfig({ algodConfig })
    client.setDefaultSigner(transactionSigner)
    return client
  }, [transactionSigner])

  const onCreate = async () => {
    if (!activeAddress) return enqueueSnackbar('Connect a wallet first', { variant: 'error' })
    setLoading(true)
    try {
      const result = await algorand.send.assetCreate({
        sender: activeAddress,
        total: BigInt(total),
        decimals: Number(decimals),
        unitName: unit,
        assetName: name,
        manager: activeAddress,
        reserve: activeAddress,
        freeze: activeAddress,
        clawback: activeAddress,
        defaultFrozen: false,
      })
      enqueueSnackbar(`ASA created. ID: ${result.assetId}`, { variant: 'success' })
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
          <DialogTitle className="flex items-center gap-2"><Coins className="h-5 w-5 text-primary" />Create Fungible Token (ASA)</DialogTitle>
          <DialogDescription>Create a new Algorand Standard Asset</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="asaName">Asset name</Label>
            <Input id="asaName" className="mt-1.5" placeholder="Asset name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="unitName">Unit name</Label>
            <Input id="unitName" className="mt-1.5" placeholder="Unit name" value={unit} onChange={(e) => setUnit(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="asaDecimals">Decimals</Label>
            <Input id="asaDecimals" className="mt-1.5" placeholder="Decimals" value={decimals} onChange={(e) => setDecimals(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="asaTotal">Total (base units)</Label>
            <Input id="asaTotal" className="mt-1.5" placeholder="Total (base units)" value={total} onChange={(e) => setTotal(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={closeModal} disabled={loading}>Close</Button>
          <Button onClick={onCreate} loading={loading} disabled={loading}>{!loading && 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CreateASA

