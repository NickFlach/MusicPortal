import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MusicPlayer } from '@/components/MusicPlayer';
import { IntlProvider } from 'react-intl';

// Mock the MusicPlayerContext
vi.mock('@/contexts/MusicPlayerContext', () => ({
  useMusicPlayer: vi.fn(),
  MusicPlayerProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock the audio element
const mockAudio = {
  play: vi.fn(),
  pause: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  currentTime: 0,
  duration: 180,
};

global.Audio = vi.fn().mockImplementation(() => mockAudio);

describe('MusicPlayer', () => {
  const mockTrack = {
    id: '1',
    title: 'Test Track',
    artist: 'Test Artist',
    ipfsHash: 'QmTest...',
  };

  const renderWithProviders = (component: React.ReactNode) => {
    return render(
      <IntlProvider messages={{}} locale="en">
        {component}
      </IntlProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders player when track is available', () => {
    const mockUseMusicPlayer = vi.mocked(useMusicPlayer);
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
    const mockUseMusicPlayer = vi.mocked(useMusicPlayer);

    mockUseMusicPlayer.mockReturnValue({
      currentTrack: mockTrack,
      isPlaying: false,
      play: mockPlay,
      pause: mockPause,
    });

    renderWithProviders(<MusicPlayer />);
    const playButton = screen.getByRole('button', { name: /play/i });
    fireEvent.click(playButton);
    expect(mockPlay).toHaveBeenCalled();
  });

  it('displays current time and duration', () => {
    const mockUseMusicPlayer = vi.mocked(useMusicPlayer);
    mockUseMusicPlayer.mockReturnValue({
      currentTrack: mockTrack,
      isPlaying: true,
      currentTime: 60,
      duration: 180,
      play: vi.fn(),
      pause: vi.fn(),
    });

    renderWithProviders(<MusicPlayer />);
    expect(screen.getByText('1:00')).toBeInTheDocument(); // Current time
    expect(screen.getByText('3:00')).toBeInTheDocument(); // Duration
  });
});