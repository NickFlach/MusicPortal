import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { type MusicMood, detectMood } from "@/lib/moodDetection";
import { analyzeMoodWithAI } from "@/lib/moodAnalysis";

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

  // Animation variants based on mood
  const moodAnimations = {
    energetic: {
      rotate: [0, 360],
      scale: [1, 1.2 + audioLevel * 0.3],
    },
    calm: {
      rotate: [-10, 10],
      scale: [1, 1.1 + audioLevel * 0.2],
    },
    happy: {
      rotate: [-20, 20],
      scale: [1, 1.15 + audioLevel * 0.25],
    },
    melancholic: {
      rotate: [-5, 5],
      scale: [1, 1.05 + audioLevel * 0.15],
    },
    mysterious: {
      rotate: [0, 180],
      scale: [1, 1.1 + audioLevel * 0.2],
    },
    romantic: {
      rotate: [-15, 15],
      scale: [1, 1.12 + audioLevel * 0.22],
    },
  };

  return (
    <div className="relative w-full h-64 bg-background/80 backdrop-blur rounded-lg overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.img 
          src="/neo_token_logo_flaukowski.png" 
          alt="NEO Token"
          className="w-32 h-32"
          animate={moodAnimations[mood]}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
        />
      </div>
      <div className="absolute inset-x-0 bottom-8 text-center">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
          {mood.charAt(0).toUpperCase() + mood.slice(1)} Vibes
        </h2>
      </div>
    </div>
  );
}