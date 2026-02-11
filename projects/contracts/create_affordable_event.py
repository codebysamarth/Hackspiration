"""
Create an affordable test event (5 ALGO tickets) since TestNet wallet has only 10 ALGO
"""
import os
from dotenv import load_dotenv
from algosdk import mnemonic, account
from algosdk.atomic_transaction_composer import AccountTransactionSigner
from algokit_utils import AlgorandClient
from smart_contracts.artifacts.ticket_contract.ticket_contract_client import TicketContractClient

load_dotenv()

# Get deployer from mnemonic
mn = os.getenv('DEPLOYER_MNEMONIC')
if not mn:
    print("❌ DEPLOYER_MNEMONIC not found in .env file!")
    exit(1)

sk = mnemonic.to_private_key(mn)
deployer_address = account.address_from_private_key(sk)
print(f"✅ Using deployer: {deployer_address}")

# Create AlgorandClient for TestNet
algorand = AlgorandClient.testnet()
signer = AccountTransactionSigner(private_key=sk)
algorand.set_signer(deployer_address, signer)

# Check balance
account_info = algorand.client.algod.account_info(deployer_address)
balance = account_info['amount'] / 1_000_000
print(f"💰 Balance: {balance} ALGO")

if balance < 5:
    print("❌ Insufficient balance! Need at least 5 ALGO for testing")
    print(f"Get TestNet ALGO from: https://bank.testnet.algorand.network/")
    print(f"Enter your address: {deployer_address}")
    exit(1)

# Connect to deployed TicketContract
APP_ID = 755267063
client = TicketContractClient(
    algorand=algorand,
    app_id=APP_ID,
    default_sender=deployer_address
)

print(f"\n📋 Creating affordable test event...")
print(f"   Event: 'Affordable Test Event 2026'")
print(f"   Tickets: 100")
print(f"   Price: 5 ALGO (you can afford this!)")
print(f"   Max Resale: 7.5 ALGO (150% of original)")
print(f"   Organizer Royalty: 10%")

try:
    # Create event with 5 ALGO tickets
    result = client.send.create_event(
        args=(
            "Affordable Test Event 2026",  # event_name
            100,  # total_tickets
            5_000_000,  # ticket_price in microAlgos (5 ALGO)
            150,  # max_resale_multiplier (150%)
            10,  # organizer_royalty (10%)
        )
    )
    
    print(f"\n✅ Event created successfully!")
    print(f"   Transaction ID: {result.tx_id}")
    print(f"\n🎉 You can now purchase tickets for 5 ALGO each!")
    print(f"   Reload the frontend to see the new event details")
    
except Exception as e:
    if "method create_event does not exist" in str(e) or "already initialized" in str(e) or "assert" in str(e).lower():
        print(f"\n⚠️  Event already exists on this contract!")
        print(f"   The contract shows: 'Algorand Hackathon 2026' @ 50 ALGO")
        print(f"\n💡 OPTIONS:")
        print(f"   1. Get more TestNet ALGO from: https://bank.testnet.algorand.network/")
        print(f"      - Enter your address: {deployer_address}")
        print(f"      - Request 50+ ALGO to purchase a ticket")
        print(f"   2. Deploy a NEW TicketContract instance with affordable pricing")
        print(f"      - Edit smart_contracts/ticket_contract/deploy_config.py")
        print(f"      - Run: algokit project deploy testnet")
    else:
        print(f"\n❌ Error: {e}")
