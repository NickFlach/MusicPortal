import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Layout } from '@/components/Layout';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MusicPlayerProvider } from '@/contexts/MusicPlayerContext';
import { MusicSyncProvider } from '@/contexts/MusicSyncContext';

// Mock wagmi's useAccount hook
vi.mock('wagmi', () => ({
  useAccount: () => ({
    address: '0x123...',
    isConnecting: false,
    isDisconnected: false
  })
}));

// Mock the context hooks
const mockUseMusicPlayer = vi.fn();
const mockUseMusicSync = vi.fn();

// Mock the contexts
vi.mock('@/contexts/MusicPlayerContext', () => ({
  useMusicPlayer: () => mockUseMusicPlayer(),
  MusicPlayerProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

vi.mock('@/contexts/MusicSyncContext', () => ({
  useMusicSync: () => mockUseMusicSync(),
  MusicSyncProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

describe('Layout Component', () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  beforeEach(() => {
    mockUseMusicSync.mockReturnValue({
      syncState: {},
      setSyncState: vi.fn(),
    });
  });

  const renderWithProviders = (children: React.ReactNode) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <IntlProvider messages={{}} locale="en">
          <MusicSyncProvider>
            <MusicPlayerProvider>
              {children}
            </MusicPlayerProvider>
          </MusicSyncProvider>
        </IntlProvider>
      </QueryClientProvider>
    );
  };

  it('renders children content', () => {
    mockUseMusicPlayer.mockReturnValue({
      currentTrack: null,
      isPlaying: false,
      play: vi.fn(),
      pause: vi.fn(),
    });

    renderWithProviders(
      <Layout>
        <div data-testid="test-content">Test Content</div>
      </Layout>
    );
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
  });

  it('renders navigation menu', () => {
    mockUseMusicPlayer.mockReturnValue({
      currentTrack: null,
      isPlaying: false,
      play: vi.fn(),
      pause: vi.fn(),
    });

    renderWithProviders(
      <Layout>
        <div>Content</div>
      </Layout>
    );
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('shows music player when a track is available', () => {
    mockUseMusicPlayer.mockReturnValue({
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