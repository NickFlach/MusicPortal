import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { analyzeMoodWithAI } from "@/lib/moodAnalysis";
import { type MusicMood } from "@/lib/moodDetection";

interface AudioFeatures {
  frequencies: Uint8Array;
  waveform: Uint8Array;
  volume: number;
  bassLevel: number;
  midLevel: number;
  trebleLevel: number;
  beatDetected: boolean;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  angle: number;
  speed: number;
  life: number;
  color: string;
  trail: { x: number; y: number }[];
}

export function WaveformVisualizer() {
  const { currentSong, isPlaying } = useMusicPlayer();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [audioFeatures, setAudioFeatures] = useState<AudioFeatures>({
    frequencies: new Uint8Array(),
    waveform: new Uint8Array(),
    volume: 0,
    bassLevel: 0,
    midLevel: 0,
    trebleLevel: 0,
    beatDetected: false,
  });
  const [particles, setParticles] = useState<Particle[]>([]);
  const [mood, setMood] = useState<MusicMood>("mysterious");
  const audioContextRef = useRef<AudioContext>();
  const analyserRef = useRef<AnalyserNode>();
  const sourceRef = useRef<MediaElementAudioSourceNode>();
  const animationFrameRef = useRef<number>();
  const lastBeatTime = useRef(0);
  const energyHistory = useRef<number[]>([]);

  function generateRandomColor(): string {
    const hue = Math.random() * 360;
    return `hsl(${hue}, 80%, 60%)`;
  }

  function createParticle(x: number, y: number, intensity: number): Particle {
    const angle = Math.random() * Math.PI * 2;
    const speed = (Math.random() * 2 + 2) * intensity;
    return {
      x,
      y,
      size: Math.random() * 4 + 2,
      angle,
      speed,
      life: 1,
      color: generateRandomColor(),
      trail: [{x, y}], // Initialize trail with starting position
    };
  }

  // Initialize audio context and analyzers
  useEffect(() => {
    if (!isPlaying || !currentSong) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setAudioFeatures(prev => ({
        ...prev,
        volume: 0,
        bassLevel: 0,
        midLevel: 0,
        trebleLevel: 0,
        beatDetected: false
      }));
      return;
    }

    const audioElements = document.getElementsByTagName('audio');
    if (!audioElements.length) return;
    const audio = audioElements[0];

    async function setupAudioContext() {
      try {
        if (audioContextRef.current?.state === 'closed') {
          audioContextRef.current = undefined;
          analyserRef.current = undefined;
          sourceRef.current = undefined;
        }

        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext();
        }

        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }

        if (!analyserRef.current) {
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 4096;
          analyserRef.current.smoothingTimeConstant = 0.85;
        }

        if (sourceRef.current) {
          sourceRef.current.disconnect();
        }

        sourceRef.current = audioContextRef.current.createMediaElementSource(audio);
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
      } catch (error) {
        console.error('Error setting up audio context:', error);
      }
    }

    setupAudioContext();

    function detectBeat(frequencyData: Uint8Array): boolean {
      const bassSum = frequencyData.slice(0, 10).reduce((sum, value) => sum + value, 0);
      const currentEnergy = bassSum / 2550;
      energyHistory.current.push(currentEnergy);

      if (energyHistory.current.length > 30) {
        energyHistory.current.shift();
      }

      const averageEnergy = energyHistory.current.reduce((sum, e) => sum + e, 0) / energyHistory.current.length;
      const now = Date.now();

      if (currentEnergy > averageEnergy * 1.5 && now - lastBeatTime.current > 250) {
        lastBeatTime.current = now;
        return true;
      }
      return false;
    }

    function updateVisualization() {
      if (!analyserRef.current) return;

      const frequencyData = new Uint8Array(analyserRef.current.frequencyBinCount);
      const waveformData = new Uint8Array(analyserRef.current.frequencyBinCount);

      analyserRef.current.getByteFrequencyData(frequencyData);
      analyserRef.current.getByteTimeDomainData(waveformData);

      const bassFreqs = frequencyData.slice(0, 60);
      const midFreqs = frequencyData.slice(60, 500);
      const trebleFreqs = frequencyData.slice(500);

      const bassLevel = bassFreqs.reduce((sum, value) => sum + value, 0) / bassFreqs.length / 255;
      const midLevel = midFreqs.reduce((sum, value) => sum + value, 0) / midFreqs.length / 255;
      const trebleLevel = trebleFreqs.reduce((sum, value) => sum + value, 0) / trebleFreqs.length / 255;

      const volume = frequencyData.reduce((sum, value) => sum + value, 0) / frequencyData.length / 255;
      const beatDetected = detectBeat(frequencyData);

      // Generate particles on beat with intensity
      if (beatDetected && canvasRef.current) {
        const canvas = canvasRef.current;
        const newParticles = [...particles];
        const intensity = Math.max(bassLevel, volume);

        // Create particles in a circle around the center
        const centerX = canvas.width / (2 * window.devicePixelRatio);
        const centerY = canvas.height / (2 * window.devicePixelRatio);
        const radius = Math.min(centerX, centerY) * 0.3;

        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          newParticles.push(createParticle(x, y, intensity));
        }

        setParticles(newParticles.slice(-100)); // Keep max 100 particles
      }

      setAudioFeatures({
        frequencies: frequencyData,
        waveform: waveformData,
        volume,
        bassLevel,
        midLevel,
        trebleLevel,
        beatDetected,
      });

      animationFrameRef.current = requestAnimationFrame(updateVisualization);
    }

    updateVisualization();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
    };
  }, [isPlaying, currentSong, particles]);

  // Draw visualization on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size with higher resolution
    const updateSize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    // Create gradient based on frequency levels
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, `hsla(${audioFeatures.bassLevel * 360}, 80%, 60%, ${0.6 + audioFeatures.bassLevel * 0.4})`);
    gradient.addColorStop(0.5, `hsla(${audioFeatures.midLevel * 360}, 80%, 60%, ${0.6 + audioFeatures.midLevel * 0.4})`);
    gradient.addColorStop(1, `hsla(${audioFeatures.trebleLevel * 360}, 80%, 60%, ${0.6 + audioFeatures.trebleLevel * 0.4})`);

    // Set up for particle trails
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; // Fade effect for trails
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'lighter'; // Additive blending for particles

    // Draw frequency visualization
    const centerX = canvas.width / (2 * window.devicePixelRatio);
    const centerY = canvas.height / (2 * window.devicePixelRatio);
    const radius = Math.min(centerX, centerY) * 0.4;

    ctx.save();
    ctx.translate(centerX, centerY);

    // Draw frequency bars in a circle
    const barCount = 180;
    const barWidth = (Math.PI * 2) / barCount;

    for (let i = 0; i < barCount; i++) {
      const amplitude = audioFeatures.frequencies[i] || 0;
      const barHeight = (amplitude / 255) * radius * 0.5;

      ctx.rotate(barWidth);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, radius * 0.8, 2, barHeight);
    }

    ctx.restore();

    // Update and draw particles with trails
    setParticles(prevParticles => 
      prevParticles
        .map(particle => {
          // Update position
          const newX = particle.x + Math.cos(particle.angle) * particle.speed;
          const newY = particle.y + Math.sin(particle.angle) * particle.speed;

          // Update trail
          const trail = [...particle.trail, { x: newX, y: newY }];
          if (trail.length > 10) trail.shift(); // Keep trail length manageable

          return {
            ...particle,
            x: newX,
            y: newY,
            life: particle.life - 0.01,
            trail,
          };
        })
        .filter(particle => particle.life > 0)
    );

    // Draw particle trails and particles
    particles.forEach(particle => {
      // Draw trail
      if (particle.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(particle.trail[0].x, particle.trail[0].y);

        particle.trail.forEach((point, index) => {
          if (index > 0) {
            ctx.lineTo(point.x, point.y);
          }
        });

        ctx.strokeStyle = `hsla(${particle.color}, ${particle.life * 50}%)`;
        ctx.lineWidth = particle.size * particle.life;
        ctx.stroke();
      }

      // Draw particle
      const glow = ctx.createRadialGradient(
        particle.x, particle.y, 0,
        particle.x, particle.y, particle.size * 2
      );
      glow.addColorStop(0, `hsla(${particle.color}, ${particle.life * 100}%)`);
      glow.addColorStop(1, 'transparent');

      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Add beat flash effect
    if (audioFeatures.beatDetected) {
      ctx.fillStyle = `rgba(255, 255, 255, ${audioFeatures.volume * 0.2})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    return () => window.removeEventListener('resize', updateSize);
  }, [audioFeatures, particles]);

  // Update mood with OpenAI when song changes
  useEffect(() => {
    if (!currentSong) return;

    async function updateMood() {
      try {
        const songInput = {
          title: currentSong.title,
          artist: currentSong.artist,
          ipfsHash: currentSong.ipfsHash,
        };
        const detectedMood = await analyzeMoodWithAI(songInput);
        if (detectedMood) {
          setMood(detectedMood);
        }
      } catch (error) {
        console.error('Error analyzing mood:', error);
      }
    }

    updateMood();
  }, [currentSong]);

  if (!currentSong) return null;

  return (
    <div className="relative w-full h-32">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ imageRendering: 'pixelated' }}
      />

      {/* Frequency bars overlay */}
      <div className="absolute inset-0 flex items-end justify-center gap-0.5">
        {Array.from({ length: 32 }).map((_, i) => {
          const frequency = audioFeatures.frequencies[i * 8] || 0;
          return (
            <motion.div
              key={i}
              className="w-2 bg-primary/30 backdrop-blur-sm rounded-t"
              animate={{
                height: `${(frequency / 255) * 100}%`,
                opacity: frequency > 128 ? 1 : 0.5,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            />
          );
        })}
      </div>
    </div>
  );
}