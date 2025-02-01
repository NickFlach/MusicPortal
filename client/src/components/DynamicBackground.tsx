import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { detectMood, type MusicMood, moodBackgrounds } from "@/lib/moodDetection";
import { analyzeMoodWithAI } from "@/lib/moodAnalysis";

export function DynamicBackground() {
  const { currentSong } = useMusicPlayer();
  const [currentMood, setCurrentMood] = useState<MusicMood>("mysterious");

  useEffect(() => {
    async function updateMood() {
      if (currentSong) {
        try {
          if (import.meta.env.VITE_OPENAI_API_KEY) {
            // Only try AI analysis if we have an API key
            const mood = await analyzeMoodWithAI(currentSong);
            setCurrentMood(mood);
          } else {
            // Fallback to basic detection if no API key
            const mood = detectMood(currentSong);
            setCurrentMood(mood);
          }
        } catch (error) {
          console.error('Error analyzing mood:', error);
          // Fallback to basic detection if AI fails
          const mood = detectMood(currentSong);
          setCurrentMood(mood);
        }
      }
    }

    updateMood();
  }, [currentSong]);

  const background = moodBackgrounds[currentMood];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentMood}
        initial={{ opacity: 0 }}
        animate={{ 
          opacity: 0.6,
          background: background.gradient
        }}
        exit={{ opacity: 0 }}
        transition={{ 
          duration: 2,
          ease: "easeInOut",
          background: {
            duration: 1.5
          }
        }}
        className="fixed inset-0 pointer-events-none bg-blend-overlay"
        style={{
          filter: 'blur(100px)',
          transform: 'scale(1.5)',
          zIndex: -1
        }}
      />
    </AnimatePresence>
  );
}