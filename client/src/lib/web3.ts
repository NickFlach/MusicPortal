import { createConfig, http } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

const projectId = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID;

export const config = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http(),
  },
  connectors: [
    injected(),
    walletConnect({ projectId }),
  ],
});

export const isConnected = () => {
  return config.state.connections.size > 0;
};

export const getAccount = () => {
  const [connection] = config.state.connections;
  return connection?.accounts[0];
};

export const getBalance = async (address: string) => {
  const [connection] = config.state.connections;
  if (!connection) return BigInt(0);
  return connection.transport.getBalance({ address });
};