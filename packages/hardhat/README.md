# Carbon Credit System

A decentralized platform for managing carbon credits using Celo blockchain and smart contracts. The Carbon Credit System enables the issuance, trading, and conversion of carbon credits as NFTs and ERC-20 tokens, ensuring transparency, security, and efficiency in carbon markets.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Installation](#installation)
- [Usage](#usage)
- [Testing](#testing)
- [Coverage](#coverage)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgements](#acknowledgements)

---

## Overview

The Carbon Credit System is a blockchain-based solution designed to streamline the lifecycle of carbon credits. It supports the creation of carbon credit NFTs (`CarbonCreditNFT`), issuance of tokenized credits (`CarbonCreditToken`), trading via a marketplace (`CarbonCreditMarketplace`), and conversion between NFTs and tokens (`CarbonCreditConverter`). Role-based access control is managed through a `RoleManager` contract, ensuring secure and permissioned operations.

Built with Solidity and deployed on Celo using Hardhat, the system leverages smart contracts to provide a transparent and auditable platform for carbon credit management. The project includes 40 comprehensive tests, achieving near-complete code coverage for robustness and reliability.

---

## Features

- **NFT-Based Carbon Credits:** Mint carbon credits as ERC-721 NFTs with associated carbon tonnage and metadata.
- **Tokenized Credits:** Issue ERC-20 tokens for fractional carbon credits, enabling flexible trading.
- **Marketplace:** List, buy, and cancel NFT and token listings with support for CELO payments and refunds.
- **NFT-to-Token Conversion:** Convert NFTs to equivalent ERC-20 tokens for enhanced liquidity.
- **Role-Based Access Control:** Securely manage minters, verifiers, and converters via a centralized RoleManager.
- **Comprehensive Testing:** 40 passing tests covering deployment, role management, minting, trading, and conversion.
- **High Code Coverage:** Statement coverage and branch coverage, validated with Hardhat.

---

## Architecture

The system comprises five core smart contracts:

- **RoleManager:** Manages access control using OpenZeppelin's AccessControl, assigning roles like `MINTER_ROLE`, `VERIFIER_ROLE`, and `CONVERTER_ROLE`.
- **CarbonCreditNFT:** ERC-721 contract for minting and burning NFT-based carbon credits, with automatic marketplace approval.
- **CarbonCreditToken:** ERC-20 contract for issuing and burning tokenized carbon credits, with verification data storage.
- **CarbonCreditMarketplace:** Facilitates listing and trading of NFTs and tokens, handling payments and refunds.
- **CarbonCreditConverter:** Converts NFTs to equivalent ERC-20 tokens, ensuring seamless asset interoperability.

Contracts are deployed with Hardhat and tested using Mocha/Chai, ensuring robust functionality and security.

---

## Installation

### Prerequisites

- **Node.js:** v18 or higher
- **Celo Composer|Hardhat:** 
- **Solidity:** v0.8.28
- **Celo Wallet:** MetaMask or Valora for deployment
- **Dependencies:** Ethers.js, OpenZeppelin Contracts

### Steps

#### 1. Clone the Repository

```bash
git clone https://github.com/rocknwa/plogathon---carbon-credits.git
cd plogathon---carbon-credits/packages/hardhat
```

#### 2. Install Dependencies

```bash
npm install
```

#### 3. Configure Environment

Create a copy of `.env.example` and rename it to `.env`.  
You **must** set the following variables:

```env
PRIVATE_KEY=your-celo-private-key              # Never use a wallet with real funds for development!
CELOSCAN_API_KEY=your-celoscan-api-key         # Obtain at https://celoscan.io/myapikey
```

For smart contract deployment, only the `PRIVATE_KEY` is required. For contract verification, set the `CELOSCAN_API_KEY`.

---

## Usage

### 1. Compile Contracts

```bash
npx hardhat compile
```

### 2. Deploy Contracts

Make sure your wallet is funded (for Alfajores, use [Celo Faucet](https://faucet.celo.org/alfajores)).  
To deploy the contracts, use Hardhat Ignition as follows:

**Alfajores Testnet:**

```bash
npx hardhat ignition deploy ./ignition/modules/CarbonCreditSystem.js.ts --network alfajores
```

**Celo Mainnet:**

```bash
npx hardhat ignition deploy ./ignition/modules/CarbonCreditSystem.js --network celo
```

Deployment outputs contract addresses for `RoleManager`, `CarbonCreditNFT`, `CarbonCreditToken`, `CarbonCreditMarketplace`, and `CarbonCreditConverter`.

### 3. Verify Contracts

You need to verify contracts for transparency on Celoscan.

**Alfajores:**
```bash
npx hardhat verify <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS> --network alfajores
```

Example for `Lock.sol`:
```bash
npx hardhat verify 0x756Af13eafF4Ef0D9e294222F9A922226567C39e 1893456000 --network alfajores
```

**Celo Mainnet:**
```bash
npx hardhat verify <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS> --network celo
```

Check `hardhat.config.js` for Celo-specific configuration.

### 4. ABI Synchronization

ABIs are automatically synchronized with your React frontend (`../react-app/src/abis/`) during compilation.

- **Automatic Syncing:**
    ```bash
    yarn compile
    # or
    npm run compile
    ```
- **Manual Syncing:**
    ```bash
    npm run sync:abis
    # or
    yarn sync:abis
    ```

> The sync script (`sync-abis.js`) is executed during `npm install` or `yarn install` via the `postinstall` hook in `package.json`.  
> To disable automatic syncing, remove the sync script call from the `compile` script in `package.json`.

---

## Example Workflow

1. **Deploy:** Deploy all contracts using the deployment script.
2. **Grant Roles:** Assign `MINTER_ROLE`, `VERIFIER_ROLE`, and `CONVERTER_ROLE` via `RoleManager`.
3. **Mint NFT:** Mint a carbon credit NFT with `CarbonCreditNFT`.
4. **List on Marketplace:** List the NFT or tokens on `CarbonCreditMarketplace`.
5. **Trade:** Buy listed assets with CELO.
6. **Convert:** Convert NFTs to tokens using `CarbonCreditConverter`.

---

## Interacting with Contracts

Use Hardhat console or your frontend DApp:

```bash
npx hardhat console --network <network>
```

**Example: Mint an NFT**
```js
const CarbonCreditNFT = await ethers.getContractAt("CarbonCreditNFT", "<nft-contract-address>");
await CarbonCreditNFT.connect(minter).mint("<recipient-address>", 10, "ipfs://metadata");
```

---

## Testing

The project includes 40 passing tests, covering all core functionalities. Tests are written in Mocha/Chai and executed with Hardhat.

Run tests:
```bash
npx hardhat test
```

Example test output:
```
  Carbon Credit System
    Deployment
      ✔ Should deploy contracts with correct roles
      ✔ Should revert if deploying with zero addresses
    Role Management
      ✔ Should grant and revoke roles via RoleManager
      ...
    CarbonCreditNFT
      ✔ Should mint NFT and approve marketplace
      ...
    CarbonCreditToken
      ✔ Should set verification data and issue credits
      ...
    CarbonCreditMarketplace
      ✔ Should list and buy NFT
      ...
    CarbonCreditConverter
      ✔ Should convert NFT to tokens with single approval
      ...

  40 passing (3s)
```

---

## Coverage

Code coverage is measured using solidity-coverage:

```bash
npx hardhat coverage
```

Latest coverage report:
```
------------------------------|----------|----------|----------|----------|----------------|
File                          |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
------------------------------|----------|----------|----------|----------|----------------|
 contracts/                   |    96.64 |    76.09 |       96 |    99.33 |                |
  CarbonCreditConverter.sol   |      100 |       80 |      100 |      100 |                |
  CarbonCreditMarketplace.sol |      100 |    76.47 |      100 |      100 |                |
  CarbonCreditNFT.sol         |    94.74 |    85.71 |       80 |    95.83 |            113 |
  CarbonCreditToken.sol       |      100 |       70 |      100 |      100 |                |
  RoleManager.sol             |    84.21 |    71.43 |      100 |      100 |                |
------------------------------|----------|----------|----------|----------|----------------|
All files                     |    96.64 |    76.09 |       96 |    99.33 |                |
```
> Note: Line 113 in CarbonCreditNFT.sol remains uncovered due to a conditional branch in the mint function. Future work will address this.

---

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## License

[MIT](./LICENSE)

---

## Acknowledgements

- Celo Foundation
- OpenZeppelin
- Hardhat
- Ethers.js

---

**Author:**  
Therock Ani  
Email: anitherock44@gmail.com
