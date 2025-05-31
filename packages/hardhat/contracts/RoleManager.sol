// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title RoleManager
/// @notice Centralizes role management for CarbonCreditToken and CarbonCreditNFT contracts.
/// @dev Uses AccessControl to manage roles across multiple contracts.
contract RoleManager is AccessControl {
    /// @notice Role identifier for authorized verifiers (for CarbonCreditToken).
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    /// @notice Role identifier for authorized minters (for CarbonCreditNFT).
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @notice Custom error for unauthorized admin actions.
    error NotAdmin();

    /// @notice Emitted when a role is granted to an account for a specific contract.
    /// @param role The role being granted.
    /// @param account The address receiving the role.
    /// @param targetContract The contract for which the role is granted.
    event roleGranted(bytes32 indexed role, address indexed account, address indexed targetContract);

    /// @notice Emitted when a role is revoked from an account for a specific contract.
    /// @param role The role being revoked.
    /// @param account The address losing the role.
    /// @param targetContract The contract for which the role is revoked.
    event roleRevoked(bytes32 indexed role, address indexed account, address indexed targetContract);

    /// @notice Initializes the contract and sets the deployer as the default admin.
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /// @notice Grants a role to an account for a specific target contract.
    /// @dev Only callable by accounts with DEFAULT_ADMIN_ROLE.
    /// @param role The role to grant (e.g., VERIFIER_ROLE or MINTER_ROLE).
    /// @param account The address to receive the role.
    /// @param targetContract The contract (CarbonCreditToken or CarbonCreditNFT) to grant the role for.
    function grantRoleToContract(
        bytes32 role,
        address account,
        address targetContract
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        if (targetContract == address(0)) revert("Invalid contract address");
        if (account == address(0)) revert("Invalid account address");

        // Grant role in the target contract
        AccessControl target = AccessControl(targetContract);
        target.grantRole(role, account);

        emit roleGranted(role, account, targetContract);
    }

    /// @notice Revokes a role from an account for a specific target contract.
    /// @dev Only callable by accounts with DEFAULT_ADMIN_ROLE.
    /// @param role The role to revoke (e.g., VERIFIER_ROLE or MINTER_ROLE).
    /// @param account The address to lose the role.
    /// @param targetContract The contract (CarbonCreditToken or CarbonCreditNFT) to revoke the role from.
    function revokeRoleFromContract(
        bytes32 role,
        address account,
        address targetContract
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        if (targetContract == address(0)) revert("Invalid contract address");
        if (account == address(0)) revert("Invalid account address");

        // Revoke role in the target contract
        AccessControl target = AccessControl(targetContract);
        target.revokeRole(role, account);

        emit roleRevoked(role, account, targetContract);
    }

    /// @notice Checks if an account has a specific role in a target contract.
    /// @param role The role to check (e.g., VERIFIER_ROLE or MINTER_ROLE).
    /// @param account The address to check.
    /// @param targetContract The contract to check the role for.
    /// @return True if the account has the role in the target contract, false otherwise.
    function hasRoleInContract(
        bytes32 role,
        address account,
        address targetContract
    ) public view returns (bool) {
        if (targetContract == address(0)) revert("Invalid contract address");
        AccessControl target = AccessControl(targetContract);
        return target.hasRole(role, account);
    }
}