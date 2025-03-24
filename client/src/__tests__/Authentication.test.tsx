import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WalletConnect } from '@/components/WalletConnect';
import { IntlProvider } from 'react-intl';

// Mock wagmi hooks
const mockUseAccount = vi.fn();
const mockUseConnect = vi.fn();
const mockUseDisconnect = vi.fn();

vi.mock('wagmi', () => ({
  useAccount: () => mockUseAccount(),
  useConnect: () => mockUseConnect(),
  useDisconnect: () => mockUseDisconnect(),
}));

describe('Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows connect button when user is not connected', () => {
    mockUseAccount.mockReturnValue({
      address: undefined,
      isConnecting: false,
      isDisconnected: true,
      isConnected: false,
      status: 'disconnected'
    });

    mockUseConnect.mockReturnValue({
      connect: vi.fn(),
      connectors: [],
      isLoading: false,
      pendingConnector: undefined,
    });

    render(
      <IntlProvider messages={{}} locale="en">
        <WalletConnect />
      </IntlProvider>
    );

    expect(screen.getByText(/connect wallet/i)).toBeInTheDocument();
  });

  it('shows address when user is connected', () => {
    const mockAddress = '0x1234...5678';

    mockUseAccount.mockReturnValue({
      address: mockAddress as `0x${string}`,
      isConnected: true,
      isConnecting: false,
      isDisconnected: false,
      status: 'connected'
    });

    mockUseDisconnect.mockReturnValue({
      disconnect: vi.fn(),
      isLoading: false,
    });

    render(
      <IntlProvider messages={{}} locale="en">
        <WalletConnect />
      </IntlProvider>
    );

    expect(screen.getByText(mockAddress)).toBeInTheDocument();
  });

  it('handles connection attempt', async () => {
    const mockConnect = vi.fn();

    mockUseAccount.mockReturnValue({
      address: undefined,
      isConnecting: false,
      isDisconnected: true,
      isConnected: false,
      status: 'disconnected'
    });

    mockUseConnect.mockReturnValue({
      connect: mockConnect,
      connectors: [{
        id: 'test',
        name: 'Test Connector',
        ready: true,
      }],
      isLoading: false,
      pendingConnector: undefined,
    });

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
    mockUseAccount.mockReturnValue({
      address: undefined,
      isConnecting: true,
      isDisconnected: false,
      isConnected: false,
      status: 'connecting'
    });

    render(
      <IntlProvider messages={{}} locale="en">
        <WalletConnect />
      </IntlProvider>
    );

    expect(screen.getByText(/connecting/i)).toBeInTheDocument();
  });
});