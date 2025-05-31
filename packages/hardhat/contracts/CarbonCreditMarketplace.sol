 // SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Interface for CarbonCreditNFT (ERC-721)
interface ICarbonCreditNFT {
    function ownerOf(uint256 tokenId) external view returns (address);
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function getApproved(uint256 tokenId) external view returns (address);
}

// Interface for CarbonCreditToken (ERC-20)
interface ICarbonCreditToken {
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @title CarbonCreditMarketplace
/// @notice A marketplace for buying and selling CarbonCreditNFTs (ERC-721) and CarbonCreditTokens (ERC-20).
/// @dev Interacts with NFT and token contracts via interfaces.
contract CarbonCreditMarketplace {
    ICarbonCreditNFT public immutable nftContract;
    ICarbonCreditToken public immutable tokenContract;

    struct NFTListing {
        uint256 tokenId;
        address seller;
        uint256 price; // Price in wei
        bool active;
    }

    struct TokenListing {
        address seller;
        uint256 amount; // Amount of ERC-20 tokens
        uint256 price; // Price in wei
        bool active;
    }

    mapping(uint256 => NFTListing) public nftListings;
    mapping(uint256 => TokenListing) public tokenListings;
    uint256 public nftListingCount;
    uint256 public tokenListingCount;

    // Custom errors
    error NotNFTOwner();
    error NotApproved();
    error ListingNotActive();
    error InsufficientPayment();
    error InsufficientTokenBalance();
    error InsufficientTokenAllowance();
    error SellerNoLongerOwns();

    // Events
    event NFTListed(uint256 indexed tokenId, address indexed seller, uint256 price);
    event TokenListed(uint256 indexed listingId, address indexed seller, uint256 amount, uint256 price);
    event NFTSold(uint256 indexed tokenId, address indexed buyer, uint256 price);
    event TokenSold(uint256 indexed listingId, address indexed buyer, uint256 amount, uint256 price);

    /// @notice Initializes the marketplace with NFT and token contract addresses.
    /// @param _nftContract The address of the CarbonCreditNFT contract.
    /// @param _tokenContract The address of the CarbonCreditToken contract.
    constructor(address _nftContract, address _tokenContract) {
        if (_nftContract == address(0) || _tokenContract == address(0)) revert("Invalid contract address");
        nftContract = ICarbonCreditNFT(_nftContract);
        tokenContract = ICarbonCreditToken(_tokenContract);
    }

    /// @notice Lists an NFT for sale.
    /// @param tokenId The ID of the NFT to list.
    /// @param price The price in wei.
    function listNFT(uint256 tokenId, uint256 price) public {
        if (nftContract.ownerOf(tokenId) != msg.sender) revert NotNFTOwner();
        if (nftContract.getApproved(tokenId) != address(this)) revert NotApproved();

        nftListings[tokenId] = NFTListing(tokenId, msg.sender, price, true);
        nftListingCount++;
        emit NFTListed(tokenId, msg.sender, price);
    }

    /// @notice Lists ERC-20 tokens for sale.
    /// @param amount The amount of tokens to list.
    /// @param price The price in wei.
    function listTokens(uint256 amount, uint256 price) public {
        if (tokenContract.balanceOf(msg.sender) < amount) revert InsufficientTokenBalance();
        if (tokenContract.allowance(msg.sender, address(this)) < amount) revert InsufficientTokenAllowance();

        tokenListings[tokenListingCount] = TokenListing(msg.sender, amount, price, true);
        tokenListingCount++;
        emit TokenListed(tokenListingCount - 1, msg.sender, amount, price);
    }

    /// @notice Buys a listed NFT.
    /// @param tokenId The ID of the NFT to buy.
    function buyNFT(uint256 tokenId) public payable {
        NFTListing memory listing = nftListings[tokenId];
        if (!listing.active) revert ListingNotActive();
        if (msg.value < listing.price) revert InsufficientPayment();
        if (nftContract.ownerOf(tokenId) != listing.seller) revert SellerNoLongerOwns();

        nftListings[tokenId].active = false;
        nftContract.safeTransferFrom(listing.seller, msg.sender, tokenId);
        payable(listing.seller).transfer(listing.price);

        emit NFTSold(tokenId, msg.sender, listing.price);

        if (msg.value > listing.price) {
            payable(msg.sender).transfer(msg.value - listing.price);
        }
    }

    /// @notice Buys listed ERC-20 tokens.
    /// @param listingId The ID of the token listing.
    function buyTokens(uint256 listingId) public payable {
        TokenListing memory listing = tokenListings[listingId];
        if (!listing.active) revert ListingNotActive();
        if (msg.value < listing.price) revert InsufficientPayment();

        tokenListings[listingId].active = false;
        tokenContract.transferFrom(listing.seller, msg.sender, listing.amount);
        payable(listing.seller).transfer(listing.price);

        emit TokenSold(listingId, msg.sender, listing.amount, listing.price);

        if (msg.value > listing.price) {
            payable(msg.sender).transfer(msg.value - listing.price);
        }
    }

    /// @notice Cancels an NFT listing.
    /// @param tokenId The ID of the NFT listing to cancel.
    function cancelNFTListing(uint256 tokenId) public {
        NFTListing memory listing = nftListings[tokenId];
        if (listing.seller != msg.sender) revert NotNFTOwner();
        if (!listing.active) revert ListingNotActive();
        nftListings[tokenId].active = false;
    }

    /// @notice Cancels an ERC-20 token listing.
    /// @param listingId The ID of the token listing to cancel.
    function cancelTokenListing(uint256 listingId) public {
        TokenListing memory listing = tokenListings[listingId];
        if (listing.seller != msg.sender) revert NotNFTOwner();
        if (!listing.active) revert ListingNotActive();
        tokenListings[listingId].active = false;
    }
}