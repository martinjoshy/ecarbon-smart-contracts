pragma solidity 0.6.12;

import "./Mock.sol";

contract MockOracle is Mock {
    function getLatestPrices() public returns (string memory, string memory) {
        emit FunctionCalled("Oracle", "getLatestPrices", msg.sender);
        return ("", "");
    }
}
