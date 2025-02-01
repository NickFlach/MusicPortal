import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { type MusicMood, detectMood, moodBackgrounds } from "@/lib/moodDetection";
import { analyzeMoodWithAI } from "@/lib/moodAnalysis";
import { VideoBackgroundGenerator } from "./VideoBackgroundGenerator";

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
        const basicMood = detectMood(currentSong);
        setMood(basicMood);

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

  useEffect(() => {
    if (!isPlaying || !currentSong) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setAudioLevel(0);
      return;
    }

    // Find the audio element
    const audioElements = document.getElementsByTagName('audio');
    if (!audioElements.length) return;
    const audio = audioElements[0];

    // Initialize audio context if needed
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 32; // Smaller size for overall volume
    }

    // Only create a new source if we haven't connected to this audio element
    if (!sourceRef.current) {
      sourceRef.current = audioContextRef.current.createMediaElementSource(audio);
      sourceRef.current.connect(analyserRef.current!);
      analyserRef.current!.connect(audioContextRef.current.destination);
    }

    function updateAnimation() {
      if (!analyserRef.current) return;

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);

      // Calculate average volume level
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      const normalizedLevel = average / 255;

      setAudioLevel(normalizedLevel);
      animationFrameRef.current = requestAnimationFrame(updateAnimation);
    }

    updateAnimation();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, currentSong]);

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

        <motion.h2 
          className="text-6xl font-bold"
          style={{
            background: background.gradient,
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

        {/* Audio level indicator */}
        <div className="flex gap-1 mt-4">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="w-1 rounded-full bg-white/30"
              animate={{
                height: `${Math.max(4, (audioLevel * 100) * (1 - Math.abs(i - 10) / 10))}px`,
                opacity: audioLevel > i / 20 ? 1 : 0.3,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}