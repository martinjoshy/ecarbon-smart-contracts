import { task } from 'hardhat/config'
import { getAdminAddress } from '@openzeppelin/upgrades-core'
import ProxyAdmin from '@openzeppelin/upgrades-core/artifacts/ProxyAdmin.json'
import MultiSigWallet from './MultiSigWalletWithDailyLimit.json'
import { Interface } from '@ethersproject/abi'
import { TransactionReceipt } from '@ethersproject/providers'
import { HardhatRuntimeEnvironment, Artifact } from 'hardhat/types'

const parseEvents = (
  receipt: TransactionReceipt,
  contractInterface: Interface,
  eventName: string,
) =>
  receipt.logs
    .map((log) => contractInterface.parseLog(log))
    .filter((log) => log.name === eventName)

task('ceeu:deploy', 'Deploy CEEU contracts').setAction(async (args, bre) => {
  console.log(args)

  // get signers
  const deployer = (await bre.ethers.getSigners())[0]
  console.log('Deployer', await deployer.getAddress())

  // set init params
  const owner = await deployer.getAddress()

  // deploy CEEU
  const uFragments = await (
    await bre.upgrades.deployProxy(
      (await bre.ethers.getContractFactory('CEEU')).connect(deployer),
      [owner],
      {
        initializer: 'initialize(address)',
      },
    )
  ).deployed()
  console.log('CEEU deployed to:', uFragments.address)

  // deploy Policy
  const uFragmentsPolicy = await (
    await bre.upgrades.deployProxy(
      (await bre.ethers.getContractFactory('CEEUPolicy')).connect(deployer),
      [owner, uFragments.address],
      {
        initializer: 'initialize(address,address)',
      },
    )
  ).deployed()
  console.log('CEEUPolicy deployed to:', uFragmentsPolicy.address)

  // deploy Orchestrator
  const orchestrator = await (
    await bre.ethers.getContractFactory('Orchestrator')
  )
    .connect(deployer)
    .deploy(uFragmentsPolicy.address)
  console.log('Orchestrator deployed to:', orchestrator.address)
})

task('ceeu:deploypolicy', 'Deploy Policy contracts')
  .addParam('ceeuaddress', 'CEEU contract address')
  .setAction(async (args, bre) => {
    // get signers
    const deployer = (await bre.ethers.getSigners())[0]
    console.log('Deployer', await deployer.getAddress())

    // set init params
    const owner = await deployer.getAddress()

    // deploy Policy
    const uFragmentsPolicy = await (
      await bre.upgrades.deployProxy(
        (await bre.ethers.getContractFactory('CEEUPolicy')).connect(deployer),
        [owner, args.ceeuaddress],
        {
          initializer: 'initialize(address,address)',
        },
      )
    ).deployed()
    console.log('CEEUPolicy deployed to:', uFragmentsPolicy.address)
  })

task('ceeu:deployorch', 'Deploy Orch contracts')
  .addParam('policyaddress', 'CEEU contract address')
  .setAction(async (args, bre) => {
    // get signers
    const deployer = (await bre.ethers.getSigners())[0]
    console.log('Deployer', await deployer.getAddress())

    // deploy Orchestrator
    const orchestrator = await (
      await bre.ethers.getContractFactory('Orchestrator')
    )
      .connect(deployer)
      .deploy(args.policyaddress)
    console.log('Orchestrator deployed to:', orchestrator.address)
  })

async function deploymentCost(
  bre: HardhatRuntimeEnvironment,
  contract: Artifact,
) {
  console.log('----ESTIMATING Deployment of ', contract.contractName)
  var gasPrice = Number(await bre.web3.eth.getGasPrice())
  console.log('Gas Price is ' + gasPrice + ' wei')

  var gas = await bre.web3.eth.estimateGas({
    data: contract.bytecode,
  })
  console.log('Gas estimate to deploy CEEU contract: ', gas)
  console.log('gas cost estimation = ' + gas * gasPrice + ' wei' + '\n')

  return gas * gasPrice
}

task('ceeu:estDeployment', 'Estimate Deployment of CEEU contracts').setAction(
  async (args, bre) => {
    var CEEU = await bre.artifacts.readArtifact('CEEU')
    var CEEUPolicy = await bre.artifacts.readArtifact('CEEUPolicy')
    var Orchestrator = await bre.artifacts.readArtifact('Orchestrator')

    var ceeuCost = await deploymentCost(bre, CEEU)
    var policyCost = await deploymentCost(bre, CEEUPolicy)
    var orchCost = await deploymentCost(bre, Orchestrator)

    var totalCost = ceeuCost + policyCost + orchCost

    console.log('Total deployment cost estimation = ' + totalCost + ' wei')
  },
)

task('ampl:upgrade', 'Upgrade ampleforth contracts')
  .addParam('contract', 'which implementation contract to use')
  .addParam('address', 'which proxy address to upgrade')
  .addOptionalParam('multisig', 'which multisig address to use for upgrade')
  .setAction(async (args, bre) => {
    console.log(args)
    const upgrades = bre.upgrades as any

    // can only upgrade token or policy
    const supported = ['CEEU', 'CEEUPolicy']
    if (!supported.includes(args.contract)) {
      throw new Error(
        `requested to upgrade ${args.contract} but only ${supported} are supported`,
      )
    }

    // get signers
    const deployer = (await bre.ethers.getSigners())[0]
    console.log('Deployer', await deployer.getAddress())

    if (args.multisig) {
      // deploy new implementation
      const implementation = await upgrades.prepareUpgrade(
        args.address,
        await bre.ethers.getContractFactory(args.contract),
      )
      console.log(
        `New implementation for ${args.contract} deployed to`,
        implementation,
      )

      // prepare upgrade transaction
      const admin = new bre.ethers.Contract(
        await getAdminAddress(bre.ethers.provider, args.address),
        ProxyAdmin.abi,
        deployer,
      )
      const upgradeTx = await admin.populateTransaction.upgrade(
        args.address,
        implementation,
      )
      console.log(`Upgrade transaction`, upgradeTx)

      // send upgrade transaction to multisig
      const multisig = new bre.ethers.Contract(
        args.multisig,
        MultiSigWallet,
        deployer,
      )
      const receipt = await (
        await multisig.submitTransaction(
          upgradeTx.to,
          upgradeTx.value,
          upgradeTx.data,
        )
      ).wait()
      const events = parseEvents(receipt, multisig.interface, 'Submission')
      console.log(
        `Upgrade transaction submitted to multisig with transaction index`,
        events[0].args.transactionId,
      )
    } else {
      await upgrades.upgradeProxy(
        args.address,
        await bre.ethers.getContractFactory(args.contract),
      )
      console.log(args.contract, 'upgraded')
    }
  })
