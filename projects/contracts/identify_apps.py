#!/usr/bin/env python3
"""Check which contract each app ID corresponds to"""
from algosdk.v2client import algod
import base64

client = algod.AlgodClient('', 'https://testnet-api.algonode.cloud', headers={'User-Agent': 'algosdk'})

app_ids = [755267063, 755269471, 755269481]

for app_id in app_ids:
    try:
        app_info = client.application_info(app_id)
        params = app_info['params']
        
        # Try to get global state to identify contract
        global_state = params.get('global-state', [])
        
        print(f"\n{'='*60}")
        print(f"App ID: {app_id}")
        print(f"Creator: {params.get('creator', 'N/A')}")
        print(f"Global NumUint: {params.get('global-state-schema', {}).get('num-uint', 0)}")
        print(f"Global NumByteSlice: {params.get('global-state-schema', {}).get('num-byte-slice', 0)}")
        print(f"Local NumUint: {params.get('local-state-schema', {}).get('num-uint', 0)}")
        print(f"Local NumByteSlice: {params.get('local-state-schema', {}).get('num-byte-slice', 0)}")
        
        # Check for identifying global state variables
        print("\nGlobal State Variables:")
        for state in global_state[:5]:  # First 5 vars
            key_b64 = state.get('key', '')
            try:
                key = base64.b64decode(key_b64).decode('utf-8')
                print(f"  - {key}")
            except:
                print(f"  - (binary key)")
                
    except Exception as e:
        print(f"\nApp ID {app_id}: Error - {e}")

print(f"\n{'='*60}")
print("\n🎯 TICKET CONTRACT IDENTIFICATION:")
print("Looking for global state with keys like: event_name, total_tickets, ticket_price")
