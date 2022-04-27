import { HardhatUserConfig, extendEnvironment } from 'hardhat/config'

import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-waffle'
import '@openzeppelin/hardhat-upgrades'
import 'solidity-coverage'
import 'hardhat-gas-reporter'
import '@nomiclabs/hardhat-web3'
import { lazyObject } from 'hardhat/plugins'
import { Denomination } from './utils/Denomination'
import './utils/type-extensions'
require('./scripts/deploy')
require('./scripts/index')
import { alchemyMainnetApi, alchemyRopstenApi, mnemonic } from './secrets.json'

extendEnvironment((hre) => {
  hre.getCEEUDenom = lazyObject(() => new Denomination())
})

export default {
  solidity: {
    compilers: [
      {
        version: '0.6.12',
      },
      {
        version: '0.4.24',
      },
    ],
  },
  networks: {
    ropsten: {
      url: alchemyRopstenApi,
      accounts: { mnemonic: mnemonic },
      gas: 4600000,
      gasPrice: 100000000000,
    },
    mainnet: {
      url: alchemyMainnetApi,
      accounts: { mnemonic: mnemonic },
      gas: 900000,
      gasPrice: 130000000000,
      chainId: 1,
    },
    development: {
      url: 'HTTP://127.0.0.1:7545',
      host: '127.0.0.1',
      port: 7545,
      network_id: '5777',
    },
  },
  mocha: {
    timeout: 100000,
  },
  gasReporter: {
    currency: 'USD',
    enabled: process.env.REPORT_GAS ? true : false,
    excludeContracts: ['mocks/'],
  },
} as HardhatUserConfig
