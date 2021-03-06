pragma solidity 0.6.12;

import "../Orchestrator.sol";

contract RebaseCallerContract {
    function callRebase(address orchestrator) public returns (bool) {
        // Take out a flash loan.
        // Do something funky...
        Orchestrator(orchestrator).rebase(10, 10); // should fail
        // pay back flash loan.
        return true;
    }
}
