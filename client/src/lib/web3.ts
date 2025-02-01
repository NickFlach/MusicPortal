import { mainnet } from 'wagmi/chains';

// Simple MetaMask interaction functions
export async function requestAccounts(): Promise<string[]> {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('MetaMask is not installed');
  }
  return window.ethereum.request({ method: 'eth_requestAccounts' });
}

export async function getAccounts(): Promise<string[]> {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('MetaMask is not installed');
  }
  return window.ethereum.request({ method: 'eth_accounts' });
}

export async function getBalance(address: string): Promise<string> {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('MetaMask is not installed');
  }
  return window.ethereum.request({ 
    method: 'eth_getBalance',
    params: [address, 'latest']
  });
}

// Contract interaction helpers
export async function sendTransaction(params: {
  to: string;
  from: string;
  data?: string;
  value?: string;
}) {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('MetaMask is not installed');
  }
  return window.ethereum.request({
    method: 'eth_sendTransaction',
    params: [params],
  });
}

export async function callContract(params: {
  to: string;
  data: string;
}) {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('MetaMask is not installed');
  }
  return window.ethereum.request({
    method: 'eth_call',
    params: [params, 'latest'],
  });
}

export const chain = mainnet;

// Type declarations
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: any) => void;
      removeListener: (event: string, callback: any) => void;
      selectedAddress: string | null;
      chainId?: string;
    };
  }
}