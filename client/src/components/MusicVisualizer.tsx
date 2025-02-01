import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { type MusicMood } from "@/lib/moodDetection";
import { analyzeMoodWithAI } from "@/lib/moodAnalysis";

export function MusicVisualizer() {
  const { currentSong, isPlaying } = useMusicPlayer();
  const [mood, setMood] = useState<MusicMood>("mysterious");
  const [bars, setBars] = useState<number[]>(Array(20).fill(0));
  const audioContextRef = useRef<AudioContext>();
  const analyserRef = useRef<AnalyserNode>();
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    if (!currentSong) return;

    async function updateMood() {
      try {
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
    if (!isPlaying || !currentSong) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setBars(Array(20).fill(0));
      return;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 64;
    }

    const audioElements = document.getElementsByTagName('audio');
    if (audioElements.length === 0) return;

    const audio = audioElements[0];
    const source = audioContextRef.current.createMediaElementSource(audio);
    source.connect(analyserRef.current);
    analyserRef.current.connect(audioContextRef.current.destination);

    function updateBars() {
      if (!analyserRef.current) return;
      
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Get every third value for smoother visualization
      const newBars = Array.from({ length: 20 }, (_, i) => 
        dataArray[i * 3] ? dataArray[i * 3] / 255 : 0
      );
      
      setBars(newBars);
      animationFrameRef.current = requestAnimationFrame(updateBars);
    }

    updateBars();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, currentSong]);

  if (!currentSong) return null;

  return (
    <div className="relative w-full h-64 bg-background/80 backdrop-blur rounded-lg overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
          {mood.charAt(0).toUpperCase() + mood.slice(1)} Vibes
        </h2>
      </div>
      <div className="absolute inset-0 flex items-end justify-center gap-1 p-4">
        {bars.map((height, index) => (
          <motion.div
            key={index}
            className="w-4 bg-primary/50 rounded-t-lg"
            animate={{ height: `${Math.max(5, height * 100)}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 10 }}
          />
        ))}
      </div>
    </div>
  );
}
