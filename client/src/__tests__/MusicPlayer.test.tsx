import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MusicPlayer } from '@/components/MusicPlayer';
import { MusicPlayerProvider } from '@/contexts/MusicPlayerContext';
import { MusicSyncProvider } from '@/contexts/MusicSyncContext';
import { IntlProvider } from 'react-intl';

// Mock audio implementation
const mockAudio = {
  play: vi.fn(),
  pause: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  currentTime: 0,
  duration: 180,
};

// Mock the Audio constructor
global.Audio = vi.fn(() => mockAudio);

// Mock the context hooks
const mockUseMusicPlayer = vi.fn();
const mockUseMusicSync = vi.fn();

vi.mock('@/contexts/MusicPlayerContext', () => ({
  useMusicPlayer: () => mockUseMusicPlayer(),
  MusicPlayerProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

vi.mock('@/contexts/MusicSyncContext', () => ({
  useMusicSync: () => mockUseMusicSync(),
  MusicSyncProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

describe('MusicPlayer', () => {
  const mockTrack = {
    id: '1',
    title: 'Test Track',
    artist: 'Test Artist',
    ipfsHash: 'QmTest...',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAudio.currentTime = 0;

    // Set up default mock implementations
    mockUseMusicSync.mockReturnValue({
      syncState: {},
      setSyncState: vi.fn(),
    });
  });

  const renderWithProviders = (component: React.ReactNode) => {
    return render(
      <IntlProvider messages={{}} locale="en">
        <MusicSyncProvider>
          <MusicPlayerProvider>
            {component}
          </MusicPlayerProvider>
        </MusicSyncProvider>
      </IntlProvider>
    );
  };

  it('renders player when track is available', () => {
    mockUseMusicPlayer.mockReturnValue({
      currentTrack: mockTrack,
      isPlaying: false,
      play: vi.fn(),
      pause: vi.fn(),
    });

    renderWithProviders(<MusicPlayer />);
    expect(screen.getByText(mockTrack.title)).toBeInTheDocument();
    expect(screen.getByText(mockTrack.artist)).toBeInTheDocument();
  });

  it('toggles play/pause when button is clicked', () => {
    const mockPlay = vi.fn();
    const mockPause = vi.fn();

    mockUseMusicPlayer.mockReturnValue({
      currentTrack: mockTrack,
      isPlaying: false,
      play: mockPlay,
      pause: mockPause,
    });

    renderWithProviders(<MusicPlayer />);
    const playButton = screen.getByRole('button', { name: 'Play' });
    fireEvent.click(playButton);
    expect(mockPlay).toHaveBeenCalled();

    // Test pause functionality
    mockUseMusicPlayer.mockReturnValue({
      currentTrack: mockTrack,
      isPlaying: true,
      play: mockPlay,
      pause: mockPause,
    });

    const pauseButton = screen.getByRole('button', { name: 'Pause' });
    fireEvent.click(pauseButton);
    expect(mockPause).toHaveBeenCalled();
  });

  it('displays current time and duration', () => {
    mockUseMusicPlayer.mockReturnValue({
      currentTrack: mockTrack,
      isPlaying: true,
      currentTime: 60,
      duration: 180,
      play: vi.fn(),
      pause: vi.fn(),
    });

    renderWithProviders(<MusicPlayer />);
    expect(screen.getByText('1:00')).toBeInTheDocument();
    expect(screen.getByText('3:00')).toBeInTheDocument();
  });
});