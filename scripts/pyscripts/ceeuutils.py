
# Section: Helper methods for transactions
def setup():
    from web3 import Web3, HTTPProvider
    import json
    import os
    import builtins

    ceeuJsonPath = "../../artifacts/contracts/UFragments.sol/CEEU.json"
    secretsPath = "../../secrets.json"

    if (builtins.network == "ropsten"):
        keyName = "ropstenCEEUAddress"
        apiName = "alchemyRopstenApi"
    elif (builtins.network == "mainnet"):
        keyName = "mainnetCEEUAddress"
        apiName = "alchemyMainnetApi"

    with open(secretsPath) as f:
        secrets_json = json.load(f)
    api_key = secrets_json[apiName]

    w3 = Web3(HTTPProvider(api_key))
    assert w3.isConnected()

    ceeu_address = Web3.toChecksumAddress(secrets_json[keyName])
    deployer_address = Web3.toChecksumAddress(secrets_json["deployerAddress"])
    mnenmonic = secrets_json["mnemonic"]

    with open(ceeuJsonPath) as f:
        info_json = json.load(f)
    ceeu_abi = info_json["abi"]

    ceeu_contract = w3.eth.contract(address=ceeu_address, abi=ceeu_abi)

    return (ceeu_address, deployer_address, w3, ceeu_contract, mnenmonic, builtins.gasPrice, builtins.gas)


def sendTX(w3, mnemonic, tx):
    # Enable mnemonic features
    w3.eth.account.enable_unaudited_hdwallet_features()

    myAcc = w3.eth.account.from_mnemonic(mnemonic)
    signed_tx = myAcc.sign_transaction(tx)

    w3.eth.send_raw_transaction(signed_tx.rawTransaction)
    print("TX Hash:", signed_tx.hash.hex())


def toCEEUDenomination(amount):
    return (amount * (10 ** 9))

# Section: Transactions


def setMonetaryPolicy(policy_address):
    ceeu_address, deployer_address, w3, ceeu_contract, mnemonic, gasPrice_, gas_ = setup()

    setMonetaryPolicyTX = dict(
        gasPrice=gasPrice_,
        gas=gas_,
        to=ceeu_address,
        data=ceeu_contract.encodeABI(fn_name="setMonetaryPolicy", args=[
            policy_address]),
        nonce=w3.eth.get_transaction_count(deployer_address)
    )

    sendTX(w3, mnemonic, setMonetaryPolicyTX)


#
#
# We don't ever need to use this
def approve(address, amount):
    ceeu_address, deployer_address, w3, ceeu_contract, mnemonic, gasPrice_, gas_ = setup()

    approveTX = dict(
        gasPrice=gasPrice_,
        gas=gas_,
        to=ceeu_address,
        data=ceeu_contract.encodeABI(fn_name="approve", args=[
            address, toCEEUDenomination(amount)]),
        nonce=w3.eth.get_transaction_count(deployer_address)
    )

    sendTX(w3, mnemonic, approveTX)


def transfer(address, amount):
    ceeu_address, deployer_address, w3, ceeu_contract, mnemonic, gasPrice_, gas_ = setup()

    transferTX = dict(
        gasPrice=gasPrice_,
        gas=gas_,
        to=ceeu_address,
        data=ceeu_contract.encodeABI(fn_name="transfer", args=[
            address, toCEEUDenomination(amount)]),
        nonce=w3.eth.get_transaction_count(deployer_address)
    )

    sendTX(w3, mnemonic, transferTX)


def checkTotalSupply():
    _, _, _, ceeu_contract, _, _, _ = setup()

    result = ceeu_contract.functions.totalSupply().call()

    print("Total Supply of CEEU:", result)


def ceeuCheck():
    _, _, _, ceeu_contract, _, _, _ = setup()

    result = ceeu_contract.functions.monetaryPolicy().call()

    print("Monetary policy of CEEU:", result)
