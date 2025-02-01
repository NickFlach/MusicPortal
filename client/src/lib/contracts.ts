import { ethers } from "ethers";

// Contract addresses
export const PFORK_TOKEN_ADDRESS = '0x216490C8E6b33b4d8A2390dADcf9f433E30da60F';
export const TREASURY_ADDRESS = '0x5fe2434F5C5d614d8dc5362AA96a4d9aFFdC5A82';
export const PLAYLIST_NFT_ADDRESS = '0x0177102d27753957EBD4221e1b0Cf4777c2A2Bf2';

// NEO X chain configuration
export const NEO_CHAIN_ID = 1;
export const NEO_RPC_URL = 'https://mainnet.neo.org/';

let provider: ethers.BrowserProvider | null = null;
let signer: ethers.JsonRpcSigner | null = null;

export async function connectWallet() {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('MetaMask is not installed');
  }

  try {
    provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    signer = await provider.getSigner();
    return accounts[0];
  } catch (error) {
    console.error('Error connecting to wallet:', error);
    throw error;
  }
}

export function getProvider() {
  if (!provider) {
    throw new Error('Provider not initialized. Call connectWallet() first.');
  }
  return provider;
}

export function getSigner() {
  if (!signer) {
    throw new Error('Signer not initialized. Call connectWallet() first.');
  }
  return signer;
}

// ABI definitions
export const PFORK_TOKEN_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
] as const;

export const TREASURY_ABI = [
  'function claimUploadReward() external',
  'function claimPlaylistReward() external',
  'function claimNFTReward() external',
  'function hasClaimedUpload(address) view returns (bool)',
  'function hasClaimedPlaylist(address) view returns (bool)',
  'function hasClaimedNFT(address) view returns (bool)',
  'function transferTreasury(address) external',
  'function owner() view returns (address)',
] as const;

export const PLAYLIST_NFT_ABI = [
  'function mintSong(address to, string title, string artist, string ipfsHash, string metadataUri) payable returns (uint256)',
  'function uri(uint256 tokenId) view returns (string)',
  'function getCurrentTokenId() view returns (uint256)',
  'function balanceOf(address account, uint256 id) view returns (uint256)',
  'function isApprovedForAll(address account, address operator) view returns (bool)',
  'function setApprovalForAll(address operator, bool approved)',
  'function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data)',
  'function safeBatchTransferFrom(address from, address to, uint256[] ids, uint256[] amounts, bytes data)',
] as const;

// Contract instance getters
export function getPFORKTokenContract() {
  return new ethers.Contract(PFORK_TOKEN_ADDRESS, PFORK_TOKEN_ABI, getSigner());
}

export function getTreasuryContract() {
  return new ethers.Contract(TREASURY_ADDRESS, TREASURY_ABI, getSigner());
}

export function getPlaylistNFTContract() {
  return new ethers.Contract(PLAYLIST_NFT_ADDRESS, PLAYLIST_NFT_ABI, getSigner());
}