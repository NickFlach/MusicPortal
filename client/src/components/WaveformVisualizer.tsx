import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";

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
  const audioContextRef = useRef<AudioContext>();
  const analyserRef = useRef<AnalyserNode>();
  const sourceRef = useRef<MediaElementAudioSourceNode>();
  const animationFrameRef = useRef<number>();
  const lastBeatTime = useRef(0);
  const energyHistory = useRef<number[]>([]);
  const fibonacciRef = useRef([0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144]);

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
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
          audioContextRef.current = new AudioContext();
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 2048;
          analyserRef.current.smoothingTimeConstant = 0.85;
        }

        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
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

    function createParticle(x: number, y: number, intensity: number): Particle {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 2 + 2) * intensity;
      const colorIndex = Math.floor(Math.random() * fibonacciRef.current.length);
      const hue = (fibonacciRef.current[colorIndex] * 20) % 360;

      return {
        x,
        y,
        size: Math.random() * 4 + 2,
        angle,
        speed,
        life: 1,
        color: `${hue}, 80%, 60%`,
        trail: [{ x, y }],
      };
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

      setAudioFeatures({
        frequencies: frequencyData,
        waveform: waveformData,
        volume,
        bassLevel,
        midLevel,
        trebleLevel,
        beatDetected,
      });

      if (beatDetected && canvasRef.current) {
        const canvas = canvasRef.current;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) * 0.3;
        const intensity = Math.max(bassLevel, volume);

        setParticles(prevParticles => {
          const newParticles = [...prevParticles];
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            newParticles.push(createParticle(x, y, intensity));
          }
          return newParticles.slice(-100);
        });
      }

      setParticles(prevParticles =>
        prevParticles
          .map(particle => {
            const newX = particle.x + Math.cos(particle.angle) * particle.speed;
            const newY = particle.y + Math.sin(particle.angle) * particle.speed;
            const trail = [...particle.trail, { x: newX, y: newY }];
            if (trail.length > 10) trail.shift();

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
  }, [isPlaying, currentSong]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) * 0.4;

    // Draw frequency visualization
    ctx.save();
    ctx.translate(centerX, centerY);

    const barCount = 180;
    const barWidth = (Math.PI * 2) / barCount;

    for (let i = 0; i < barCount; i++) {
      const amplitude = audioFeatures.frequencies[i] || 0;
      const barHeight = (amplitude / 255) * radius * 0.5;
      const hueIndex = Math.floor((i / barCount) * fibonacciRef.current.length);
      const hue = (fibonacciRef.current[hueIndex] * 20) % 360;

      ctx.rotate(barWidth);
      ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${0.6 + audioFeatures.volume * 0.4})`;
      ctx.fillRect(0, radius * 0.8, 2, barHeight);
    }

    ctx.restore();

    // Draw particles
    particles.forEach(particle => {
      if (particle.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(particle.trail[0].x, particle.trail[0].y);

        for (let i = 1; i < particle.trail.length; i++) {
          ctx.lineTo(particle.trail[i].x, particle.trail[i].y);
        }

        ctx.strokeStyle = `hsla(${particle.color}, ${particle.life * 50}%)`;
        ctx.lineWidth = particle.size * particle.life;
        ctx.stroke();
      }

      ctx.fillStyle = `hsla(${particle.color}, ${particle.life * 100}%)`;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // Beat flash effect
    if (audioFeatures.beatDetected) {
      ctx.fillStyle = `rgba(255, 255, 255, ${audioFeatures.volume * 0.2})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const drawFrame = () => {
      requestAnimationFrame(drawFrame);
    };
    drawFrame();

  }, [audioFeatures, particles]);

  if (!currentSong) return null;

  return (
    <div className="relative w-full h-32">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full bg-black"
      />
      <div className="absolute inset-0 flex items-end justify-center gap-0.5">
        {Array.from({ length: 32 }).map((_, i) => {
          const frequency = audioFeatures.frequencies[i * 8] || 0;
          const hueIndex = Math.floor((i / 32) * fibonacciRef.current.length);
          const hue = (fibonacciRef.current[hueIndex] * 20) % 360;

          return (
            <motion.div
              key={i}
              className="w-2 backdrop-blur-sm rounded-t"
              style={{
                backgroundColor: `hsla(${hue}, 80%, 60%, 0.3)`,
              }}
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