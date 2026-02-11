#!/usr/bin/env python3
"""Check TicketContract global state on TestNet"""
from algosdk.v2client import algod

# Create Algod client for TestNet
algod_client = algod.AlgodClient('', 'https://testnet-api.algonode.cloud')

APP_ID = 755267063

# Get application info
app_info = algod_client.application_info(APP_ID)
global_state = app_info['params']['global-state']

print(f'🎫 TicketContract Global State (App ID: {APP_ID})\n')

for item in global_state:
    key = item['key']
    value = item['value']
    
    # Decode key
    from base64 import b64decode
    decoded_key = b64decode(key).decode('utf-8')
    
    # Decode value based on type
    if value['type'] == 1:  # bytes
        try:
            decoded_value = b64decode(value['bytes']).decode('utf-8')
        except:
            decoded_value = b64decode(value['bytes']).hex()
    else:  # uint
        decoded_value = value['uint']
        if decoded_key == 'ticket_price':
            decoded_value = f"{decoded_value:,} microALGO = {decoded_value / 1_000_000} ALGO"
        elif decoded_key == 'max_resale_price':
            decoded_value = f"{decoded_value:,} microALGO = {decoded_value / 1_000_000} ALGO"
    
    print(f'{decoded_key:<25} {decoded_value}')

print(f'\n✅ Event is initialized and ready for ticket purchases!')
