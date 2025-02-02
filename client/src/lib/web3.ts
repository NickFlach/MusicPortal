import { createConfig, http } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
import { createPublicClient, defineChain } from 'viem';

// Define NEO X network
export const neoXChain = defineChain({
  id: 2970385, // NEO X Chain ID
  network: 'neo-x',
  name: 'NEO X TestNet',
  nativeCurrency: {
    name: 'GAS',
    symbol: 'GAS',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://nodes.neo-x.network'] },
    public: { http: ['https://nodes.neo-x.network'] },
  },
  blockExplorers: {
    default: {
      name: 'NEO X Explorer',
      url: 'https://explorer.neo-x.network',
    },
  },
  testnet: true,
});

// Create a public client
const publicClient = createPublicClient({
  chain: neoXChain,
  transport: http(),
});

// Create wagmi config with NEO X chain
export const config = createConfig({
  chains: [neoXChain],
  transports: {
    [neoXChain.id]: http(),
  },
  connectors: [
    injected({
      target: 'metaMask',
    }),
  ],
});

// Helper functions
export const isConnected = () => {
  return Boolean(config.state.connections.size);
};

export const getAccount = () => {
  if (!isConnected()) return null;
  const connections = Array.from(config.state.connections);
  if (!connections.length) return null;
  const [, connection] = connections[0];
  return connection?.accounts[0];
};

export const getBalance = async (address: `0x${string}`) => {
  if (!isConnected()) return BigInt(0);
  return publicClient.getBalance({ address });
};

// NEO X Network Management
export const addNeoXNetwork = async () => {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  try {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: `0x${neoXChain.id.toString(16)}`,
          chainName: neoXChain.name,
          nativeCurrency: neoXChain.nativeCurrency,
          rpcUrls: neoXChain.rpcUrls.public.http,
          blockExplorerUrls: [neoXChain.blockExplorers.default.url],
        },
      ],
    });
    return true;
  } catch (error) {
    console.error('Error adding NEO X network:', error);
    throw error;
  }
};

export const switchToNeoXNetwork = async () => {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${neoXChain.id.toString(16)}` }],
    });
    return true;
  } catch (error: any) {
    // If the error code is 4902, the chain hasn't been added
    if (error.code === 4902) {
      return addNeoXNetwork();
    }
    throw error;
  }
};

export const isNeoXNetwork = async () => {
  if (!window.ethereum) return false;

  try {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    return chainId === `0x${neoXChain.id.toString(16)}`;
  } catch (error) {
    console.error('Error checking network:', error);
    return false;
  }
};