pragma solidity 0.6.12;

contract Oracle {

    string private latestCurrentPrice;
    string private latestTargetPrice;

    constructor() public {
        latestCurrentPrice = "";
        latestTargetPrice = "";
    }

    /**
     * @notice Main entry point to initiate a rebase operation.
     *         The Orchestrator calls rebase on the policy and notifies downstream applications.
     *         Contracts are guarded from calling, to avoid flash loan attacks on liquidity
     *         providers.
     *         If a transaction in the transaction list reverts, it is swallowed and the remaining
     *         transactions are executed.
     */
    function getLatestPrices() public returns (string memory, string memory) {
        require(msg.sender == tx.origin); // solhint-disable-line avoid-tx-origin
        return (latestCurrentPrice, latestTargetPrice);
    }

        /**
     * @return latestTargetPrice on success
     */
    function getLatestTargetPrice() external view returns (string memory) {
        return latestTargetPrice;
    }

    /**
     * @return latestTargetPrice on success
     */
    function getLatestCurrentPrice() external view returns (string memory) {
        return latestCurrentPrice;
    }
}
