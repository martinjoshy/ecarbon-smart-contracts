import { ethers, upgrades, waffle } from 'hardhat'
import { Contract, Signer, BigNumber, BigNumberish, Event } from 'ethers'
import { TransactionResponse } from '@ethersproject/providers'
import { expect } from 'chai'
import { Result } from 'ethers/lib/utils'
import { increaseTime } from '../utils/utils'

let uFragmentsPolicy: Contract, mockUFragments: Contract
let prevEpoch: BigNumber, prevTime: BigNumber
let deployer: Signer, user: Signer, orchestrator: Signer

const MAX_RATE = ethers.utils.parseUnits('1', 24)
const MAX_SUPPLY = ethers.BigNumber.from(2).pow(255).sub(1).div(MAX_RATE)

const AVG_TRADING_PRICE = ethers.utils.parseUnits('50', 18)
const AVG_TRADING_PRICE_10D_LESS = ethers.utils.parseUnits('40', 18)
const AVG_TRADING_PRICE_5D_LESS = ethers.utils.parseUnits('45', 18)
const AVG_TRADING_PRICE_2D_LESS = ethers.utils.parseUnits('48', 18)
const AVG_TRADING_PRICE_1D_LESS = ethers.utils.parseUnits('49', 18)

const EUA_CONTRACT_PRICE = ethers.utils.parseUnits('50', 18)
const EUA_CONTRACT_PRICE_10D_LESS = ethers.utils.parseUnits('40', 18)
const EUA_CONTRACT_PRICE_5D_LESS = ethers.utils.parseUnits('45', 18)
const EUA_CONTRACT_PRICE_2D_LESS = ethers.utils.parseUnits('48', 18)
const EUA_CONTRACT_PRICE_1D_LESS = ethers.utils.parseUnits('49', 18)

async function mockedUpgradablePolicy() {
  // get signers
  const [deployer, user, orchestrator] = await ethers.getSigners()
  // deploy mocks
  const mockUFragments = await (
    await ethers.getContractFactory('MockUFragments')
  )
    .connect(deployer)
    .deploy()
  // deploy upgradable contract
  const uFragmentsPolicy = await upgrades.deployProxy(
    (await ethers.getContractFactory('CEEUPolicy')).connect(deployer),
    [await deployer.getAddress(), mockUFragments.address],
    {
      initializer: 'initialize(address, address)',
    },
  )

  // setup oracles\
  await uFragmentsPolicy
    .connect(deployer)
    .setOrchestrator(await orchestrator.getAddress())

  // return entities
  return {
    deployer,
    user,
    orchestrator,
    mockUFragments,
    uFragmentsPolicy,
  }
}

async function mockedUpgradablePolicyWithOpenRebaseWindow() {
  const {
    deployer,
    user,
    orchestrator,
    mockUFragments,
    uFragmentsPolicy,
  } = await mockedUpgradablePolicy()
  await uFragmentsPolicy.connect(deployer).setRebaseTimingParameters(60, 0, 60)
  return {
    deployer,
    user,
    orchestrator,
    mockUFragments,
    uFragmentsPolicy,
  }
}

//rate = exchangeRate
//cpi = targetRate
async function mockExternalData(uFragSupply: BigNumberish) {
  await mockUFragments.connect(deployer).storeSupply(uFragSupply)
}

async function parseRebaseLog(response: Promise<TransactionResponse>) {
  const receipt = (await (await response).wait()) as any
  const logs = receipt.events.filter(
    (event: Event) => event.event === 'LogRebase',
  )
  return logs[0].args
}

// async function parseDeviationThresholdLog(
//   response: Promise<TransactionResponse>,
// ) {
//   const receipt = (await (await response).wait()) as any
//   const logs = receipt.events.filter(
//     (event: Event) => event.event === 'isWithinDeviationThreshold',
//   )
//   return logs[0].args
// }

