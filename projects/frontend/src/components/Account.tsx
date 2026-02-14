import { useWallet } from '@txnlab/use-wallet-react'
import { useMemo } from 'react'
import { ellipseAddress } from '../utils/ellipseAddress'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import { Badge } from './ui/badge'
import { ExternalLink, User } from 'lucide-react'

const Account = () => {
  const { activeAddress } = useWallet()
  const algoConfig = getAlgodConfigFromViteEnvironment()

  const networkName = useMemo(() => {
    return algoConfig.network === '' ? 'localnet' : algoConfig.network.toLocaleLowerCase()
  }, [algoConfig.network])

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
        <User className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <a className="text-sm font-medium hover:text-primary transition-colors truncate block inline-flex items-center gap-1" target="_blank" href={`https://lora.algokit.io/${networkName}/account/${activeAddress}/`}>
          {ellipseAddress(activeAddress)}
          <ExternalLink className="h-3 w-3 text-muted-foreground" />
        </a>
        <Badge variant="secondary" className="text-[10px] mt-0.5 capitalize">
          {networkName}
        </Badge>
      </div>
    </div>
  )
}

export default Account
