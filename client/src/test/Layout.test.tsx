import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Layout } from '@/components/Layout';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock wagmi's useAccount hook
vi.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0x123...',
    isConnecting: false,
    isDisconnected: false
  })
}));

// Mock the MusicPlayer context
vi.mock('@/contexts/MusicPlayerContext', () => ({
  useMusicPlayer: () => ({
    isPlaying: false,
    currentTrack: null,
    play: vi.fn(),
    pause: vi.fn(),
  }),
  MusicPlayerProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

describe('Layout Component', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const renderWithProviders = (children: React.ReactNode) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <IntlProvider messages={{}} locale="en">
          {children}
        </IntlProvider>
      </QueryClientProvider>
    );
  };

  it('renders children content', () => {
    renderWithProviders(
      <Layout>
        <div data-testid="test-content">Test Content</div>
      </Layout>
    );
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
  });

  it('renders navigation menu', () => {
    renderWithProviders(
      <Layout>
        <div>Content</div>
      </Layout>
    );
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('shows music player when a track is available', () => {
    vi.mocked(useMusicPlayer).mockReturnValue({ //This line was removed.
      isPlaying: true,
      currentTrack: {
        id: '1',
        title: 'Test Track',
        artist: 'Test Artist',
      },
      play: vi.fn(),
      pause: vi.fn(),
    });

    renderWithProviders(
      <Layout>
        <div>Content</div>
      </Layout>
    );
    expect(screen.getByText('Test Track')).toBeInTheDocument();
  });
});