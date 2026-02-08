import logging

from algopy import Account
from algokit_utils import get_account
from algosdk.v2client.algod import AlgodClient
from algosdk.v2client.indexer import IndexerClient

logger = logging.getLogger(__name__)


# define deployment behaviour based on supplied app spec
def deploy(
    algod_client: AlgodClient,
    indexer_client: IndexerClient,
    app_spec: dict,
    deployer: Account,
) -> None:
    from smart_contracts.artifacts.ticket_contract.ticket_contract_client import (
        TicketContractClient,
    )

    app_client = TicketContractClient(
        algod_client,
        creator=deployer,
        indexer_client=indexer_client,
    )

    app_client.deploy(
        on_schema_break=lambda: logger.info("Schema break detected, deleting and recreating app"),
        on_update=lambda: logger.info("App updated"),
    )
    logger.info(
        f"""Deployed TicketContract app with:
App ID: {app_client.app_id}
App Address: {app_client.app_address}
        """
    )
