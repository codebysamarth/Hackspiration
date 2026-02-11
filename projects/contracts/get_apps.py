#!/usr/bin/env python3
"""Query deployer account for created apps"""
import os
from dotenv import load_dotenv
from algosdk import mnemonic, account
from algosdk.v2client import algod

load_dotenv()

# Get deployer address
mn = os.getenv('DEPLOYER_MNEMONIC')
sk = mnemonic.to_private_key(mn)
addr = account.address_from_private_key(sk)

print(f'Deployer Address: {addr}\n')

# Query TestNet
client = algod.AlgodClient('', 'https://testnet-api.algonode.cloud', headers={'User-Agent': 'algosdk'})
info = client.account_info(addr)

# Show created apps
apps = info.get('created-apps', [])
print(f'Total Created Apps: {len(apps)}\n')
print('Recent Apps:')
for app in apps[-10:]:  # Last 10 apps
    print(f"  App ID: {app['id']}")
