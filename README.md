# Carbon Emissions of Europe

CEEU is a decentralized elastic supply protocol based on AMPL. It maintains a dynamic price by adjusting supply directly to and from wallet holders to preserve the relationship of 1 CEEU = 1 EUA Contract. You can read the [whitepaper](https://www.ecarbon.org/white-paper) for the motivation and a complete description of the protocol.

This repository is a collection of [smart contracts] that implement the Ampleforth protocol on the Ethereum blockchain.

The official mainnet addresses are:

- [CEEU](0xc8a6eeeebd82260f017634f9751210d13bba5c64)
- [CEEUPolicy](0xa57cE9f67b4ce50ccf86410c035EDd64e4b99f54)
- [Orchestrator](0x516659466d9c1D0Aae1e364916cd4A3F8300240e)

## Table of Contents

- [Install](#install)
- [Testing](#testing)
- [Contribute](#contribute)
- [License](#license)

## Install

```bash
# Install project dependencies
yarn
```

## Testing

```bash
# Run all unit tests (compatible with node v12+)
yarn test
```

## Contribute

To report bugs within this package, create an issue in this repository.
For security issues, please contact dev-support@ampleforth.org.
When submitting code ensure that it is free of lint errors and has 100% test coverage.

```bash
# Lint code
yarn lint

# Format code
yarn format

# Run solidity coverage report (compatible with node v12)
yarn coverage

# Run solidity gas usage report
yarn profile
```

## License

[GNU General Public License v3.0 (c) 2018 Fragments, Inc.](./LICENSE)
