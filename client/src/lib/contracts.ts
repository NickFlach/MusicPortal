import { createPublicClient, http, parseAbi } from 'viem';
import { mainnet } from 'viem/chains';

// Contract addresses
export const PFORK_TOKEN_ADDRESS = '0x216490C8E6b33b4d8A2390dADcf9f433E30da60F';
export const TREASURY_ADDRESS = '0xeB57D2e1D869AA4b70961ce3aD99582E84F4F0d4';

// Create a public client
export const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

// ABI for PFORKToken
export const PFORK_TOKEN_ABI = parseAbi([
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
]);

// ABI for MusicTreasury
export const TREASURY_ABI = parseAbi([
  'function claimUploadReward() external',
  'function claimPlaylistReward() external',
  'function claimNFTReward() external',
  'function hasClaimedUpload(address) view returns (bool)',
  'function hasClaimedPlaylist(address) view returns (bool)',
  'function hasClaimedNFT(address) view returns (bool)',
  'function transferTreasury(address) external',
  'function owner() view returns (address)',
]);

// Contract interaction functions
export function getPFORKTokenContract() {
  return {
    address: PFORK_TOKEN_ADDRESS,
    abi: PFORK_TOKEN_ABI,
    publicClient,
  };
}

export function getTreasuryContract() {
  return {
    address: TREASURY_ADDRESS,
    abi: TREASURY_ABI,
    publicClient,
  };
}