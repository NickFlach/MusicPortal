import { createConfig, http } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

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
});

export const isConnected = () => {
  return config.state.connections.size > 0;
};

export const getAccount = () => {
  if (!isConnected()) return null;
  const [[, connection]] = config.state.connections;
  return connection?.accounts[0];
};

export const getBalance = async (address: string) => {
  if (!isConnected()) return BigInt(0);
  const [[, connection]] = config.state.connections;
  if (!connection) return BigInt(0);
  return connection.transport.getBalance({ address });
};