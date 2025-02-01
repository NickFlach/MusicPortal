// Web3 helper functions for wallet connections and state management
import { ethers } from 'ethers';

// Types
export type Web3State = {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  provider: ethers.BrowserProvider | null;
};

let provider: ethers.BrowserProvider | null = null;

// Initialize and check wallet connection
export async function initializeWeb3(): Promise<Web3State> {
  if (typeof window.ethereum === 'undefined') {
    return {
      isConnected: false,
      address: null,
      chainId: null,
      provider: null
    };
  }

  provider = new ethers.BrowserProvider(window.ethereum);
  const chainId = await provider.send('eth_chainId', []);
  const accounts = await provider.send('eth_accounts', []);

  return {
    isConnected: accounts.length > 0,
    address: accounts[0] || null,
    chainId: parseInt(chainId, 16),
    provider
  };
}

// Request wallet connection
export async function connectWallet(): Promise<Web3State> {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('MetaMask is not installed');
  }

  provider = new ethers.BrowserProvider(window.ethereum);

  try {
    const accounts = await provider.send('eth_requestAccounts', []);
    const chainId = await provider.send('eth_chainId', []);

    return {
      isConnected: accounts.length > 0,
      address: accounts[0] || null,
      chainId: parseInt(chainId, 16),
      provider
    };
  } catch (error) {
    console.error('Connection error:', error);
    throw new Error('Failed to connect wallet');
  }
}

// Get current wallet state
export async function getWalletState(): Promise<Web3State> {
  if (!provider || typeof window.ethereum === 'undefined') {
    return {
      isConnected: false,
      address: null,
      chainId: null,
      provider: null
    };
  }

  const accounts = await provider.send('eth_accounts', []);
  const chainId = await provider.send('eth_chainId', []);

  return {
    isConnected: accounts.length > 0,
    address: accounts[0] || null,
    chainId: parseInt(chainId, 16),
    provider
  };
}

// Subscribe to account changes
export function subscribeToAccountChanges(callback: (accounts: string[]) => void): () => void {
  if (typeof window.ethereum === 'undefined') {
    return () => {};
  }

  window.ethereum.on('accountsChanged', callback);
  return () => {
    window.ethereum.removeListener('accountsChanged', callback);
  };
}

// Subscribe to chain changes
export function subscribeToChainChanges(callback: (chainId: string) => void): () => void {
  if (typeof window.ethereum === 'undefined') {
    return () => {};
  }

  window.ethereum.on('chainChanged', callback);
  return () => {
    window.ethereum.removeListener('chainChanged', callback);
  };
}

// Get signer for transactions
export async function getSigner(): Promise<ethers.JsonRpcSigner | null> {
  if (!provider) return null;
  try {
    return await provider.getSigner();
  } catch (error) {
    console.error('Error getting signer:', error);
    return null;
  }
}