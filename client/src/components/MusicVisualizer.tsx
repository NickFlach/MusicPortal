import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { detectMood, type MusicMood, moodBackgrounds } from "@/lib/moodDetection";
import { analyzeMoodWithAI } from "@/lib/moodAnalysis";
import { VideoBackgroundGenerator } from "./VideoBackgroundGenerator";
import { WaveformVisualizer } from "./WaveformVisualizer";

export function MusicVisualizer() {
  const { currentSong, isPlaying } = useMusicPlayer();
  const [mood, setMood] = useState<MusicMood>("mysterious");
  const [audioLevel, setAudioLevel] = useState(0);
  const audioContextRef = useRef<AudioContext>();
  const analyserRef = useRef<AnalyserNode>();
  const sourceRef = useRef<MediaElementAudioSourceNode>();
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    if (!currentSong) return;

    async function updateMood() {
      try {
        // Start with basic detection immediately
        setMood(detectMood(currentSong));

        // Then try AI analysis if API key exists
        if (import.meta.env.VITE_OPENAI_API_KEY) {
          const detectedMood = await analyzeMoodWithAI(currentSong);
          setMood(detectedMood);
        }
      } catch (error) {
        console.error('Error analyzing mood:', error);
      }
    }

    updateMood();
  }, [currentSong]);

  useEffect(() => {
    // Cleanup function to handle audio context and animation frame
    return () => {
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []); // Empty dependency array for cleanup on unmount

  if (!currentSong) return null;

  const background = moodBackgrounds[mood];

  return (
    <div className="relative -mx-6 -mt-24 h-[60vh] overflow-hidden">
      {/* Video Background */}
      <VideoBackgroundGenerator mood={mood} audioLevel={audioLevel} />

      {/* Content */}
      <div className="relative z-20 flex flex-col items-center justify-center h-full gap-8">
        <motion.img 
          src="/neo_token_logo_flaukowski.png" 
          alt="NEO Token"
          className="w-40 h-40 drop-shadow-2xl"
          animate={{
            rotate: audioLevel > 0.1 ? [0, 360] : 0,
            scale: 1 + audioLevel * 0.3,
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
        />

        {/* Waveform Visualizer */}
        <div className="w-full max-w-3xl px-6">
          <WaveformVisualizer />
        </div>

        <motion.h2 
          className="text-6xl font-bold"
          style={{
            background: `linear-gradient(135deg, ${background.colors[0]}, ${background.colors[1]})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textShadow: "0 0 30px rgba(0,0,0,0.2)"
          }}
          animate={{
            scale: 1 + audioLevel * 0.1,
          }}
          transition={{
            duration: 0.2
          }}
        >
          {mood.charAt(0).toUpperCase() + mood.slice(1)} Vibes
        </motion.h2>
      </div>
    </div>
  );
}