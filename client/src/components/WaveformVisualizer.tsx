import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";
import { analyzeMoodWithAI } from "@/lib/moodAnalysis";
import { type MusicMood } from "@/lib/moodDetection";

interface AudioFeatures {
  frequencies: Uint8Array;
  waveform: Uint8Array;
  volume: number;
}

export function WaveformVisualizer() {
  const { currentSong, isPlaying } = useMusicPlayer();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [audioFeatures, setAudioFeatures] = useState<AudioFeatures>({
    frequencies: new Uint8Array(),
    waveform: new Uint8Array(),
    volume: 0,
  });
  const [mood, setMood] = useState<MusicMood>("mysterious");
  const audioContextRef = useRef<AudioContext>();
  const analyserRef = useRef<AnalyserNode>();
  const sourceRef = useRef<MediaElementAudioSourceNode>();
  const animationFrameRef = useRef<number>();

  // Initialize audio context and analyzers
  useEffect(() => {
    if (!isPlaying || !currentSong) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setAudioFeatures(prev => ({ ...prev, volume: 0 }));
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
      analyserRef.current.fftSize = 2048; // For detailed waveform
    }

    // Connect audio to analyzer if not already connected
    if (!sourceRef.current) {
      sourceRef.current = audioContextRef.current.createMediaElementSource(audio);
      sourceRef.current.connect(analyserRef.current!);
      analyserRef.current!.connect(audioContextRef.current.destination);
    }

    function updateVisualization() {
      if (!analyserRef.current) return;

      const frequencyData = new Uint8Array(analyserRef.current.frequencyBinCount);
      const waveformData = new Uint8Array(analyserRef.current.frequencyBinCount);
      
      analyserRef.current.getByteFrequencyData(frequencyData);
      analyserRef.current.getByteTimeDomainData(waveformData);

      // Calculate average volume
      const volume = frequencyData.reduce((sum, value) => sum + value, 0) / frequencyData.length / 255;

      setAudioFeatures({
        frequencies: frequencyData,
        waveform: waveformData,
        volume,
      });

      animationFrameRef.current = requestAnimationFrame(updateVisualization);
    }

    updateVisualization();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, currentSong]);

  // Draw visualization on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const updateSize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw waveform
    const waveformPath = new Path2D();
    const step = Math.ceil(audioFeatures.waveform.length / canvas.width);
    const amplitude = canvas.height / 4;

    audioFeatures.waveform.forEach((value, i) => {
      if (i % step !== 0) return;
      const x = (i / step) * (canvas.width / window.devicePixelRatio);
      const y = (((value / 255) * 2) - 1) * amplitude + (canvas.height / (2 * window.devicePixelRatio));
      
      if (i === 0) {
        waveformPath.moveTo(x, y);
      } else {
        waveformPath.lineTo(x, y);
      }
    });

    // Style and stroke the path
    ctx.strokeStyle = `hsla(${(audioFeatures.volume * 360)}, 80%, 60%, 0.8)`;
    ctx.lineWidth = 2;
    ctx.stroke(waveformPath);

    return () => window.removeEventListener('resize', updateSize);
  }, [audioFeatures]);

  // Update mood with OpenAI when song changes
  useEffect(() => {
    if (!currentSong) return;

    async function updateMood() {
      try {
        // Get enhanced mood analysis from OpenAI
        const detectedMood = await analyzeMoodWithAI(currentSong);
        setMood(detectedMood);
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
