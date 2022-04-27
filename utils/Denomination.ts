import { ethers } from 'ethers'

export class Denomination {
  public toCEEUDenomination(amount: string) {
    return ethers.utils.parseUnits(amount, 9)
  }
}
