import { createPublicClient, createWalletClient, custom, http, type Abi } from 'viem';
import { mainnet } from 'viem/chains';

// Create a public client
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

// Create a wallet client when MetaMask is available
function getWalletClient() {
  if (typeof window.ethereum === 'undefined') {
    throw new Error('MetaMask is not installed');
  }

  return createWalletClient({
    chain: mainnet,
    transport: custom(window.ethereum),
  });
}

// Contract interaction functions
export async function writeContract(params: {
  address: `0x${string}`;
  abi: Abi;
  functionName: string;
  args: any[];
}) {
  const walletClient = getWalletClient();
  const [address] = await walletClient.getAddresses();

  const { request } = await publicClient.simulateContract({
    ...params,
    account: address,
  });

  return walletClient.writeContract(request);
}

export async function readContract(params: {
  address: `0x${string}`;
  abi: Abi;
  functionName: string;
  args: any[];
}) {
  return publicClient.readContract(params);
}

export async function getBalance(address: `0x${string}`): Promise<bigint> {
  try {
    return await publicClient.getBalance({ address });
  } catch (error) {
    console.error('Error getting balance:', error);
    return BigInt(0);
  }
}

export const web3Client = {
  readContract,
  writeContract,
  getBalance,
};

// Type declarations for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: any) => void;
      removeListener: (event: string, callback: any) => void;
      selectedAddress: string | null;
    };
  }
}