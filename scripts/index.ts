import { task } from 'hardhat/config'
import {
  mainnetCEEUAddress,
  mainnetCEEUPolicyAddress,
  mainnetOrchestratorAddress,
} from '../secrets.json'

// task('ceeu:init', 'Initialize All Smart contracts related to CEEU').setAction(
//   async (args, bre) => {
//     const [deployer] = await bre.ethers.getSigners()
//     console.log('deployer address: ', deployer.address)

//     const CEEU = (await bre.ethers.getContractFactory('CEEU')).connect(deployer)
//     const ceeuInstance = CEEU.attach(mainnetCEEUAddress)
//     var result = await ceeuInstance.setMonetaryPolicy(ropstenCEEUPolicyAddress)
//     console.log('Setting monetary policy for CEEU:', result.hash)

//     // const Policy = (await bre.ethers.getContractFactory('CEEUPolicy')).connect(
//     //   deployer,
//     // )
//     // const policyInstance = Policy.attach(ropstenCEEUPolicyAddress)
//     // result = await policyInstance.setOrchestrator(ropstenOrchestratorAddress)
//     // console.log('Setting Orchestrator for Policy:', result.hash)

//     // result = await policyInstance.setRebaseLag(1)
//     // console.log('Setting rebase lag to 1 for CEEU:', result.hash)
//   },
// )

// task('ceeu:sendTransaction', 'Initialize All Smart contracts related to CEEU').setAction(
//   async (args, bre) => {

//     const signedTx = await bre.web3.eth.accounts.signTransaction(transaction, )
//     bre.web3.eth.sendSignedTransaction()

//   })

task('ceeu:check', 'Initialize All Smart contracts related to CEEU').setAction(
  async (args, bre) => {
    const [deployer] = await bre.ethers.getSigners()
    console.log('deployer address: ', deployer.address)

    const CEEU = (await bre.ethers.getContractFactory('CEEUPolicy')).connect(
      deployer,
    )
    const ceeuInstance = CEEU.attach(mainnetCEEUPolicyAddress)
    var result = await ceeuInstance.functions.globalAmpleforthEpochAndAMPLSupply()

    console.log("CEEUPolicy's CEEU reference pointing to: ", result)
  },
)

// task('ceeu:approve', 'Approve address for transfer of CEEU Tokens')
//   .addParam('address', 'Address accepting CEEU Tokens')
//   .addParam('amount', 'Amount of tokens to transfer')
//   .setAction(async (args, bre) => {
//     const [deployer] = await bre.ethers.getSigners()
//     console.log('deployer address: ', deployer.address)

//     const CEEU = (await bre.ethers.getContractFactory('CEEU')).connect(deployer)

//     var approvalAmt = bre.getCEEUDenom.toCEEUDenomination(args.amount)

//     const ceeuInstance = CEEU.attach(ropstenCEEUAddress)
//     var res = await ceeuInstance.approve(args.address, approvalAmt)
//     console.log('Approval TX HASH: ', res.hash)
//   })

// task('ceeu:transfer', 'Transfer CEEU Tokens to address')
//   .addParam('address', 'Address accepting CEEU Tokens')
//   .addParam('amount', 'Amount of tokens to transfer')
//   .setAction(async (args, bre) => {
//     const [deployer] = await bre.ethers.getSigners()
//     console.log('deployer address: ', deployer.address)

//     const CEEU = (await bre.ethers.getContractFactory('CEEU')).connect(deployer)
//     const ceeuInstance = CEEU.attach(ropstenCEEUAddress)

//     var transferAmt = bre.getCEEUDenom.toCEEUDenomination(args.amount)

//     if (transferAmt !== undefined) {
//       console.log('transfering ', transferAmt.toString(), ' to ', args.address)
//       var res = await ceeuInstance.transfer(args.address, transferAmt)

//       console.log('increaseAllowance TX HASH: ', res.hash)
//     } else {
//       console.log('failed to convert args.amount to valid CEEU denomination')
//     }
//   })

task('ceeu:rebase', "Rebalances the number of tokens in CEEU's total supply")
  .addParam('avgtradingprice', 'Average Trading Price of the CEEU Token')
  .addParam('euacontractprice', 'USD price of 1 EUA Contract')
  .setAction(async (args, bre) => {
    const [deployer, user] = await bre.ethers.getSigners()
    console.log('deployer address: ', deployer.address)

    const Policy = (await bre.ethers.getContractFactory('CEEUPolicy')).connect(
      deployer,
    )
    const policyInstance = Policy.attach(mainnetCEEUPolicyAddress)
    await policyInstance.setRebaseTimingParameters(60, 0, 60)

    console.log('initialized rebase')

    const Orch = (await bre.ethers.getContractFactory('Orchestrator')).connect(
      deployer,
    )
    const orchInstance = Orch.attach(mainnetOrchestratorAddress)

    console.log(
      'Rebalancing CEEU Token price from',
      parseFloat(args.avgtradingprice),
      'to',
      parseFloat(args.euacontractprice),
    )

    var result = orchInstance.rebase(
      parseInt(args.avgtradingprice),
      parseInt(args.euacontractprice),
    )
    console.log((await result).hash)
  })

task('ceeu:balance', 'Gets the balance of specified address')
  .addParam('address', 'Average Trading Price of the CEEU Token')
  .setAction(async (args, bre) => {
    const [deployer] = await bre.ethers.getSigners()

    const CEEU = (await bre.ethers.getContractFactory('CEEU')).connect(deployer)
    const ceeuInstance = CEEU.attach(mainnetCEEUAddress)

    var res = await ceeuInstance.balanceOf(args.address)
    console.log('Balance: ', res.toString())
  })

task('transfer', 'Transfers ethers from one address to another')
  .addParam('toaddress', 'Address accepting ether')
  .addParam('amount', 'Amount of ether to transfer')
  .addOptionalParam('fromaddress', 'Address sending ether')
  .setAction(async (args, bre) => {
    if (!args.fromaddress) {
      const [deployer] = await bre.ethers.getSigners()

      console.log('Sending ether from deployer address: ', deployer.address)

      const params = {
        from: deployer.address,
        to: args.toaddress,
        value: bre.ethers.utils.parseEther(args.amount),
      }

      const transactionHash = await deployer.sendTransaction(params)
      console.log('TX HASH: ', transactionHash.hash)
    } else {
      // we shouldn't really need this and also this probably doesn't work
      console.log('Sending ether from custom address: ', args.fromaddress)

      const params = {
        from: args.fromaddress,
        to: args.toaddress,
        value: bre.ethers.utils.parseEther(args.amount),
      }

      const tx = await bre.ethers.provider
        .getUncheckedSigner()
        .signTransaction(params)
      const transactionHash = await bre.ethers.provider.sendTransaction(tx)
      console.log('TX HASH: ', transactionHash)
    }
  })
