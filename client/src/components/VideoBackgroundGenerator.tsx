import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type MusicMood, moodBackgrounds } from "@/lib/moodDetection";

interface VideoBackgroundGeneratorProps {
  mood: MusicMood;
  audioLevel: number;
}

export function VideoBackgroundGenerator({ mood, audioLevel }: VideoBackgroundGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [particles, setParticles] = useState<Array<{
    x: number;
    y: number;
    speed: number;
    size: number;
    angle: number;
  }>>([]);

  // Initialize particles based on mood
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to window size
    const updateSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    updateSize();
    window.addEventListener('resize', updateSize);

    // Create particles based on mood
    const particleCount = mood === 'energetic' ? 100 : 
                         mood === 'happy' ? 80 :
                         mood === 'romantic' ? 60 :
                         mood === 'mysterious' ? 40 :
                         mood === 'melancholic' ? 30 : 20;

    const newParticles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      speed: Math.random() * 2 + 1,
      size: Math.random() * 4 + 2,
      angle: Math.random() * Math.PI * 2
    }));

    setParticles(newParticles);

    return () => window.removeEventListener('resize', updateSize);
  }, [mood]);

  // Animation loop
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const background = moodBackgrounds[mood];
    let animationFrame: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Create gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      const colors = background.gradient.match(/rgba?\([^)]+\)|[^,]+/g) || [];
      colors.forEach((color, index) => {
        gradient.addColorStop(index / (colors.length - 1), color.trim());
      });
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      setParticles(prevParticles => 
        prevParticles.map(particle => {
          // Update position based on mood and audio level
          const newX = particle.x + Math.cos(particle.angle) * particle.speed * (1 + audioLevel);
          const newY = particle.y + Math.sin(particle.angle) * particle.speed * (1 + audioLevel);

          // Wrap around screen
          const x = newX < 0 ? canvas.width : newX > canvas.width ? 0 : newX;
          const y = newY < 0 ? canvas.height : newY > canvas.height ? 0 : newY;

          // Draw particle
          ctx.beginPath();
          ctx.arc(x, y, particle.size * (1 + audioLevel), 0, Math.PI * 2);
          ctx.fillStyle = `${background.overlay}`;
          ctx.fill();

          return {
            ...particle,
            x,
            y,
            angle: particle.angle + (audioLevel * 0.1)
          };
        })
      );

      animationFrame = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationFrame);
  }, [mood, audioLevel]);

  return (
    <AnimatePresence mode="wait">
      <motion.canvas
        ref={canvasRef}
        className="absolute inset-0 z-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1 }}
      />
    </AnimatePresence>
  );
}
