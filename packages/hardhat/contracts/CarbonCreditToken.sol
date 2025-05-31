// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title CarbonCreditToken
/// @notice Manages fungible carbon credits as ERC-20 tokens with verification data for transparency.
/// @dev Extends ERC20 for token functionality and AccessControl for role-based permissions.
contract CarbonCreditToken is ERC20, AccessControl {
    /// @notice Role identifier for authorized verifiers who can set verification data and issue credits.
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    /// @notice Role identifier for authorized converters (e.g., CarbonCreditConverter contract).
    bytes32 public constant CONVERTER_ROLE = keccak256("CONVERTER_ROLE");

    // --- Counter Implementation ---
    uint256 private creditsIdCounter;

    /// @notice Structure to store verification data for a carbon credit project.
    struct VerificationData {
        string mrvDataHash; // Hash of Measurement, Reporting, and Verification (MRV) data
        string verificationStandard; // Standard used (e.g., Verra, Gold Standard)
        string creditType; // Type of credit (e.g., renewable, forestry)
        bool isIssued; // Indicates if credits have been issued for this project and vintage
    }

    /// @notice Maps a key (hashed creditsId and vintageYear) to verification data.
    mapping(bytes32 => VerificationData) public verificationData;

    /// @notice Maps a creditsId to an array of vintage years for tracking project vintages.
    mapping(uint256 => uint256[]) public projectVintages;

    /// @notice Custom error for unauthorized admin actions.
    error NotAdmin();
    /// @notice Custom error for unauthorized verifier actions.
    error NotVerifier();
    /// @notice Custom error for unauthorized converter actions.
    error NotConverter();
    /// @notice Custom error for invalid (zero) credit amounts.
    error InvalidCreditAmount();
    /// @notice Custom error for empty MRV data hash.
    error EmptyMRVDataHash();
    /// @notice Custom error for missing verification data.
    error VerificationDataMissing();

    /// @notice Emitted when verification data is set for a project.
    event VerificationDataSet(
        uint256 indexed creditsId,
        uint256 vintageYear,
        string mrvDataHash,
        string verificationStandard,
        string creditType
    );

    /// @notice Emitted when carbon credits are issued.
    event CreditsIssued(
        uint256 indexed creditsId,
        uint256 vintageYear,
        address indexed to,
        uint256 amount,
        string mrvDataHash
    );

    /// @notice Initializes the contract with token name, symbol, and RoleManager integration.
    /// @dev Sets the deployer as the default admin and verifier, and grants RoleManager admin role if provided.
    /// @param roleManager The address of the RoleManager contract.
    constructor(address roleManager) ERC20("CarbonCreditToken", "CCT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender);
        if (roleManager != address(0)) {
            _grantRole(DEFAULT_ADMIN_ROLE, roleManager);
        }
        creditsIdCounter = 0; // Initialize counter to 0
    }

    /// @notice Mints ERC-20 tokens for the converter contract.
    /// @dev Only callable by accounts with CONVERTER_ROLE.
    /// @param to The address to receive the tokens.
    /// @param amount The number of tokens to mint (1 token = 1 ton CO2).
    function mint(address to, uint256 amount) public onlyRole(CONVERTER_ROLE) {
        if (amount == 0) revert InvalidCreditAmount();
        _mint(to, amount);
    }

    /// @notice Burns (retires) ERC-20 carbon credit tokens.
    /// @dev Callable by token holders to reduce their balance.
    /// @param amount The number of tokens to burn.
    function burn(uint256 amount) public {
        _burn(msg.sender, amount);
    }

    /// @notice Sets verification data for a carbon credit project.
    /// @dev Only callable by accounts with VERIFIER_ROLE. Generates a new creditsId.
    function setVerificationData(
        uint256 vintageYear,
        string memory mrvDataHash,
        string memory verificationStandard,
        string memory creditType
    ) public onlyRole(VERIFIER_ROLE) returns (uint256) {
        if (bytes(mrvDataHash).length == 0) revert EmptyMRVDataHash();

        uint256 newCreditsId = creditsIdCounter + 1;
        bytes32 key = keccak256(abi.encodePacked(newCreditsId, vintageYear));
        verificationData[key] = VerificationData(mrvDataHash, verificationStandard, creditType, false);
        projectVintages[newCreditsId].push(vintageYear);
        creditsIdCounter++;

        emit VerificationDataSet(newCreditsId, vintageYear, mrvDataHash, verificationStandard, creditType);
        return newCreditsId;
    }

    /// @notice Issues ERC-20 carbon credits for a verified project.
    /// @dev Only callable by accounts with VERIFIER_ROLE. Marks project as issued.
    function issueCredits(
        address to,
        uint256 creditsId,
        uint256 vintageYear,
        uint256 amount
    ) public onlyRole(VERIFIER_ROLE) {
        if (amount == 0) revert InvalidCreditAmount();
        bytes32 key = keccak256(abi.encodePacked(creditsId, vintageYear));
        if (bytes(verificationData[key].mrvDataHash).length == 0) revert VerificationDataMissing();

        verificationData[key].isIssued = true;
        _mint(to, amount);
        emit CreditsIssued(creditsId, vintageYear, to, amount, verificationData[key].mrvDataHash);
    }

    /// @notice Returns all verified projects with their verification data and issuance status.
    function getVerifiedProjects() public view returns (
        uint256[] memory creditsIds,
        uint256[] memory vintageYears,
        VerificationData[] memory data
    ) {
        uint256 totalProjects = creditsIdCounter;
        uint256 totalEntries = 0;

        // Count total entries (creditsId, vintageYear pairs)
        for (uint256 id = 1; id <= totalProjects; id++) {
            totalEntries += projectVintages[id].length;
        }

        creditsIds = new uint256[](totalEntries);
        vintageYears = new uint256[](totalEntries);
        data = new VerificationData[](totalEntries);
        uint256 index = 0;

        // Populate arrays
        for (uint256 id = 1; id <= totalProjects; id++) {
            uint256[] memory vintages = projectVintages[id];
            for (uint256 i = 0; i < vintages.length; i++) {
                bytes32 key = keccak256(abi.encodePacked(id, vintages[i]));
                creditsIds[index] = id;
                vintageYears[index] = vintages[i];
                data[index] = verificationData[key];
                index++;
            }
        }

        return (creditsIds, vintageYears, data);
    }

    /// @notice Returns all projects with issued credits.
    function getIssuedProjects() public view returns (
        uint256[] memory creditsIds,
        uint256[] memory vintageYears,
        VerificationData[] memory data
    ) {
        uint256 totalProjects = creditsIdCounter;
        uint256 issuedCount = 0;

        // Count issued projects
        for (uint256 id = 1; id <= totalProjects; id++) {
            uint256[] memory vintages = projectVintages[id];
            for (uint256 i = 0; i < vintages.length; i++) {
                bytes32 key = keccak256(abi.encodePacked(id, vintages[i]));
                if (verificationData[key].isIssued) {
                    issuedCount++;
                }
            }
        }

        creditsIds = new uint256[](issuedCount);
        vintageYears = new uint256[](issuedCount);
        data = new VerificationData[](issuedCount);
        uint256 index = 0;

        // Populate arrays for issued projects
        for (uint256 id = 1; id <= totalProjects; id++) {
            uint256[] memory vintages = projectVintages[id];
            for (uint256 i = 0; i < vintages.length; i++) {
                bytes32 key = keccak256(abi.encodePacked(id, vintages[i]));
                if (verificationData[key].isIssued) {
                    creditsIds[index] = id;
                    vintageYears[index] = vintages[i];
                    data[index] = verificationData[key];
                    index++;
                }
            }
        }

        return (creditsIds, vintageYears, data);
    }
}