describe('CEEUPolicy', function () {
  before('setup CEEUPolicy contract', async () => {
    ;({
      deployer,
      user,
      orchestrator,
      mockUFragments,
      uFragmentsPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
  })

  it('should reject any ether sent to it', async function () {
    await expect(
      user.sendTransaction({ to: uFragmentsPolicy.address, value: 1 }),
    ).to.be.reverted
  })
})

describe('CEEUPolicy:initialize', async function () {
  describe('initial values set correctly', function () {
    before('setup CEEUPolicy contract', async () => {
      ;({
        deployer,
        user,
        orchestrator,
        mockUFragments,
        uFragmentsPolicy,
      } = await waffle.loadFixture(mockedUpgradablePolicy))
    })

    it('deviationThreshold', async function () {
      expect(await uFragmentsPolicy.deviationThreshold()).to.eq(
        ethers.utils.parseUnits('5', 16),
      )
    })
    it('rebaseLag', async function () {
      expect(await uFragmentsPolicy.rebaseLag()).to.eq(30)
    })
    it('minRebaseTimeIntervalSec', async function () {
      expect(await uFragmentsPolicy.minRebaseTimeIntervalSec()).to.eq(
        24 * 60 * 60,
      )
    })
    it('epoch', async function () {
      expect(await uFragmentsPolicy.epoch()).to.eq(0)
    })
    it('globalAmpleforthEpochAndAMPLSupply', async function () {
      const r = await uFragmentsPolicy.globalAmpleforthEpochAndAMPLSupply()
      expect(r[0]).to.eq(0)
      expect(r[1]).to.eq(0)
    })
    it('rebaseWindowOffsetSec', async function () {
      expect(await uFragmentsPolicy.rebaseWindowOffsetSec()).to.eq(72000)
    })
    it('rebaseWindowLengthSec', async function () {
      expect(await uFragmentsPolicy.rebaseWindowLengthSec()).to.eq(900)
    })
    it('should set owner', async function () {
      expect(await uFragmentsPolicy.owner()).to.eq(await deployer.getAddress())
    })
    it('should set reference to uFragments', async function () {
      expect(await uFragmentsPolicy.CEEU()).to.eq(mockUFragments.address)
    })
  })
})

describe('CEEUPolicy:setOrchestrator', async function () {
  before('setup CEEUPolicy contract', async () => {
    ;({
      deployer,
      user,
      orchestrator,
      mockUFragments,
      uFragmentsPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
  })

  it('should set orchestrator', async function () {
    await uFragmentsPolicy
      .connect(deployer)
      .setOrchestrator(await user.getAddress())
    expect(await uFragmentsPolicy.orchestrator()).to.eq(await user.getAddress())
  })
})

describe('CEEU:setOrchestrator:accessControl', function () {
  before('setup CEEUPolicy contract', async () => {
    ;({
      deployer,
      user,
      orchestrator,
      mockUFragments,
      uFragmentsPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
  })

  it('should be callable by owner', async function () {
    await expect(
      uFragmentsPolicy
        .connect(deployer)
        .setOrchestrator(await deployer.getAddress()),
    ).to.not.be.reverted
  })

  it('should NOT be callable by non-owner', async function () {
    await expect(
      uFragmentsPolicy
        .connect(user)
        .setOrchestrator(await deployer.getAddress()),
    ).to.be.reverted
  })
})

describe('CEEUPolicy:setDeviationThreshold', async function () {
  let prevThreshold: BigNumber, threshold: BigNumber
  before('setup CEEUPolicy contract', async function () {
    ;({
      deployer,
      user,
      orchestrator,
      mockUFragments,
      uFragmentsPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
    prevThreshold = await uFragmentsPolicy.deviationThreshold()
    threshold = prevThreshold.add(ethers.utils.parseUnits('1', 16))
    await uFragmentsPolicy.connect(deployer).setDeviationThreshold(threshold)
  })

  it('should set deviationThreshold', async function () {
    expect(await uFragmentsPolicy.deviationThreshold()).to.eq(threshold)
  })
})

describe('CEEU:setDeviationThreshold:accessControl', function () {
  before('setup CEEUPolicy contract', async () => {
    ;({
      deployer,
      user,
      orchestrator,
      mockUFragments,
      uFragmentsPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
  })

  it('should be callable by owner', async function () {
    await expect(uFragmentsPolicy.connect(deployer).setDeviationThreshold(0)).to
      .not.be.reverted
  })

  it('should NOT be callable by non-owner', async function () {
    await expect(uFragmentsPolicy.connect(user).setDeviationThreshold(0)).to.be
      .reverted
  })
})

describe('CEEUPolicy:setRebaseLag', async function () {
  let prevLag: BigNumber
  before('setup CEEUPolicy contract', async function () {
    ;({
      deployer,
      user,
      orchestrator,
      mockUFragments,
      uFragmentsPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
    prevLag = await uFragmentsPolicy.rebaseLag()
  })

  describe('when rebaseLag is more than 0', async function () {
    it('should setRebaseLag', async function () {
      const lag = prevLag.add(1)
      await uFragmentsPolicy.connect(deployer).setRebaseLag(lag)
      expect(await uFragmentsPolicy.rebaseLag()).to.eq(lag)
    })
  })

  describe('when rebaseLag is 0', async function () {
    it('should fail', async function () {
      await expect(uFragmentsPolicy.connect(deployer).setRebaseLag(0)).to.be
        .reverted
    })
  })
})

describe('CEEU:setRebaseLag:accessControl', function () {
  before('setup CEEUPolicy contract', async () => {
    ;({
      deployer,
      user,
      orchestrator,
      mockUFragments,
      uFragmentsPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
  })

  it('should be callable by owner', async function () {
    await expect(uFragmentsPolicy.connect(deployer).setRebaseLag(1)).to.not.be
      .reverted
  })

  it('should NOT be callable by non-owner', async function () {
    await expect(uFragmentsPolicy.connect(user).setRebaseLag(1)).to.be.reverted
  })
})

describe('CEEUPolicy:setRebaseTimingParameters', async function () {
  before('setup CEEUPolicy contract', async function () {
    ;({
      deployer,
      user,
      orchestrator,
      mockUFragments,
      uFragmentsPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
  })

  describe('when interval=0', function () {
    it('should fail', async function () {
      await expect(
        uFragmentsPolicy.connect(deployer).setRebaseTimingParameters(0, 0, 0),
      ).to.be.reverted
    })
  })

  describe('when offset > interval', function () {
    it('should fail', async function () {
      await expect(
        uFragmentsPolicy
          .connect(deployer)
          .setRebaseTimingParameters(300, 3600, 300),
      ).to.be.reverted
    })
  })

  describe('when params are valid', function () {
    it('should setRebaseTimingParameters', async function () {
      await uFragmentsPolicy
        .connect(deployer)
        .setRebaseTimingParameters(600, 60, 300)
      expect(await uFragmentsPolicy.minRebaseTimeIntervalSec()).to.eq(600)
      expect(await uFragmentsPolicy.rebaseWindowOffsetSec()).to.eq(60)
      expect(await uFragmentsPolicy.rebaseWindowLengthSec()).to.eq(300)
    })
  })
})

describe('CEEU:setRebaseTimingParameters:accessControl', function () {
  before('setup CEEUPolicy contract', async () => {
    ;({
      deployer,
      user,
      orchestrator,
      mockUFragments,
      uFragmentsPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
  })

  it('should be callable by owner', async function () {
    await expect(
      uFragmentsPolicy
        .connect(deployer)
        .setRebaseTimingParameters(600, 60, 300),
    ).to.not.be.reverted
  })

  it('should NOT be callable by non-owner', async function () {
    await expect(
      uFragmentsPolicy.connect(user).setRebaseTimingParameters(600, 60, 300),
    ).to.be.reverted
  })
})

describe('CEEUPolicy:Rebase:accessControl', async function () {
  beforeEach('setup CEEUPolicy contract', async function () {
    ;({
      deployer,
      user,
      orchestrator,
      mockUFragments,
      uFragmentsPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicyWithOpenRebaseWindow))
    // await setupContractsWithOpenRebaseWindow()
    await mockExternalData(1000)
    await increaseTime(60)
  })

  describe('when rebase called by orchestrator', function () {
    it('should succeed', async function () {
      await expect(uFragmentsPolicy.connect(orchestrator).rebase(10, 10)).to.not
        .be.reverted
    })
  })

  describe('when rebase called by non-orchestrator', function () {
    it('should fail', async function () {
      await expect(uFragmentsPolicy.connect(user).rebase(10, 10)).to.be.reverted
    })
  })
})

describe('CEEUPolicy:Rebase', async function () {
  before('setup CEEUPolicy contract', async () => {
    ;({
      deployer,
      user,
      orchestrator,
      mockUFragments,
      uFragmentsPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicyWithOpenRebaseWindow))
  })

  describe('when minRebaseTimeIntervalSec has NOT passed since the previous rebase', function () {
    before(async function () {
      await mockExternalData(1010)
      await increaseTime(60)
      await uFragmentsPolicy.connect(orchestrator).rebase(10, 10)
    })

    it('should fail', async function () {
      await expect(uFragmentsPolicy.connect(orchestrator).rebase(10, 10)).to.be
        .reverted
    })
  })
})

describe('CEEUPolicy:Rebase', async function () {
  before('setup CEEUPolicy contract', async () => {
    ;({
      deployer,
      user,
      orchestrator,
      mockUFragments,
      uFragmentsPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicyWithOpenRebaseWindow))
  })

  describe('when exchange rate is within deviationThreshold', function () {
    before(async function () {
      await uFragmentsPolicy
        .connect(deployer)
        .setRebaseTimingParameters(60, 0, 60)
    })

    it('should return 0', async function () {
      await mockExternalData(1000)
      await increaseTime(60)
      expect(
        (
          await parseRebaseLog(
            uFragmentsPolicy
              .connect(orchestrator)
              .rebase(AVG_TRADING_PRICE, EUA_CONTRACT_PRICE),
          )
        ).requestedSupplyAdjustment,
      ).to.eq(0)
      await increaseTime(60)

      expect(
        (
          await parseRebaseLog(
            uFragmentsPolicy
              .connect(orchestrator)
              .rebase(AVG_TRADING_PRICE_1D_LESS, EUA_CONTRACT_PRICE),
          )
        ).requestedSupplyAdjustment,
      ).to.eq(0)
      await increaseTime(60)

      expect(
        (
          await parseRebaseLog(
            uFragmentsPolicy
              .connect(orchestrator)
              .rebase(AVG_TRADING_PRICE_2D_LESS, EUA_CONTRACT_PRICE),
          )
        ).requestedSupplyAdjustment,
      ).to.eq(0)
      await increaseTime(60)

      expect(
        (
          await parseRebaseLog(
            uFragmentsPolicy
              .connect(orchestrator)
              .rebase(AVG_TRADING_PRICE, EUA_CONTRACT_PRICE_1D_LESS),
          )
        ).requestedSupplyAdjustment,
      ).to.eq(0)
      await increaseTime(60)

      expect(
        (
          await parseRebaseLog(
            uFragmentsPolicy
              .connect(orchestrator)
              .rebase(AVG_TRADING_PRICE, EUA_CONTRACT_PRICE_2D_LESS),
          )
        ).requestedSupplyAdjustment,
      ).to.eq(0)
      await increaseTime(60)
    })
  })
})

describe('CEEUPolicy:Rebase', async function () {
  before('setup CEEUPolicy contract', async () => {
    ;({
      deployer,
      user,
      orchestrator,
      mockUFragments,
      uFragmentsPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicyWithOpenRebaseWindow))
  })
})

describe('when exchange rate is more than MAX_RATE', function () {
  it('should return same supply delta as delta for MAX_RATE', async function () {
    // Any exchangeRate >= (MAX_RATE=100x) would result in the same supply increase
    await mockExternalData(1000)
    await increaseTime(60)

    const supplyChange = (
      await parseRebaseLog(
        uFragmentsPolicy
          .connect(orchestrator)
          .rebase(MAX_RATE, EUA_CONTRACT_PRICE),
      )
    ).requestedSupplyAdjustment

    await increaseTime(60)
    expect(
      (
        await parseRebaseLog(
          uFragmentsPolicy
            .connect(orchestrator)
            .rebase(
              MAX_RATE.add(ethers.utils.parseUnits('1', 17)),
              EUA_CONTRACT_PRICE,
            ),
        )
      ).requestedSupplyAdjustment,
    ).to.eq(supplyChange)

    await increaseTime(60)

    expect(
      (
        await parseRebaseLog(
          uFragmentsPolicy
            .connect(orchestrator)
            .rebase(MAX_RATE.mul(2), EUA_CONTRACT_PRICE),
        )
      ).requestedSupplyAdjustment,
    ).to.eq(supplyChange)
  })
})

describe('CEEUPolicy:Rebase', async function () {
  before('setup CEEUPolicy contract', async () => {
    ;({
      deployer,
      user,
      orchestrator,
      mockUFragments,
      uFragmentsPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicyWithOpenRebaseWindow))
  })

  describe('when CEEU supply grows beyond MAX_SUPPLY', function () {
    before(async function () {
      await mockExternalData(MAX_SUPPLY.sub(1))
      await increaseTime(60)
    })

    it('should apply SupplyAdjustment {MAX_SUPPLY - totalSupply}', async function () {
      // Supply is MAX_SUPPLY-1, exchangeRate is 2x; resulting in a new supply more than MAX_SUPPLY
      // However, supply is ONLY increased by 1 to MAX_SUPPLY
      expect(
        (
          await parseRebaseLog(
            uFragmentsPolicy
              .connect(orchestrator)
              .rebase(AVG_TRADING_PRICE, EUA_CONTRACT_PRICE_10D_LESS),
          )
        ).requestedSupplyAdjustment,
      ).to.eq(1)
    })
  })
})

describe('CEEUPolicy:Rebase', async function () {
  before('setup CEEUPolicy contract', async () => {
    ;({
      deployer,
      user,
      orchestrator,
      mockUFragments,
      uFragmentsPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicyWithOpenRebaseWindow))
  })

  describe('when uFragments supply equals MAX_SUPPLY and rebase attempts to grow', function () {
    before(async function () {
      await mockExternalData(MAX_SUPPLY)
      await increaseTime(60)
    })

    it('should not grow', async function () {
      expect(
        (
          await parseRebaseLog(
            uFragmentsPolicy
              .connect(orchestrator)
              .rebase(AVG_TRADING_PRICE, EUA_CONTRACT_PRICE_10D_LESS),
          )
        ).requestedSupplyAdjustment,
      ).to.eq(0)
    })
  })
})

describe('CEEUPolicy:Rebase', async function () {
  before('setup CEEUPolicy contract', async () => {
    ;({
      deployer,
      user,
      orchestrator,
      mockUFragments,
      uFragmentsPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicyWithOpenRebaseWindow))
  })

  describe('ceeu token price is $50 and the eua contract price is $40', function () {
    beforeEach(async function () {
      await mockExternalData(1010)
      await uFragmentsPolicy
        .connect(deployer)
        .setRebaseTimingParameters(60, 0, 60)
      await increaseTime(59)
      prevEpoch = await uFragmentsPolicy.epoch()
      prevTime = await uFragmentsPolicy.lastRebaseTimestampSec()
    })

    it('should increment epoch', async function () {
      await uFragmentsPolicy
        .connect(orchestrator)
        .rebase(AVG_TRADING_PRICE_10D_LESS, EUA_CONTRACT_PRICE_10D_LESS)
      expect(await uFragmentsPolicy.epoch()).to.eq(prevEpoch.add(1))
    })

    it('should update globalAmpleforthEpochAndAMPLSupply', async function () {
      await uFragmentsPolicy
        .connect(orchestrator)
        .rebase(AVG_TRADING_PRICE_10D_LESS, EUA_CONTRACT_PRICE_10D_LESS)
      const r = await uFragmentsPolicy.globalAmpleforthEpochAndAMPLSupply()
      expect(r[0]).to.eq(prevEpoch.add(1))
      expect(r[1]).to.eq('1010')
    })

    it('should update lastRebaseTimestamp', async function () {
      await uFragmentsPolicy
        .connect(orchestrator)
        .rebase(AVG_TRADING_PRICE_10D_LESS, EUA_CONTRACT_PRICE)
      const time = await uFragmentsPolicy.lastRebaseTimestampSec()
      expect(time.sub(prevTime)).to.eq(60)
    })

    it('should emit Rebase with positive requestedSupplyAdjustment', async function () {
      const r = uFragmentsPolicy
        .connect(orchestrator)
        .rebase(AVG_TRADING_PRICE, EUA_CONTRACT_PRICE_10D_LESS)
      await expect(r)
        .to.emit(uFragmentsPolicy, 'LogRebase')
        .withArgs(
          prevEpoch.add(1),
          AVG_TRADING_PRICE,
          EUA_CONTRACT_PRICE_10D_LESS,
          8,
          (await parseRebaseLog(r)).timestampSec,
        )
    })

    it('should call uFrag Rebase', async function () {
      const r = uFragmentsPolicy
        .connect(orchestrator)
        .rebase(AVG_TRADING_PRICE, EUA_CONTRACT_PRICE_10D_LESS)
      await expect(r)
        .to.emit(mockUFragments, 'FunctionCalled')
        .withArgs('CEEU', 'rebase', uFragmentsPolicy.address)
      await expect(r)
        .to.emit(mockUFragments, 'FunctionArguments')
        .withArgs([prevEpoch.add(1)], [8])
    })
  })
})

describe('CEEUPolicy:Rebase', async function () {
  before('setup UFragmentsPolicy contract', async () => {
    ;({
      deployer,
      user,
      orchestrator,
      mockUFragments,
      uFragmentsPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicyWithOpenRebaseWindow))
  })

  describe('ceeu token price is $40 and the eua contract price is $50', function () {
    before(async function () {
      await mockExternalData(1000)
      await increaseTime(60)
    })

    it('should emit Rebase with negative requestedSupplyAdjustment', async function () {
      expect(
        (
          await parseRebaseLog(
            uFragmentsPolicy
              .connect(orchestrator)
              .rebase(AVG_TRADING_PRICE_10D_LESS, EUA_CONTRACT_PRICE),
          )
        ).requestedSupplyAdjustment,
      ).to.eq(-6)
    })
  })
})

describe('CEEUPolicy:Rebase', async function () {
  before('setup CEEUPolicy contract', async () => {
    ;({
      deployer,
      user,
      orchestrator,
      mockUFragments,
      uFragmentsPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicyWithOpenRebaseWindow))
  })

  describe('ceeu token price is $45 and the eua contract price is $50', function () {
    before(async function () {
      await mockExternalData(1000)
      await increaseTime(60)
      await uFragmentsPolicy.connect(deployer).setDeviationThreshold(0)
    })

    it('should emit Rebase with negative requestedSupplyAdjustment', async function () {
      expect(
        (
          await parseRebaseLog(
            uFragmentsPolicy
              .connect(orchestrator)
              .rebase(AVG_TRADING_PRICE_5D_LESS, EUA_CONTRACT_PRICE),
          )
        ).requestedSupplyAdjustment,
      ).to.eq(-3)
    })
  })
})

describe('CEEUPolicy:Rebase', async function () {
  before('setup CEEUPolicy contract', async () => {
    ;({
      deployer,
      user,
      orchestrator,
      mockUFragments,
      uFragmentsPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicyWithOpenRebaseWindow))
  })

  describe('when ceeu token price and eua contract price are both $50', function () {
    before(async function () {
      await mockExternalData(1000)
      await uFragmentsPolicy.connect(deployer).setDeviationThreshold(0)
      await increaseTime(60)
    })

    it('should emit Rebase with 0 requestedSupplyAdjustment', async function () {
      expect(
        (
          await parseRebaseLog(
            uFragmentsPolicy
              .connect(orchestrator)
              .rebase(AVG_TRADING_PRICE, EUA_CONTRACT_PRICE),
          )
        ).requestedSupplyAdjustment,
      ).to.eq(0)
    })
  })
})

describe('CEEUPolicy:Rebase', async function () {
  let rbTime: BigNumber,
    rbWindow: BigNumber,
    minRebaseTimeIntervalSec: BigNumber,
    now: BigNumber,
    nextRebaseWindowOpenTime: BigNumber,
    timeToWait: BigNumber,
    lastRebaseTimestamp: BigNumber

  beforeEach('setup CEEUPolicy contract', async function () {
    ;({
      deployer,
      user,
      orchestrator,
      mockUFragments,
      uFragmentsPolicy,
    } = await waffle.loadFixture(mockedUpgradablePolicy))
    await uFragmentsPolicy
      .connect(deployer)
      .setRebaseTimingParameters(86400, 72000, 900)
    await mockExternalData(1000)
    rbTime = await uFragmentsPolicy.rebaseWindowOffsetSec()
    rbWindow = await uFragmentsPolicy.rebaseWindowLengthSec()
    minRebaseTimeIntervalSec = await uFragmentsPolicy.minRebaseTimeIntervalSec()
    now = ethers.BigNumber.from(
      (await ethers.provider.getBlock('latest')).timestamp,
    )
    nextRebaseWindowOpenTime = now
      .sub(now.mod(minRebaseTimeIntervalSec))
      .add(rbTime)
      .add(minRebaseTimeIntervalSec)
  })

  describe('when its 5s after the rebase window closes', function () {
    it('should fail', async function () {
      timeToWait = nextRebaseWindowOpenTime.sub(now).add(rbWindow).add(5)
      await increaseTime(timeToWait)
      expect(await uFragmentsPolicy.inRebaseWindow()).to.be.false
      await expect(
        uFragmentsPolicy
          .connect(orchestrator)
          .rebase(AVG_TRADING_PRICE, EUA_CONTRACT_PRICE),
      ).to.be.reverted
    })
  })

  describe('when its 5s before the rebase window opens', function () {
    it('should fail', async function () {
      timeToWait = nextRebaseWindowOpenTime.sub(now).sub(5)
      await increaseTime(timeToWait)
      expect(await uFragmentsPolicy.inRebaseWindow()).to.be.false
      await expect(
        uFragmentsPolicy
          .connect(orchestrator)
          .rebase(AVG_TRADING_PRICE, EUA_CONTRACT_PRICE),
      ).to.be.reverted
    })
  })

  describe('when its 5s after the rebase window opens', function () {
    it('should NOT fail', async function () {
      timeToWait = nextRebaseWindowOpenTime.sub(now).add(5)
      await increaseTime(timeToWait)
      expect(await uFragmentsPolicy.inRebaseWindow()).to.be.true
      await expect(
        uFragmentsPolicy
          .connect(orchestrator)
          .rebase(AVG_TRADING_PRICE, EUA_CONTRACT_PRICE),
      ).to.not.be.reverted
      lastRebaseTimestamp = await uFragmentsPolicy.lastRebaseTimestampSec()
      expect(lastRebaseTimestamp).to.eq(nextRebaseWindowOpenTime)
    })
  })

  describe('when its 5s before the rebase window closes', function () {
    it('should NOT fail', async function () {
      timeToWait = nextRebaseWindowOpenTime.sub(now).add(rbWindow).sub(5)
      await increaseTime(timeToWait)
      expect(await uFragmentsPolicy.inRebaseWindow()).to.be.true
      await expect(
        uFragmentsPolicy
          .connect(orchestrator)
          .rebase(AVG_TRADING_PRICE, EUA_CONTRACT_PRICE),
      ).to.not.be.reverted
      lastRebaseTimestamp = await uFragmentsPolicy.lastRebaseTimestampSec.call()
      expect(lastRebaseTimestamp).to.eq(nextRebaseWindowOpenTime)
    })
  })
})
