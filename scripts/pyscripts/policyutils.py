# Section: Helper methods for transactions

def setup():
    from web3 import Web3, HTTPProvider
    import json
    import os
    import builtins

    policyJsonPath = "../../artifacts/contracts/UFragmentsPolicy.sol/CEEUPolicy.json"
    secretsPath = "../../secrets.json"

    if (builtins.network == "ropsten"):
        keyName = "ropstenCEEUPolicyAddress"
        apiName = "alchemyRopstenApi"
    elif (builtins.network == "mainnet"):
        keyName = "mainnetCEEUPolicyAddress"
        apiName = "alchemyMainnetApi"

    with open(secretsPath) as f:
        secrets_json = json.load(f)
    api_key = secrets_json[apiName]

    w3 = Web3(HTTPProvider(api_key))
    assert w3.isConnected()

    policy_address = Web3.toChecksumAddress(secrets_json[keyName])
    deployer_address = Web3.toChecksumAddress(secrets_json["deployerAddress"])
    mnenmonic = secrets_json["mnemonic"]

    with open(policyJsonPath) as f:
        info_json = json.load(f)
    policy_abi = info_json["abi"]

    policy_contract = w3.eth.contract(address=policy_address, abi=policy_abi)

    return (policy_address, deployer_address, w3, policy_contract, mnenmonic, builtins.gasPrice, builtins.gas)


def sendTX(w3, mnemonic, tx):
    # Enable mnemonic features
    w3.eth.account.enable_unaudited_hdwallet_features()

    myAcc = w3.eth.account.from_mnemonic(mnemonic)
    signed_tx = myAcc.sign_transaction(tx)

    w3.eth.send_raw_transaction(signed_tx.rawTransaction)
    print("TX Hash:", signed_tx.hash.hex())


# Section: Transactions

def setOrchestrator(orchestrator_address):
    policy_address, deployer_address, w3, policy_contract, mnemonic, gasPrice_, gas_ = setup()

    setOrchestratorTX = dict(
        gasPrice=gasPrice_,
        gas=gas_,
        to=policy_address,
        data=policy_contract.encodeABI(fn_name="setOrchestrator", args=[
                                       orchestrator_address]),
        nonce=w3.eth.get_transaction_count(deployer_address)
    )

    sendTX(w3, mnemonic, setOrchestratorTX)


def setRebaseTimingParameters():
    policy_address, deployer_address, w3, policy_contract, mnemonic, gasPrice_, gas_ = setup()

    setRebaseTimingTX = dict(
        gasPrice=gasPrice_,
        gas=gas_,
        to=policy_address,
        data=policy_contract.encodeABI(
            fn_name="setRebaseTimingParameters", args=[300, 0, 300]),
        nonce=w3.eth.get_transaction_count(deployer_address)
    )

    sendTX(w3, mnemonic, setRebaseTimingTX)


def setRebaseLag():
    policy_address, deployer_address, w3, policy_contract, mnemonic, gasPrice_, gas_ = setup()

    setRebaseLagTX = dict(
        gasPrice=gasPrice_,
        gas=gas_,
        to=policy_address,
        data=policy_contract.encodeABI(fn_name="setRebaseLag", args=[1]),
        nonce=w3.eth.get_transaction_count(deployer_address)
    )

    sendTX(w3, mnemonic, setRebaseLagTX)


def policyCheck():
    _, _, _, policy_contract, _, _, _ = setup()

    result = policy_contract.functions.orchestrator().call()

    print("Orchestrator of CEEU Policy:", result)
