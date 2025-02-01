// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PlaylistNFT is ERC721, ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;
    uint256 public constant MINT_PRICE = 1 ether; // 1 GAS

    constructor() ERC721("Playlist NFT", "PNFT") Ownable(msg.sender) {}

    function safeMint(address to, string memory uri) public payable returns (uint256) {
        require(msg.value >= MINT_PRICE, "Insufficient GAS sent");
        
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
        
        // Forward GAS to treasury
        (bool sent, ) = owner().call{value: msg.value}("");
        require(sent, "Failed to send GAS");
        
        return tokenId;
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage)
        returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage)
        returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
