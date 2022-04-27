import ceeuutils
import policyutils
import orchutils
import sys
import builtins


def initializeTX():
    builtins.gasPrice = 140000000000
    builtins.gas = 500000


if __name__ == '__main__':
    taskName = sys.argv[1]
    builtins.network = sys.argv[2]

    initializeTX()

    print("Attempting to run", taskName, "on network:", builtins.network)

    # Section: CEEU Tasks
    if (taskName == "setMonetaryPolicy"):
        from web3 import Web3
        ceeuutils.setMonetaryPolicy(Web3.toChecksumAddress(sys.argv[3]))

    elif (taskName == "approve"):
        try:
            from web3 import Web3
            ceeuutils.approve(Web3.toChecksumAddress(
                sys.argv[3]), int(sys.argv[4]))
        except ValueError:
            print("Amount is not a valid integer")

    elif (taskName == "transfer"):
        try:
            from web3 import Web3
            ceeuutils.transfer(Web3.toChecksumAddress(
                sys.argv[3]), int(sys.argv[4]))
        except ValueError:
            print("Amount is not a valid integer")

    elif (taskName == "ceeuCheck"):
        ceeuutils.ceeuCheck()

    elif (taskName == "checkTotalSupply"):
        ceeuutils.checkTotalSupply()

    # Section: CEEU Policy Tasks
    elif (taskName == "setOrchestrator"):
        from web3 import Web3
        policyutils.setOrchestrator(Web3.toChecksumAddress(sys.argv[3]))

    elif (taskName == "setRebaseLag"):
        policyutils.setRebaseLag()

    elif (taskName == "setRebaseTimingParameters"):
        policyutils.setRebaseTimingParameters()

    elif (taskName == "policyCheck"):
        policyutils.policyCheck()

    # Section: Orchestrator Tasks
    elif (taskName == "rebase"):
        try:
            avgTradingPrice = int(sys.argv[3])
            euaContractPrice = int(sys.argv[4])

            print("Rebasing CEEU from", avgTradingPrice, "to", euaContractPrice)
            orchutils.rebase(avgTradingPrice, euaContractPrice)
        except ValueError:
            print("Input is not a valid integer")

    elif (taskName == "orchCheck"):
        orchutils.orchCheck()
