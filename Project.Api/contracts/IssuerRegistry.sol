// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract IssuerRegistry {
  address public owner;

  struct Educator {
    address wallet;
    uint256 joinDate;
    string name;
  }

  mapping(address => Educator) private educators;
  address[] private educatorAddresses;

  event EducatorAdded(address indexed wallet, string name);
  event EducatorRemoved(address indexed wallet);
  event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

  modifier onlyOwner() {
    require(msg.sender == owner, "IssuerRegistry: caller is not the owner");
    _;
  }

  constructor() {
    owner = msg.sender;
    emit OwnershipTransferred(address(0), msg.sender);
  }

  function transferOwnership(address newOwner) public onlyOwner {
    require(newOwner != address(0), "IssuerRegistry: new owner is the zero address");
    emit OwnershipTransferred(owner, newOwner);
    owner = newOwner;
  }

  function addEducator(address wallet, string memory name) public onlyOwner {
    require(wallet != address(0), "IssuerRegistry: zero address");
    require(educators[wallet].wallet == address(0), "IssuerRegistry: already registered");

    educators[wallet] = Educator(wallet, block.timestamp, name);
    educatorAddresses.push(wallet);

    emit EducatorAdded(wallet, name);
  }

  function removeEducator(address wallet) public onlyOwner {
    require(educators[wallet].wallet != address(0), "IssuerRegistry: not registered");

    delete educators[wallet];

    for (uint256 i = 0; i < educatorAddresses.length; i++) {
      if (educatorAddresses[i] == wallet) {
        educatorAddresses[i] = educatorAddresses[educatorAddresses.length - 1];
        educatorAddresses.pop();
        break;
      }
    }

    emit EducatorRemoved(wallet);
  }

  function getEducator(address wallet) public view returns (address, uint256, string memory) {
    Educator memory e = educators[wallet];
    return (e.wallet, e.joinDate, e.name);
  }

  function isEducator(address wallet) public view returns (bool) {
    return educators[wallet].wallet != address(0);
  }

  function getAllEducators() public view returns (address[] memory) {
    return educatorAddresses;
  }

  function educatorCount() public view returns (uint256) {
    return educatorAddresses.length;
  }
}
