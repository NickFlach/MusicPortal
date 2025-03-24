import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IPFSStorage } from '@/components/IPFSStorage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IntlProvider } from 'react-intl';

// Mock wagmi's useAccount hook
vi.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0x123...', // Mock wallet address
    isConnecting: false,
    isDisconnected: false
  })
}));

describe('IPFSStorage Component', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const renderWithProviders = (component: React.ReactNode) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <IntlProvider messages={{}} locale="en">
          {component}
        </IntlProvider>
      </QueryClientProvider>
    );
  };

  it('renders upload button', () => {
    renderWithProviders(<IPFSStorage />);
    expect(screen.getByText(/Upload/i)).toBeInTheDocument();
  });

  it('shows loading state when fetching files', async () => {
    renderWithProviders(<IPFSStorage />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('displays uploaded files when available', async () => {
    renderWithProviders(<IPFSStorage />);
    await waitFor(() => {
      expect(screen.getByText('Test Song')).toBeInTheDocument();
    });
  });

  it('handles file upload', async () => {
    renderWithProviders(<IPFSStorage />);
    
    const file = new File(['test'], 'test.mp3', { type: 'audio/mpeg' });
    const input = screen.getByLabelText(/upload/i);
    
    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText(/uploading/i)).toBeInTheDocument();
    });
  });
});
