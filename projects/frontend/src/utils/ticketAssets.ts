import { AlgorandClient } from '@algorandfoundation/algokit-utils'

/**
 * WHY: This utility fetches all ticket NFTs owned by a specific wallet address.
 * 
 * REASON: On Algorand, when we mint a ticket as an NFT (Algorand Standard Asset),
 * the ownership is tracked natively by the blockchain. We need to query the indexer
 * to find all assets the user owns and filter for our ticket NFTs (unit_name = "TIX").
 * 
 * This enables features like:
 * - Showing "My Tickets" section
 * - Pre-filling ticket asset IDs for resale listings
 * - Verifying ownership before allowing resale
 */
export interface TicketAsset {
  assetId: number
  name: string
  url: string
  amount: number
}

export async function getUserTickets(
  userAddress: string,
  algorand: AlgorandClient
): Promise<TicketAsset[]> {
  try {
    const indexer = algorand.client.indexer

    // Query all assets owned by the user's address
    const accountInfo = await indexer.lookupAccountByID(userAddress).do()
    const assets = accountInfo.account.assets || []

    const ticketAssets: TicketAsset[] = []

    // Filter for ticket NFTs (assets with unit name "TIX")
    for (const asset of assets) {
      if (asset.amount > 0) {
        try {
          const assetInfo = await indexer.lookupAssetByID(asset.assetId).do()
          const params = assetInfo.asset.params

          // Only include our ticket NFTs (identified by unit name)
          if (params.unitName === 'TIX') {
            ticketAssets.push({
              assetId: Number(asset.assetId),
              name: params.name || 'Unknown Event',
              url: params.url || '',
              amount: Number(asset.amount),
            })
          }
        } catch (error) {
          console.warn(`Failed to fetch asset ${asset.assetId}:`, error)
        }
      }
    }

    return ticketAssets
  } catch (error) {
    console.error('Error fetching user tickets:', error)
    return []
  }
}

/**
 * WHY: Verify that a user actually owns a specific ticket NFT before allowing actions.
 * 
 * REASON: Before allowing resale listing or ticket scanning, we need to confirm
 * the user still owns the NFT. Someone might have already transferred/sold it.
 * This prevents errors and fraudulent attempts to list tickets they don't own.
 */
export async function verifyTicketOwnership(
  userAddress: string,
  ticketAssetId: number,
  algorand: AlgorandClient
): Promise<boolean> {
  try {
    const indexer = algorand.client.indexer
    const accountAssets = await indexer.lookupAccountByID(userAddress).do()

    const hasAsset = accountAssets.account.assets?.some(
      (asset) => Number(asset.assetId) === ticketAssetId && Number(asset.amount) > 0
    )

    return hasAsset || false
  } catch (error) {
    console.error('Error verifying ticket ownership:', error)
    return false
  }
}
