# Section: Helper methods for transactions

def setup():
    from web3 import Web3, HTTPProvider
    import json
    import os
    import builtins

    orchJsonPath = "../../artifacts/contracts/Orchestrator.sol/Orchestrator.json"
    secretsPath = "../../secrets.json"

    if (builtins.network == "ropsten"):
        keyName = "ropstenOrchestratorAddress"
        apiName = "alchemyRopstenApi"
    elif (builtins.network == "mainnet"):
        keyName = "mainnetOrchestratorAddress"
        apiName = "alchemyMainnetApi"

    with open(secretsPath) as f:
        secrets_json = json.load(f)
    api_key = secrets_json[apiName]

    w3 = Web3(HTTPProvider(api_key))
    assert w3.isConnected()

    orchestrator_address = Web3.toChecksumAddress(
        secrets_json[keyName])
    deployer_address = Web3.toChecksumAddress(secrets_json["deployerAddress"])
    mnenmonic = secrets_json["mnemonic"]

    with open(orchJsonPath) as f:
        info_json = json.load(f)
    orchestrator_abi = info_json["abi"]

    orch_contract = w3.eth.contract(
        address=orchestrator_address, abi=orchestrator_abi)

    return (orchestrator_address, deployer_address, w3, orch_contract, mnenmonic, builtins.gasPrice, builtins.gas)


def sendTX(w3, mnemonic, tx):
    # Enable mnemonic features
    w3.eth.account.enable_unaudited_hdwallet_features()

    myAcc = w3.eth.account.from_mnemonic(mnemonic)
    signed_tx = myAcc.sign_transaction(tx)

    w3.eth.send_raw_transaction(signed_tx.rawTransaction)
    print("TX Hash:", signed_tx.hash.hex())


def rebase(avgTradingPrice, euaContractPrice):
    orchestrator_address, deployer_address, w3, orch_contract, mnemonic, gasPrice_, gas_ = setup()

    setOrchestratorTX = dict(
        gasPrice=gasPrice_,
        gas=gas_,
        to=orchestrator_address,
        data=orch_contract.encodeABI(fn_name="rebase", args=[
                                     avgTradingPrice, euaContractPrice]),
        nonce=w3.eth.get_transaction_count(deployer_address)
    )

    sendTX(w3, mnemonic, setOrchestratorTX)


def orchCheck():
    _, _, _, orch_contract, _, _, _ = setup()

    result = orch_contract.functions.policy().call()

    print("Policy of Orchestrator:", result)
