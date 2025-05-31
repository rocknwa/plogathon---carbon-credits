import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CarbonCreditSystemModule = buildModule("CarbonCreditSystemModule", (m) => {
  // Deploy RoleManager first, as other contracts depend on it
  const roleManager = m.contract("RoleManager");

  // Deploy CarbonCreditNFT, passing the RoleManager address
  const nft = m.contract("CarbonCreditNFT", [roleManager]);

  // Deploy CarbonCreditToken, passing the RoleManager address
  const token = m.contract("CarbonCreditToken", [roleManager]);

  // Deploy CarbonCreditMarketplace, passing NFT and Token addresses
  const marketplace = m.contract("CarbonCreditMarketplace", [nft, token]);

  // Deploy CarbonCreditConverter, passing NFT and Token addresses
  const converter = m.contract("CarbonCreditConverter", [nft, token]);

  // Set the marketplace address in CarbonCreditNFT after deployment
  m.call(nft, "updateMarketplaceAddress", [marketplace]);

  // Return all deployed contract futures for later use
  return { roleManager, nft, token, marketplace, converter };
});

export default CarbonCreditSystemModule;