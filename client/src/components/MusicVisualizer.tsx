import { useEffect, useRef } from "react";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { WaveformVisualizer } from "./WaveformVisualizer";

export function MusicVisualizer() {
  const { currentSong } = useMusicPlayer();

  if (!currentSong) return null;

  return (
    <div className="relative -mx-6 -mt-6 h-[60vh] overflow-hidden">
      {/* Background Logo */}
      <div
        className="absolute inset-0 z-10 opacity-15"
        style={{
          backgroundImage: 'url("/neo_token_logo_flaukowski.png")',
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: 'blur(4px)',
        }}
      />

      {/* Content */}
      <div className="relative z-20 flex flex-col items-center justify-between h-full py-12">
        {/* Waveform Section */}
        <div className="w-full max-w-3xl px-6 my-8">
          <WaveformVisualizer />
        </div>
      </div>
    </div>
  );
}