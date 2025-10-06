import { useEffect, useRef } from "react";
import { useMusicPlayer } from "@/contexts/MusicPlayerContext";

export function WaveformVisualizer() {
  const { currentTrack, isPlaying } = useMusicPlayer();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext>();
  const analyserRef = useRef<AnalyserNode>();
  const sourceRef = useRef<MediaElementAudioSourceNode>();
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    if (!isPlaying || !currentTrack) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const audioElements = document.getElementsByTagName('audio');
    if (!audioElements.length) {
      console.log('No audio element found');
      return;
    }

    const audio = audioElements[0];
    console.log('Found audio element:', audio.src);

    const setup = async () => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext();
          console.log('Created new AudioContext');
        }

        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
          console.log('Resumed AudioContext');
        }

        if (!analyserRef.current) {
          analyserRef.current = audioContextRef.current.createAnalyser();
          analyserRef.current.fftSize = 128;
          analyserRef.current.smoothingTimeConstant = 0.8;
          console.log('Created new AnalyserNode');
        }

        if (sourceRef.current) {
          sourceRef.current.disconnect();
        }

        sourceRef.current = audioContextRef.current.createMediaElementSource(audio);
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
        console.log('Connected audio nodes');
      } catch (error) {
        console.error('Error setting up audio context:', error);
      }
    };

    setup();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
    };
  }, [isPlaying, currentTrack]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserRef.current) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      console.log('Canvas resized:', canvas.width, canvas.height);
    };

    resize();
    window.addEventListener('resize', resize);

    function draw() {
      if (!ctx || !analyserRef.current || !canvas) return;

      // Semi-transparent background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(dataArray);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      // Draw frequency bars
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;

        // Create gradient for each bar
        const gradient = ctx.createLinearGradient(x, canvas.height - barHeight, x, canvas.height);
        gradient.addColorStop(0, `hsla(${(i / bufferLength) * 360}, 100%, 70%, 0.8)`);
        gradient.addColorStop(1, `hsla(${(i / bufferLength) * 360}, 100%, 50%, 0.8)`);

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);

        x += barWidth;
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    }

    draw();
    console.log('Started animation frame');

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  if (!currentTrack) return null;

  return (
    <div className="relative w-full h-32 bg-transparent rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
}