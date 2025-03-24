import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { WalletConnect } from '@/components/WalletConnect';
import { IntlProvider } from 'react-intl';

// Mock wagmi hooks
vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useConnect: vi.fn(),
  useDisconnect: vi.fn(),
}));

describe('Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows connect button when user is not connected', () => {
    vi.mocked(useAccount).mockReturnValue({
      address: undefined,
      isConnecting: false,
      isDisconnected: true,
      isConnected: false,
      status: 'disconnected'
    } as any);

    vi.mocked(useConnect).mockReturnValue({
      connect: vi.fn(),
      connectors: [],
      isLoading: false,
      pendingConnector: undefined,
    } as any);

    render(
      <IntlProvider messages={{}} locale="en">
        <WalletConnect />
      </IntlProvider>
    );

    expect(screen.getByText(/connect wallet/i)).toBeInTheDocument();
  });

  it('shows address when user is connected', () => {
    const mockAddress = '0x1234...5678';

    vi.mocked(useAccount).mockReturnValue({
      address: mockAddress as `0x${string}`,
      isConnected: true,
      isConnecting: false,
      isDisconnected: false,
      status: 'connected'
    } as any);

    vi.mocked(useDisconnect).mockReturnValue({
      disconnect: vi.fn(),
      isLoading: false,
    } as any);

    render(
      <IntlProvider messages={{}} locale="en">
        <WalletConnect />
      </IntlProvider>
    );

    expect(screen.getByText(mockAddress)).toBeInTheDocument();
  });

  it('handles connection attempt', async () => {
    const mockConnect = vi.fn();

    vi.mocked(useAccount).mockReturnValue({
      address: undefined,
      isConnecting: false,
      isDisconnected: true,
      isConnected: false,
      status: 'disconnected'
    } as any);

    vi.mocked(useConnect).mockReturnValue({
      connect: mockConnect,
      connectors: [{
        id: 'test',
        name: 'Test Connector',
        ready: true,
      }],
      isLoading: false,
      pendingConnector: undefined,
    } as any);

    render(
      <IntlProvider messages={{}} locale="en">
        <WalletConnect />
      </IntlProvider>
    );

    const connectButton = screen.getByText(/connect wallet/i);
    fireEvent.click(connectButton);

    expect(mockConnect).toHaveBeenCalled();
  });

  it('shows loading state while connecting', () => {
    vi.mocked(useAccount).mockReturnValue({
      address: undefined,
      isConnecting: true,
      isDisconnected: false,
      isConnected: false,
      status: 'connecting'
    } as any);

    render(
      <IntlProvider messages={{}} locale="en">
        <WalletConnect />
      </IntlProvider>
    );

    expect(screen.getByText(/connecting/i)).toBeInTheDocument();
  });
});
