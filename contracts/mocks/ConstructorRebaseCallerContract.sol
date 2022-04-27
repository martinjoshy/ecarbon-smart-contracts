pragma solidity 0.6.12;

import "../Orchestrator.sol";

contract ConstructorRebaseCallerContract {
    constructor(address orchestrator) public {
        // Take out a flash loan.
        // Do something funky...
        Orchestrator(orchestrator).rebase(10, 10); // should fail
        // pay back flash loan.
    }
}
