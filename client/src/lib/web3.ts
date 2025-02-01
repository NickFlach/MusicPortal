import { createConfig, configureChains, mainnet } from 'wagmi';
import { MetaMaskConnector } from 'wagmi/connectors/metaMask';
import { WalletConnectConnector } from 'wagmi/connectors/walletConnect';
import { publicProvider } from 'wagmi/providers/public';

const projectId = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID;

const { chains, publicClient, webSocketPublicClient } = configureChains(
  [mainnet],
  [publicProvider()]
);

export const config = createConfig({
  autoConnect: true,
  connectors: [
    new MetaMaskConnector({ chains }),
    new WalletConnectConnector({
      chains,
      options: {
        projectId,
        showQrModal: true,
      },
    }),
  ],
  publicClient,
  webSocketPublicClient,
});

export const isConnected = () => {
  return !!config.state.getAccount();
};

export const getAccount = () => {
  return config.state.getAccount()?.address;
};

export const getBalance = async (address: string) => {
  return await publicClient.getBalance({ address });
};