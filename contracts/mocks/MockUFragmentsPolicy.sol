pragma solidity 0.6.12;

import "./Mock.sol";

contract MockUFragmentsPolicy is Mock {
    function rebase(uint256 avgTradingPrice, uint256 euaContractPrice) external {
        emit FunctionCalled("CEEUPolicy", "rebase", msg.sender);
    }
}
