#!/usr/bin/env python3
"""Initialize TicketContract event on TestNet"""
import os
from dotenv import load_dotenv
from algosdk import mnemonic, account
from algosdk.atomic_transaction_composer import AccountTransactionSigner
from algokit_utils import AlgorandClient
from smart_contracts.artifacts.ticket_contract.ticket_contract_client import TicketContractClient

load_dotenv()

# Setup
APP_ID = 755267063  # TicketContract
mn = os.getenv('DEPLOYER_MNEMONIC')
sk = mnemonic.to_private_key(mn)
addr = account.address_from_private_key(sk)

print(f'🎫 Initializing TicketChain Event')
print(f'App ID: {APP_ID}')
print(f'Organizer: {addr}\n')

# Create AlgorandClient for TestNet
algorand = AlgorandClient.testnet()

# Create TransactionSigner from private key
signer = AccountTransactionSigner(private_key=sk)

# Set default signer
algorand.set_signer(addr, signer)

# Create contract client with correct pattern
client = TicketContractClient(
    algorand=algorand,
    app_id=APP_ID,
    default_sender=addr
)

# Event parameters
EVENT_NAME = "Algorand Hackathon 2026"
CAPACITY = 500  # Total tickets
PRICE_ALGO = 50  # Price in ALGO
PRICE_MICROALGO = PRICE_ALGO * 1_000_000  # Convert to microALGO
MAX_RESALE_MULTIPLIER = 150  # 150% = 1.5x original price
ORGANIZER_ROYALTY = 10  # 10% royalty on resales

print('Event Configuration:')
print(f'  Name: {EVENT_NAME}')
print(f'  Capacity: {CAPACITY} tickets')
print(f'  Price: {PRICE_ALGO} ALGO')
print(f'  Max Resale: {PRICE_ALGO * MAX_RESALE_MULTIPLIER / 100} ALGO ({MAX_RESALE_MULTIPLIER}% of original)')
print(f'  Royalty: {ORGANIZER_ROYALTY}%')
print('\n🚀 Calling create_event()...')

try:
    result = client.send.create_event(
        args=(EVENT_NAME, CAPACITY, PRICE_MICROALGO, MAX_RESALE_MULTIPLIER, ORGANIZER_ROYALTY)
    )
    
    print(f'✅ Event created successfully!')
    print(f'   Txn ID: {result.tx_id}')
    print(f'\n🔗 View on AlgoExplorer:')
    print(f'   https://testnet.explorer.perawallet.app/application/{APP_ID}/')
    
except Exception as e:
    if 'assert' in str(e).lower() or 'only contract creator' in str(e).lower():
        print(f'⚠️  Event already initialized or error: {e}')
        print(f'   Continuing - you can still use the app!')
    else:
        print(f'❌ Error: {e}')
        raise

print(f'\n✅ NEXT STEPS:')
print(f'1. Update frontend with App ID: {APP_ID}')
print(f'2. Generate TypeScript client: cd ../frontend && pnpm run generate:client')
print(f'3. Start frontend: pnpm run dev')
