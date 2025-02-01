import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { detectMood, type MusicMood, moodBackgrounds } from "@/lib/moodDetection";

export function DynamicBackground() {
  const { currentSong } = useMusicPlayer();
  const [currentMood, setCurrentMood] = useState<MusicMood>("mysterious");

  useEffect(() => {
    if (currentSong) {
      const mood = detectMood(currentSong);
      setCurrentMood(mood);
    }
  }, [currentSong]);

  const background = moodBackgrounds[currentMood];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentMood}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1 }}
        className="fixed inset-0 pointer-events-none"
        style={{
          background: background.gradient,
          filter: 'blur(8px)',
          transform: 'scale(1.1)',
          opacity: '0.2',
          zIndex: -1
        }}
      />
    </AnimatePresence>
  );
}
