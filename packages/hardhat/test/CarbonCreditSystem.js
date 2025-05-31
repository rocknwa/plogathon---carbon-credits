const { expect } = require("chai");
const { ethers } = require("hardhat");describe("Carbon Credit System", function () {
  async function deployCarbonCreditFixture() {
    const [owner, minter, verifier, converter, buyer, seller] = await ethers.getSigners();

// Deploy RoleManager
const RoleManager = await ethers.getContractFactory("RoleManager");
const roleManager = await RoleManager.deploy();

// Deploy CarbonCreditToken
const CarbonCreditToken = await ethers.getContractFactory("CarbonCreditToken");
const tokenContract = await CarbonCreditToken.deploy(roleManager.target);

// Deploy CarbonCreditNFT
const CarbonCreditNFT = await ethers.getContractFactory("CarbonCreditNFT");
const nftContract = await CarbonCreditNFT.deploy(roleManager.target);

// Deploy CarbonCreditMarketplace
const CarbonCreditMarketplace = await ethers.getContractFactory("CarbonCreditMarketplace");
const marketplace = await CarbonCreditMarketplace.deploy(nftContract.target, tokenContract.target);

// Deploy CarbonCreditConverter
const CarbonCreditConverter = await ethers.getContractFactory("CarbonCreditConverter");
const converterContract = await CarbonCreditConverter.deploy(nftContract.target, tokenContract.target);

// Grant roles via RoleManager
const MINTER_ROLE = await roleManager.MINTER_ROLE();
const VERIFIER_ROLE = await roleManager.VERIFIER_ROLE();
const CONVERTER_ROLE = await tokenContract.CONVERTER_ROLE();

await roleManager.grantRoleToContract(MINTER_ROLE, minter.address, nftContract.target);
await roleManager.grantRoleToContract(VERIFIER_ROLE, verifier.address, tokenContract.target);
await roleManager.grantRoleToContract(CONVERTER_ROLE, converterContract.target, tokenContract.target);

// Set marketplace address in CarbonCreditNFT
await nftContract.updateMarketplaceAddress(marketplace.target);

return {
  roleManager,
  tokenContract,
  nftContract,
  marketplace,
  converterContract,
  owner,
  minter,
  verifier,
  converter,
  buyer,
  seller,
  MINTER_ROLE,
  VERIFIER_ROLE,
  CONVERTER_ROLE,
};

  }  describe("Deployment", function () {
    it("Should deploy contracts with correct roles", async function () {
      const { roleManager, tokenContract, nftContract, marketplace, converterContract, owner } = await deployCarbonCreditFixture();

  expect(await roleManager.hasRole(await roleManager.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
  expect(await tokenContract.hasRole(await tokenContract.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
  expect(await tokenContract.hasRole(await tokenContract.VERIFIER_ROLE(), owner.address)).to.be.true;
  expect(await nftContract.hasRole(await nftContract.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
  expect(await nftContract.hasRole(await nftContract.MINTER_ROLE(), owner.address)).to.be.true;
  expect(await marketplace.nftContract()).to.equal(nftContract.target);
  expect(await marketplace.tokenContract()).to.equal(tokenContract.target);
  expect(await converterContract.nftContract()).to.equal(nftContract.target);
  expect(await converterContract.tokenContract()).to.equal(tokenContract.target);
});

it("Should revert if deploying with zero addresses", async function () {
  const CarbonCreditMarketplace = await ethers.getContractFactory("CarbonCreditMarketplace");
  const CarbonCreditConverter = await ethers.getContractFactory("CarbonCreditConverter");

  await expect(CarbonCreditMarketplace.deploy(ethers.ZeroAddress, ethers.ZeroAddress)).to.be.revertedWith("Invalid contract address");
  await expect(CarbonCreditConverter.deploy(ethers.ZeroAddress, ethers.ZeroAddress)).to.be.revertedWith("Invalid contract address");
});

  });  describe("Role Management", function () {
    it("Should grant and revoke roles via RoleManager", async function () {
      const { roleManager, nftContract, tokenContract, minter, verifier, MINTER_ROLE, VERIFIER_ROLE } = await deployCarbonCreditFixture();

  expect(await roleManager.hasRoleInContract(MINTER_ROLE, minter.address, nftContract.target)).to.be.true;
  expect(await roleManager.hasRoleInContract(VERIFIER_ROLE, verifier.address, tokenContract.target)).to.be.true;

  await roleManager.revokeRoleFromContract(MINTER_ROLE, minter.address, nftContract.target);
  await roleManager.revokeRoleFromContract(VERIFIER_ROLE, verifier.address, tokenContract.target);

  expect(await roleManager.hasRoleInContract(MINTER_ROLE, minter.address, nftContract.target)).to.be.false;
  expect(await roleManager.hasRoleInContract(VERIFIER_ROLE, verifier.address, tokenContract.target)).to.be.false;
});

it("Should revert if non-admin tries to grant roles", async function () {
  const { roleManager, nftContract, seller, MINTER_ROLE } = await deployCarbonCreditFixture();

  await expect(
    roleManager.connect(seller).grantRoleToContract(MINTER_ROLE, seller.address, nftContract.target)
  ).to.be.revertedWithCustomError(roleManager, "AccessControlUnauthorizedAccount");
});

it("Should revert if granting roles with invalid addresses", async function () {
  const { roleManager, nftContract, owner, MINTER_ROLE } = await deployCarbonCreditFixture();

  await expect(
    roleManager.grantRoleToContract(MINTER_ROLE, ethers.ZeroAddress, nftContract.target)
  ).to.be.revertedWith("Invalid account address");

  await expect(
    roleManager.grantRoleToContract(MINTER_ROLE, owner.address, ethers.ZeroAddress)
  ).to.be.revertedWith("Invalid contract address");
});

  it("Should not revert if revoking non-existent role", async function () {
    const { roleManager, nftContract, minter, MINTER_ROLE } = await deployCarbonCreditFixture();
    // Revoke role that wasn't granted (minter already has MINTER_ROLE, so use a different address)
    const [_, __, ___, ____, _____, nonMinter] = await ethers.getSigners();
    await expect(
      roleManager.revokeRoleFromContract(MINTER_ROLE, nonMinter.address, nftContract.target)
    ).to.not.be.reverted;
    expect(await roleManager.hasRoleInContract(MINTER_ROLE, nonMinter.address, nftContract.target)).to.be.false;
  });  });  describe("CarbonCreditNFT", function () {
    it("Should mint NFT and approve marketplace", async function () {
      const { nftContract, marketplace, minter } = await deployCarbonCreditFixture();
      const carbonTons = 10;
      const tokenURI = "ipfs://test";

  await expect(nftContract.connect(minter).mint(minter.address, carbonTons, tokenURI))
    .to.emit(nftContract, "CreditMinted")
    .withArgs(0, minter.address, carbonTons, tokenURI);

  expect(await nftContract.ownerOf(0)).to.equal(minter.address);
  expect(await nftContract.carbonAmount(0)).to.equal(carbonTons);
  expect(await nftContract.tokenURI(0)).to.equal(tokenURI);
  expect(await nftContract.getApproved(0)).to.equal(marketplace.target);
});

   it("Should mint NFT without marketplace approval if address is zero", async function () {
const { roleManager, minter } = await deployCarbonCreditFixture();
const carbonTons = 10;
const tokenURI = "ipfs://test";

// Deploy a new CarbonCreditNFT instance without setting marketplace address
const CarbonCreditNFT = await ethers.getContractFactory("CarbonCreditNFT");
const nftContract = await CarbonCreditNFT.deploy(roleManager.target);

// Grant MINTER_ROLE to minter
const MINTER_ROLE = await roleManager.MINTER_ROLE();
await roleManager.grantRoleToContract(MINTER_ROLE, minter.address, nftContract.target);

// Verify marketplace address is zero
expect(await nftContract.marketplaceAddress()).to.equal(ethers.ZeroAddress);

await expect(nftContract.connect(minter).mint(minter.address, carbonTons, tokenURI))
  .to.emit(nftContract, "CreditMinted")
  .withArgs(0, minter.address, carbonTons, tokenURI);

expect(await nftContract.getApproved(0)).to.equal(ethers.ZeroAddress);

  });

it("Should revert if non-minter tries to mint", async function () {
  const { nftContract, seller } = await deployCarbonCreditFixture();
  await expect(
    nftContract.connect(seller).mint(seller.address, 10, "ipfs://test")
  ).to.be.revertedWithCustomError(nftContract, "NotMinter");
});

it("Should revert if minting with zero carbon tons", async function () {
  const { nftContract, minter } = await deployCarbonCreditFixture();
  await expect(
    nftContract.connect(minter).mint(minter.address, 0, "ipfs://test")
  ).to.be.revertedWithCustomError(nftContract, "InvalidCarbonAmount");
});

it("Should burn NFT if called by owner", async function () {
  const { nftContract, minter, buyer } = await deployCarbonCreditFixture();
  const tokenId = 0;

  await nftContract.connect(minter).mint(minter.address, 10, "ipfs://test");

  await expect(
    nftContract.connect(buyer).burn(tokenId)
  ).to.be.revertedWithCustomError(nftContract, "NotOwnerOrApproved");

  await expect(nftContract.connect(minter).burn(tokenId))
    .to.emit(nftContract, "CreditBurned")
    .withArgs(tokenId, minter.address);

  await expect(nftContract.ownerOf(tokenId)).to.be.revertedWithCustomError(nftContract, "ERC721NonexistentToken");
});

it("Should update marketplace address", async function () {
  const { nftContract, owner } = await deployCarbonCreditFixture();
  const newMarketplace = ethers.Wallet.createRandom().address;

  await expect(nftContract.connect(owner).updateMarketplaceAddress(newMarketplace))
    .to.emit(nftContract, "MarketplaceAddressUpdated")
    .withArgs(newMarketplace);

  expect(await nftContract.marketplaceAddress()).to.equal(newMarketplace);
});

it("Should revert if updating marketplace with zero address", async function () {
  const { nftContract, owner } = await deployCarbonCreditFixture();
  await expect(
    nftContract.connect(owner).updateMarketplaceAddress(ethers.ZeroAddress)
  ).to.be.revertedWithCustomError(nftContract, "InvalidMarketplaceAddress");
});

  });  describe("CarbonCreditToken", function () {
    it("Should set verification data and issue credits", async function () {
      const { tokenContract, verifier } = await deployCarbonCreditFixture();
      const vintageYear = 2023;
      const mrvDataHash = "ipfs://test";
      const verificationStandard = "Verra";
      const creditType = "Renewable";
      const amount = 100;

  await expect(
    tokenContract.connect(verifier).setVerificationData(vintageYear, mrvDataHash, verificationStandard, creditType)
  )
    .to.emit(tokenContract, "VerificationDataSet")
    .withArgs(1, vintageYear, mrvDataHash, verificationStandard, creditType);

  await expect(tokenContract.connect(verifier).issueCredits(verifier.address, 1, vintageYear, amount))
    .to.emit(tokenContract, "CreditsIssued")
    .withArgs(1, vintageYear, verifier.address, amount, mrvDataHash);

  expect(await tokenContract.balanceOf(verifier.address)).to.equal(amount);
});

it("Should revert if non-verifier tries to issue credits", async function () {
  const { tokenContract, seller } = await deployCarbonCreditFixture();
  await expect(
    tokenContract.connect(seller).issueCredits(seller.address, 1, 2023, 100)
  ).to.be.revertedWithCustomError(tokenContract, "AccessControlUnauthorizedAccount");
});

it("Should revert if setting verification data with empty MRV hash", async function () {
  const { tokenContract, verifier } = await deployCarbonCreditFixture();
  await expect(
    tokenContract.connect(verifier).setVerificationData(2023, "", "Verra", "Renewable")
  ).to.be.revertedWithCustomError(tokenContract, "EmptyMRVDataHash");
});

it("Should revert if issuing credits with zero amount", async function () {
  const { tokenContract, verifier } = await deployCarbonCreditFixture();
  await tokenContract.connect(verifier).setVerificationData(2023, "ipfs://test", "Verra", "Renewable");
  await expect(
    tokenContract.connect(verifier).issueCredits(verifier.address, 1, 2023, 0)
  ).to.be.revertedWithCustomError(tokenContract, "InvalidCreditAmount");
});

it("Should burn tokens", async function () {
  const { tokenContract, verifier } = await deployCarbonCreditFixture();
  const amount = 100;

  await tokenContract.connect(verifier).setVerificationData(2023, "ipfs://test", "Verra", "Renewable");
  await tokenContract.connect(verifier).issueCredits(verifier.address, 1, 2023, amount);

  await tokenContract.connect(verifier).burn(50);
  expect(await tokenContract.balanceOf(verifier.address)).to.equal(50);
});

it("Should retrieve verified projects", async function () {
  const { tokenContract, verifier } = await deployCarbonCreditFixture();
  const vintageYear = 2023;
  const mrvDataHash = "ipfs://test";
  const verificationStandard = "Verra";
  const creditType = "Renewable";

  await tokenContract.connect(verifier).setVerificationData(vintageYear, mrvDataHash, verificationStandard, creditType);

  const [creditsIds, vintageYears, data] = await tokenContract.getVerifiedProjects();
  expect(creditsIds).to.have.length(1);
  expect(creditsIds[0]).to.equal(1);
  expect(vintageYears[0]).to.equal(vintageYear);
  expect(data[0].mrvDataHash).to.equal(mrvDataHash);
  expect(data[0].verificationStandard).to.equal(verificationStandard);
  expect(data[0].creditType).to.equal(creditType);
  expect(data[0].isIssued).to.be.false;
});

it("Should retrieve issued projects", async function () {
  const { tokenContract, verifier } = await deployCarbonCreditFixture();
  const vintageYear = 2023;
  const mrvDataHash = "ipfs://test";
  const verificationStandard = "Verra";
  const creditType = "Renewable";
  const amount = 100;

  await tokenContract.connect(verifier).setVerificationData(vintageYear, mrvDataHash, verificationStandard, creditType);
  await tokenContract.connect(verifier).issueCredits(verifier.address, 1, vintageYear, amount);

  const [creditsIds, vintageYears, data] = await tokenContract.getIssuedProjects();
  expect(creditsIds).to.have.length(1);
  expect(creditsIds[0]).to.equal(1);
  expect(vintageYears[0]).to.equal(vintageYear);
  expect(data[0].mrvDataHash).to.equal(mrvDataHash);
  expect(data[0].isIssued).to.be.true;
});

 it("Should handle multiple project vintages", async function () {
    const { tokenContract, verifier } = await deployCarbonCreditFixture();
    const vintageYears = [2023, 2024];
    const mrvDataHash = "ipfs://test";
    const verificationStandard = "Verra";
    const creditType = "Renewable";
    const amount = 100;

for (const year of vintageYears) {
  await tokenContract.connect(verifier).setVerificationData(year, mrvDataHash, verificationStandard, creditType);
  await tokenContract.connect(verifier).issueCredits(verifier.address, year == 2023 ? 1 : 2, year, amount);
}

const [creditsIds, vintageYearsResult, data] = await tokenContract.getIssuedProjects();
expect(creditsIds).to.have.length(2);
expect(creditsIds[0]).to.equal(1);
expect(creditsIds[1]).to.equal(2);
expect(vintageYearsResult[0]).to.equal(2023);
expect(vintageYearsResult[1]).to.equal(2024);
expect(data[0].isIssued).to.be.true;
expect(data[1].isIssued).to.be.true;

  });  it("Should revert if issuing credits with non-existent credit ID", async function () {
    const { tokenContract, verifier } = await deployCarbonCreditFixture();
    await expect(
      tokenContract.connect(verifier).issueCredits(verifier.address, 999, 2023, 100)
    ).to.be.revertedWithCustomError(tokenContract, "VerificationDataMissing");
  });  it("Should handle empty verified projects list", async function () {
    const { tokenContract } = await deployCarbonCreditFixture();
    const [creditsIds, vintageYears, data] = await tokenContract.getVerifiedProjects();
    expect(creditsIds).to.have.length(0);
    expect(vintageYears).to.have.length(0);
    expect(data).to.have.length(0);
  });  it("Should handle empty issued projects list", async function () {
    const { tokenContract } = await deployCarbonCreditFixture();
    const [creditsIds, vintageYears, data] = await tokenContract.getIssuedProjects();
    expect(creditsIds).to.have.length(0);
    expect(vintageYears).to.have.length(0);
    expect(data).to.have.length(0);
  });
  });  describe("CarbonCreditMarketplace", function () {
    it("Should list and buy NFT", async function () {
      const { nftContract, marketplace, minter, buyer } = await deployCarbonCreditFixture();
      const tokenId = 0;
      const price = ethers.parseEther("1");

  await nftContract.connect(minter).mint(minter.address, 10, "ipfs://test");

  await expect(marketplace.connect(minter).listNFT(tokenId, price))
    .to.emit(marketplace, "NFTListed")
    .withArgs(tokenId, minter.address, price);

  const tx = marketplace.connect(buyer).buyNFT(tokenId, { value: price });
  await expect(tx)
    .to.emit(marketplace, "NFTSold")
    .withArgs(tokenId, buyer.address, price);
  await expect(tx).to.changeEtherBalances([buyer, minter], [-price, price]);

  expect(await nftContract.ownerOf(tokenId)).to.equal(buyer.address);
  expect((await marketplace.nftListings(tokenId)).active).to.be.false;
});

it("Should buy NFT with excess payment and refund", async function () {
  const { nftContract, marketplace, minter, buyer } = await deployCarbonCreditFixture();
  const tokenId = 0;
  const price = ethers.parseEther("1");
  const excessPayment = ethers.parseEther("1.5");

  await nftContract.connect(minter).mint(minter.address, 10, "ipfs://test");
  await marketplace.connect(minter).listNFT(tokenId, price);

  const tx = marketplace.connect(buyer).buyNFT(tokenId, { value: excessPayment });
  await expect(tx)
    .to.emit(marketplace, "NFTSold")
    .withArgs(tokenId, buyer.address, price);
  await expect(tx).to.changeEtherBalances([buyer, minter], [-price, price]);

  expect(await nftContract.ownerOf(tokenId)).to.equal(buyer.address);
});

it("Should revert if insufficient payment for NFT", async function () {
  const { nftContract, marketplace, minter, buyer } = await deployCarbonCreditFixture();
  const tokenId = 0;
  const price = ethers.parseEther("1");

  await nftContract.connect(minter).mint(minter.address, 10, "ipfs://test");
  await marketplace.connect(minter).listNFT(tokenId, price);

  await expect(
    marketplace.connect(buyer).buyNFT(tokenId, { value: ethers.parseEther("0.5") })
  ).to.be.revertedWithCustomError(marketplace, "InsufficientPayment");
});

it("Should revert if seller no longer owns NFT", async function () {
  const { nftContract, marketplace, minter, buyer } = await deployCarbonCreditFixture();
  const tokenId = 0;
  const price = ethers.parseEther("1");

  await nftContract.connect(minter).mint(minter.address, 10, "ipfs://test");
  await marketplace.connect(minter).listNFT(tokenId, price);
  await nftContract.connect(minter).transferFrom(minter.address, buyer.address, tokenId);

  await expect(
    marketplace.connect(buyer).buyNFT(tokenId, { value: price })
  ).to.be.revertedWithCustomError(marketplace, "SellerNoLongerOwns");
});

it("Should list and buy tokens", async function () {
  const { tokenContract, marketplace, verifier, buyer } = await deployCarbonCreditFixture();
  const amount = 100;
  const price = ethers.parseEther("1");

  await tokenContract.connect(verifier).setVerificationData(2023, "ipfs://test", "Verra", "Renewable");
  await tokenContract.connect(verifier).issueCredits(verifier.address, 1, 2023, amount);
  await tokenContract.connect(verifier).approve(marketplace.target, amount);

  await expect(marketplace.connect(verifier).listTokens(amount, price))
    .to.emit(marketplace, "TokenListed")
    .withArgs(0, verifier.address, amount, price);

  const tx = marketplace.connect(buyer).buyTokens(0, { value: price });
  await expect(tx)
    .to.emit(marketplace, "TokenSold")
    .withArgs(0, buyer.address, amount, price);
  await expect(tx).to.changeEtherBalances([buyer, verifier], [-price, price]);

  expect(await tokenContract.balanceOf(buyer.address)).to.equal(amount);
  expect((await marketplace.tokenListings(0)).active).to.be.false;
});

it("Should buy tokens with excess payment and refund", async function () {
  const { tokenContract, marketplace, verifier, buyer } = await deployCarbonCreditFixture();
  const amount = 100;
  const price = ethers.parseEther("1");
  const excessPayment = ethers.parseEther("1.5");

  await tokenContract.connect(verifier).setVerificationData(2023, "ipfs://test", "Verra", "Renewable");
  await tokenContract.connect(verifier).issueCredits(verifier.address, 1, 2023, amount);
  await tokenContract.connect(verifier).approve(marketplace.target, amount);

  await marketplace.connect(verifier).listTokens(amount, price);

  const tx = marketplace.connect(buyer).buyTokens(0, { value: excessPayment });
  await expect(tx)
    .to.emit(marketplace, "TokenSold")
    .withArgs(0, buyer.address, amount, price);
  await expect(tx).to.changeEtherBalances([buyer, verifier], [-price, price]);

  expect(await tokenContract.balanceOf(buyer.address)).to.equal(amount);
});

it("Should revert if insufficient payment for tokens", async function () {
  const { tokenContract, marketplace, verifier, buyer } = await deployCarbonCreditFixture();
  const amount = 100;
  const price = ethers.parseEther("1");

  await tokenContract.connect(verifier).setVerificationData(2023, "ipfs://test", "Verra", "Renewable");
  await tokenContract.connect(verifier).issueCredits(verifier.address, 1, 2023, amount);
  await tokenContract.connect(verifier).approve(marketplace.target, amount);

  await marketplace.connect(verifier).listTokens(amount, price);

  await expect(
    marketplace.connect(buyer).buyTokens(0, { value: ethers.parseEther("0.5") })
  ).to.be.revertedWithCustomError(marketplace, "InsufficientPayment");
});

it("Should cancel NFT listing", async function () {
  const { nftContract, marketplace, minter } = await deployCarbonCreditFixture();
  const tokenId = 0;
  const price = ethers.parseEther("1");

  await nftContract.connect(minter).mint(minter.address, 10, "ipfs://test");
  await marketplace.connect(minter).listNFT(tokenId, price);
  await marketplace.connect(minter).cancelNFTListing(tokenId);

  expect((await marketplace.nftListings(tokenId)).active).to.be.false;
});

it("Should cancel token listing", async function () {
  const { tokenContract, marketplace, verifier } = await deployCarbonCreditFixture();
  const amount = 100;
  const price = ethers.parseEther("1");

  await tokenContract.connect(verifier).setVerificationData(2023, "ipfs://test", "Verra", "Renewable");
  await tokenContract.connect(verifier).issueCredits(verifier.address, 1, 2023, amount);
  await tokenContract.connect(verifier).approve(marketplace.target, amount);

  await marketplace.connect(verifier).listTokens(amount, price);
  await marketplace.connect(verifier).cancelTokenListing(0);

  expect((await marketplace.tokenListings(0)).active).to.be.false;
});

it("Should revert if listing tokens with insufficient balance", async function () {
  const { tokenContract, marketplace, verifier } = await deployCarbonCreditFixture();
  const amount = 100;
  const price = ethers.parseEther("1");

  await expect(
    marketplace.connect(verifier).listTokens(amount, price)
  ).to.be.revertedWithCustomError(marketplace, "InsufficientTokenBalance");
});

it("Should revert if listing tokens with insufficient allowance", async function () {
  const { tokenContract, marketplace, verifier } = await deployCarbonCreditFixture();
  const amount = 100;
  const price = ethers.parseEther("1");

  await tokenContract.connect(verifier).setVerificationData(2023, "ipfs://test", "Verra", "Renewable");
  await tokenContract.connect(verifier).issueCredits(verifier.address, 1, 2023, amount);

  await expect(
    marketplace.connect(verifier).listTokens(amount, price)
  ).to.be.revertedWithCustomError(marketplace, "InsufficientTokenAllowance");
});

  it("Should revert if canceling non-existent NFT listing", async function () {
    const { marketplace, minter } = await deployCarbonCreditFixture();
    await expect(
      marketplace.connect(minter).cancelNFTListing(999)
    ).to.be.revertedWithCustomError(marketplace, "NotNFTOwner");
  });  });  describe("CarbonCreditConverter", function () {
    it("Should convert NFT to tokens with single approval", async function () {
      const { nftContract, tokenContract, converterContract, minter } = await deployCarbonCreditFixture();
      const tokenId = 0;
      const carbonTons = 10;

  await nftContract.connect(minter).mint(minter.address, carbonTons, "ipfs://test");
  await nftContract.connect(minter).approve(converterContract.target, tokenId);

  await expect(converterContract.connect(minter).convertNFTtoTokens(tokenId))
    .to.emit(converterContract, "ConvertedToTokens")
    .withArgs(minter.address, tokenId, carbonTons);

  expect(await tokenContract.balanceOf(minter.address)).to.equal(carbonTons);
  await expect(nftContract.ownerOf(tokenId)).to.be.revertedWithCustomError(nftContract, "ERC721NonexistentToken");
});

it("Should convert NFT to tokens with approval for all", async function () {
  const { nftContract, tokenContract, converterContract, minter } = await deployCarbonCreditFixture();
  const tokenId = 0;
  const carbonTons = 10;

  await nftContract.connect(minter).mint(minter.address, carbonTons, "ipfs://test");
  await nftContract.connect(minter).setApprovalForAll(converterContract.target, true);

  await expect(converterContract.connect(minter).convertNFTtoTokens(tokenId))
    .to.emit(converterContract, "ConvertedToTokens")
    .withArgs(minter.address, tokenId, carbonTons);

  expect(await tokenContract.balanceOf(minter.address)).to.equal(carbonTons);
  await expect(nftContract.ownerOf(tokenId)).to.be.revertedWithCustomError(nftContract, "ERC721NonexistentToken");
});

it("Should revert if non-owner tries to convert", async function () {
  const { nftContract, converterContract, minter, buyer } = await deployCarbonCreditFixture();
  const tokenId = 0;

  await nftContract.connect(minter).mint(minter.address, 10, "ipfs://test");
  await expect(
    converterContract.connect(buyer).convertNFTtoTokens(tokenId)
  ).to.be.revertedWithCustomError(converterContract, "NotNFTOwner");
});

it("Should revert if converter not approved", async function () {
  const { nftContract, converterContract, minter } = await deployCarbonCreditFixture();
  const tokenId = 0;

  await nftContract.connect(minter).mint(minter.address, 10, "ipfs://test");
  await expect(
    converterContract.connect(minter).convertNFTtoTokens(tokenId)
  ).to.be.revertedWithCustomError(converterContract, "NotApproved");
});

  });
});
