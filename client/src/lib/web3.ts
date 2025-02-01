import { createConfig, http } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
import { createPublicClient, walletClient } from 'viem';

// Create a public client
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
});

// Create wagmi config
export const config = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http(),
  },
  connectors: [
    injected({
      target: 'metaMask',
    }),
  ],
  client: {
    public: publicClient,
  },
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

export const getBalance = async (address: string) => {
  if (!isConnected()) return BigInt(0);
  const connections = Array.from(config.state.connections);
  if (!connections.length) return BigInt(0);
  const [, connection] = connections[0];
  if (!connection) return BigInt(0);
  return publicClient.getBalance({ address });
};