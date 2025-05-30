// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@openzeppelin/contracts@5.0.2/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts@5.0.2/access/AccessControl.sol";

contract CarbonCreditNFT is ERC721URIStorage, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint256 public tokenIdCounter;

    // Mapping to track CO2 amount per NFT
    mapping(uint256 => uint256) public carbonAmount; // tokenId => CO2 tons

    // Custom errors
    error NotOwnerOrApproved();
    error InvalidCarbonAmount();
    error NotMinter();
    error NotAdmin();

    // Events
    event CreditMinted(uint256 indexed tokenId, address indexed to, uint256 carbonTons, string tokenURI);
    event CreditBurned(uint256 indexed tokenId, address indexed owner);

    constructor() ERC721("CarbonCreditNFT", "CCNFT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        tokenIdCounter = 0;
    }

    function mint(address to, uint256 carbonTons, string memory tokenURI) public returns (uint256) {
        if (!hasRole(MINTER_ROLE, msg.sender)) revert NotMinter();
        if (carbonTons == 0) revert InvalidCarbonAmount();

        uint256 newTokenId = tokenIdCounter;
        _mint(to, newTokenId);
        _setTokenURI(newTokenId, tokenURI);
        carbonAmount[newTokenId] = carbonTons;
        tokenIdCounter++;
        emit CreditMinted(newTokenId, to, carbonTons, tokenURI);
        return newTokenId;
    }

    function burn(uint256 tokenId) public {
        if (!_isAuthorized(msg.sender, tokenId)) revert NotOwnerOrApproved();
        _burn(tokenId);
        emit CreditBurned(tokenId, msg.sender);
    }

    function grantMinterRole(address account) public {
        if (!hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) revert NotAdmin();
        _grantRole(MINTER_ROLE, account);
    }

    function revokeMinterRole(address account) public {
        if (!hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) revert NotAdmin();
        _revokeRole(MINTER_ROLE, account);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
