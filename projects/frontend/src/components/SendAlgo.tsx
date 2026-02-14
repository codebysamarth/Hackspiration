import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import * as algokit from '@algorandfoundation/algokit-utils'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import { useMemo, useState } from 'react'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Send } from 'lucide-react'

interface SendAlgoProps {
  openModal: boolean
  closeModal: () => void
}

const SendAlgo = ({ openModal, closeModal }: SendAlgoProps) => {
  const { activeAddress, transactionSigner } = useWallet()
  const { enqueueSnackbar } = useSnackbar()
  const [to, setTo] = useState('')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  const algorand = useMemo(() => {
    const algodConfig = getAlgodConfigFromViteEnvironment()
    const client = AlgorandClient.fromConfig({ algodConfig })
    client.setDefaultSigner(transactionSigner)
    return client
  }, [transactionSigner])

  const onSend = async () => {
    if (!activeAddress) return enqueueSnackbar('Connect a wallet first', { variant: 'error' })
    const microAlgos = BigInt(Math.floor(Number(amount) * 1e6))
    if (!to || microAlgos <= 0n) return enqueueSnackbar('Enter valid address and amount', { variant: 'error' })
    setLoading(true)
    try {
      await algorand.send.payment({ sender: activeAddress, receiver: to, amount: algokit.microAlgos(microAlgos) })
      enqueueSnackbar('Payment sent', { variant: 'success' })
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
          <DialogTitle className="flex items-center gap-2"><Send className="h-5 w-5 text-primary" />Send Algo</DialogTitle>
          <DialogDescription>Transfer ALGO to another address</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="recipient">Recipient address</Label>
            <Input id="recipient" className="mt-1.5" placeholder="Recipient address" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="algoAmount">Amount (ALGO)</Label>
            <Input id="algoAmount" className="mt-1.5" placeholder="Amount (ALGO)" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={closeModal} disabled={loading}>Close</Button>
          <Button onClick={onSend} loading={loading} disabled={loading}>{!loading && 'Send'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default SendAlgo

