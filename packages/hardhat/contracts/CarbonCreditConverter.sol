// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Interface for CarbonCreditNFT
interface ICarbonCreditNFT {
    function ownerOf(uint256 tokenId) external view returns (address);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
    function getApproved(uint256 tokenId) external view returns (address);
    function carbonAmount(uint256 tokenId) external view returns (uint256);
    function burn(uint256 tokenId) external;
}

// Interface for CarbonCreditToken
interface ICarbonCreditToken {
    function mint(address to, uint256 amount) external;
}

/// @title CarbonCreditConverter
/// @notice Converts CarbonCreditNFTs to CarbonCreditTokens by burning NFTs and minting equivalent tokens.
/// @dev Interacts with NFT and token contracts via interfaces.
contract CarbonCreditConverter {
    ICarbonCreditNFT public immutable nftContract;
    ICarbonCreditToken public immutable tokenContract;

    // Custom errors
    error NotNFTOwner();
    error NotApproved();
    error InvalidCarbonAmount();

    // Event
    event ConvertedToTokens(address indexed user, uint256 indexed tokenId, uint256 carbonTons);

    /// @notice Initializes the converter with NFT and token contract addresses.
    /// @param _nftContract The address of the CarbonCreditNFT contract.
    /// @param _tokenContract The address of the CarbonCreditToken contract.
    constructor(address _nftContract, address _tokenContract) {
        if (_nftContract == address(0) || _tokenContract == address(0)) revert("Invalid contract address");
        nftContract = ICarbonCreditNFT(_nftContract);
        tokenContract = ICarbonCreditToken(_tokenContract);
    }

    /// @notice Converts an NFT to equivalent ERC-20 tokens.
    /// @dev Burns the NFT and mints tokens equal to its carbon amount. Requires owner and approval.
    /// @param tokenId The ID of the NFT to convert.
    function convertNFTtoTokens(uint256 tokenId) public {
        if (nftContract.ownerOf(tokenId) != msg.sender) revert NotNFTOwner();
        if (!nftContract.isApprovedForAll(msg.sender, address(this)) && nftContract.getApproved(tokenId) != address(this))
            revert NotApproved();

        uint256 carbonTons = nftContract.carbonAmount(tokenId);
        if (carbonTons == 0) revert InvalidCarbonAmount();

        nftContract.burn(tokenId); // Burn NFT to prevent double counting
        tokenContract.mint(msg.sender, carbonTons); // Mint equivalent ERC-20 tokens

        emit ConvertedToTokens(msg.sender, tokenId, carbonTons);
    }
}