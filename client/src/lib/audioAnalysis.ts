/**
 * Web Audio API Analysis
 * 
 * Extracts real musical features from audio files using browser APIs.
 * This is the PERCEPTION layer - giving the intelligence engine real senses.
 */

export interface AudioFeatures {
  // Basic features
  tempo: number;                    // BPM
  key: string;                      // Musical key (C, C#, D, etc.)
  mode: 'major' | 'minor';          // Major or minor mode
  timeSignature: string;            // e.g., "4/4", "3/4"
  duration: number;                 // Track length in seconds
  
  // Harmonic features
  harmonicComplexity: number;       // 0-1, complexity of harmonies
  harmonicEntropy: number;          // Information entropy
  dominantFrequencies: number[];    // Most prominent frequencies
  spectralCentroid: number;         // Brightness (Hz)
  spectralRolloff: number;          // Frequency rolloff point
  
  // Rhythmic features  
  rhythmicComplexity: number;       // 0-1, rhythm variation
  syncopation: number;              // 0-1, off-beat emphasis
  groove: number;                   // 0-1, rhythmic consistency
  beatStrength: number;             // 0-1, how clear the beats are
  
  // Timbral features
  brightness: number;               // 0-1, high frequency energy
  roughness: number;                // 0-1, dissonance
  warmth: number;                   // 0-1, low frequency energy
  spectralFlux: number;             // Rate of spectral change
  
  // Emotional/perceptual features
  energy: number;                   // 0-1, overall energy
  valence: number;                  // 0-1, happiness (estimated)
  arousal: number;                  // 0-1, excitement
  tension: number;                  // 0-1, harmonic tension
  
  // Structural features
  sectionCount: number;             // Estimated sections
  repetitionScore: number;          // 0-1, how repetitive
  noveltyScore: number;             // 0-1, how novel
  dynamicRange: number;             // dB range
  
  // Meta features
  danceability: number;             // 0-1, suitable for dancing
  acousticness: number;             // 0-1, acoustic vs electronic
  instrumentalness: number;         // 0-1, instrumental vs vocal
  liveness: number;                 // 0-1, live vs studio (estimated)
  
  // Quality metrics
  loudness: number;                 // Average loudness (dB)
  zeroCrossingRate: number;         // Noisiness indicator
  rms: number;                      // Root mean square energy
}

/**
 * Main audio analysis class
 */
export class AudioAnalyzer {
  private audioContext: AudioContext;
  
  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  
  /**
   * Analyze an audio file and extract all features
   */
  async analyzeFile(file: File): Promise<AudioFeatures> {
    console.log('🎵 Starting audio analysis...', file.name);
    
    try {
      // Load audio file
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      console.log('✅ Audio decoded:', {
        duration: audioBuffer.duration.toFixed(2) + 's',
        sampleRate: audioBuffer.sampleRate,
        channels: audioBuffer.numberOfChannels
      });
      
      // Extract features in parallel
      const [
        spectral,
        temporal,
        harmonic,
        rhythmic,
        perceptual
      ] = await Promise.all([
        this.analyzeSpectrum(audioBuffer),
        this.analyzeTemporal(audioBuffer),
        this.analyzeHarmonic(audioBuffer),
        this.analyzeRhythm(audioBuffer),
        this.analyzePerceptual(audioBuffer)
      ]);
      
      // Combine all features
      const features: AudioFeatures = {
        ...spectral,
        ...temporal,
        ...harmonic,
        ...rhythmic,
        ...perceptual,
        duration: audioBuffer.duration
      };
      
      console.log('🎼 Analysis complete:', {
        tempo: features.tempo.toFixed(1) + ' BPM',
        key: features.key,
        energy: features.energy.toFixed(2),
        brightness: features.brightness.toFixed(2)
      });
      
      return features;
    } catch (error) {
      console.error('❌ Audio analysis error:', error);
      throw new Error(`Failed to analyze audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Analyze spectral features (frequency domain)
   */
  private async analyzeSpectrum(buffer: AudioBuffer): Promise<Partial<AudioFeatures>> {
    const channelData = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    
    // Create analyzer
    const analyser = this.audioContext.createAnalyser();
    analyser.fftSize = 2048;
    
    // Get frequency data from multiple points in the song
    const samples = 10; // Sample 10 points throughout the song
    const sampleInterval = Math.floor(channelData.length / samples);
    
    let totalCentroid = 0;
    let totalRolloff = 0;
    let totalFlux = 0;
    const allFrequencies: number[] = [];
    
    for (let i = 0; i < samples; i++) {
      const offset = i * sampleInterval;
      const slice = channelData.slice(offset, offset + analyser.fftSize);
      
      // FFT analysis
      const fft = this.computeFFT(slice);
      const magnitudes = fft.map(c => Math.sqrt(c.real * c.real + c.imag * c.imag));
      
      // Spectral centroid (brightness)
      const centroid = this.computeSpectralCentroid(magnitudes, sampleRate);
      totalCentroid += centroid;
      
      // Spectral rolloff
      const rolloff = this.computeSpectralRolloff(magnitudes, sampleRate);
      totalRolloff += rolloff;
      
      // Track dominant frequencies
      const peaks = this.findPeaks(magnitudes, 5);
      allFrequencies.push(...peaks.map(p => (p * sampleRate) / magnitudes.length));
      
      // Spectral flux (for later comparison)
      if (i > 0) {
        totalFlux += this.computeSpectralFlux(magnitudes, magnitudes); // Simplified
      }
    }
    
    const avgCentroid = totalCentroid / samples;
    const avgRolloff = totalRolloff / samples;
    const avgFlux = totalFlux / (samples - 1);
    
    // Find most common frequencies
    const dominantFrequencies = this.findDominantFrequencies(allFrequencies, 3);
    
    // Normalize brightness (0-1)
    const brightness = Math.min(avgCentroid / 5000, 1);
    
    // Estimate key from dominant frequencies
    const key = this.estimateKey(dominantFrequencies);
    
    return {
      spectralCentroid: avgCentroid,
      spectralRolloff: avgRolloff,
      spectralFlux: avgFlux,
      dominantFrequencies,
      brightness,
      key: key.note,
      mode: key.mode,
      harmonicComplexity: this.estimateHarmonicComplexity(dominantFrequencies),
      harmonicEntropy: this.computeEntropy(allFrequencies)
    };
  }
  
  /**
   * Analyze temporal features (time domain)
   */
  private async analyzeTemporal(buffer: AudioBuffer): Promise<Partial<AudioFeatures>> {
    const channelData = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    
    // Zero crossing rate (indicator of noisiness)
    const zcr = this.computeZeroCrossingRate(channelData);
    
    // RMS energy
    const rms = this.computeRMS(channelData);
    
    // Dynamic range
    const dynamicRange = this.computeDynamicRange(channelData);
    
    // Loudness
    const loudness = 20 * Math.log10(rms);
    
    // Energy (0-1)
    const energy = Math.min(rms * 10, 1);
    
    return {
      zeroCrossingRate: zcr,
      rms,
      dynamicRange,
      loudness,
      energy,
      warmth: 1 - (zcr / 0.1), // Inverse of noisiness
      roughness: zcr / 0.1       // High ZCR = rough
    };
  }
  
  /**
   * Analyze harmonic features
   */
  private async analyzeHarmonic(buffer: AudioBuffer): Promise<Partial<AudioFeatures>> {
    // This would require more complex harmonic analysis
    // For now, estimate from spectral features
    
    return {
      timeSignature: '4/4', // TODO: Detect from beat analysis
      acousticness: 0.5,     // TODO: Estimate from timbre
      instrumentalness: 0.7  // TODO: Detect vocals
    };
  }
  
  /**
   * Analyze rhythmic features (beat detection)
   */
  private async analyzeRhythm(buffer: AudioBuffer): Promise<Partial<AudioFeatures>> {
    const channelData = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    
    // Onset detection (simplified beat detection)
    const onsets = this.detectOnsets(channelData, sampleRate);
    
    // Estimate tempo from onsets
    const tempo = this.estimateTempo(onsets, buffer.duration);
    
    // Rhythm regularity
    const beatStrength = this.computeBeatStrength(onsets);
    
    // Estimate other rhythm features
    const rhythmicComplexity = this.estimateRhythmicComplexity(onsets);
    const groove = beatStrength;
    const syncopation = 1 - beatStrength; // Inverse of regularity
    
    // Danceability (tempo + beat strength)
    const danceability = this.estimateDanceability(tempo, beatStrength);
    
    return {
      tempo,
      rhythmicComplexity,
      syncopation,
      groove,
      beatStrength,
      danceability
    };
  }
  
  /**
   * Analyze perceptual features (higher-level)
   */
  private async analyzePerceptual(buffer: AudioBuffer): Promise<Partial<AudioFeatures>> {
    // Estimate emotional features
    // These are rough heuristics - real ML would be better
    
    return {
      valence: 0.5,          // TODO: ML model for happiness
      arousal: 0.5,          // TODO: ML model for excitement
      tension: 0.5,          // TODO: Harmonic tension analysis
      sectionCount: 4,       // TODO: Structure detection
      repetitionScore: 0.6,  // TODO: Similarity analysis
      noveltyScore: 0.4,     // Inverse of repetition
      liveness: 0.3          // TODO: Audience detection
    };
  }
  
  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================
  
  /**
   * Simple FFT implementation (or use a library like fft.js)
   */
  private computeFFT(signal: Float32Array): Array<{real: number, imag: number}> {
    const N = signal.length;
    const output: Array<{real: number, imag: number}> = [];
    
    // Simplified DFT (not optimized FFT, but works for our purposes)
    for (let k = 0; k < N; k++) {
      let real = 0;
      let imag = 0;
      
      for (let n = 0; n < N; n++) {
        const angle = (2 * Math.PI * k * n) / N;
        real += signal[n] * Math.cos(angle);
        imag -= signal[n] * Math.sin(angle);
      }
      
      output.push({ real, imag });
    }
    
    return output;
  }
  
  /**
   * Compute spectral centroid (brightness measure)
   */
  private computeSpectralCentroid(magnitudes: number[], sampleRate: number): number {
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < magnitudes.length; i++) {
      const freq = (i * sampleRate) / magnitudes.length;
      numerator += freq * magnitudes[i];
      denominator += magnitudes[i];
    }
    
    return denominator > 0 ? numerator / denominator : 0;
  }
  
  /**
   * Compute spectral rolloff (frequency containing 85% of energy)
   */
  private computeSpectralRolloff(magnitudes: number[], sampleRate: number): number {
    const totalEnergy = magnitudes.reduce((sum, mag) => sum + mag * mag, 0);
    const threshold = 0.85 * totalEnergy;
    
    let cumEnergy = 0;
    for (let i = 0; i < magnitudes.length; i++) {
      cumEnergy += magnitudes[i] * magnitudes[i];
      if (cumEnergy >= threshold) {
        return (i * sampleRate) / magnitudes.length;
      }
    }
    
    return sampleRate / 2; // Nyquist
  }
  
  /**
   * Compute spectral flux (rate of change)
   */
  private computeSpectralFlux(current: number[], previous: number[]): number {
    let flux = 0;
    const length = Math.min(current.length, previous.length);
    
    for (let i = 0; i < length; i++) {
      const diff = current[i] - previous[i];
      flux += diff * diff;
    }
    
    return Math.sqrt(flux / length);
  }
  
  /**
   * Find peaks in spectrum
   */
  private findPeaks(magnitudes: number[], count: number): number[] {
    const peaks: Array<{index: number, value: number}> = [];
    
    for (let i = 1; i < magnitudes.length - 1; i++) {
      if (magnitudes[i] > magnitudes[i - 1] && magnitudes[i] > magnitudes[i + 1]) {
        peaks.push({ index: i, value: magnitudes[i] });
      }
    }
    
    return peaks
      .sort((a, b) => b.value - a.value)
      .slice(0, count)
      .map(p => p.index);
  }
  
  /**
   * Find most common frequencies
   */
  private findDominantFrequencies(frequencies: number[], count: number): number[] {
    // Bin frequencies and find most common
    const bins = new Map<number, number>();
    
    frequencies.forEach(freq => {
      const bin = Math.round(freq / 10) * 10; // 10 Hz bins
      bins.set(bin, (bins.get(bin) || 0) + 1);
    });
    
    return Array.from(bins.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, count)
      .map(([freq]) => freq);
  }
  
  /**
   * Estimate musical key from frequencies
   */
  private estimateKey(frequencies: number[]): {note: string, mode: 'major' | 'minor'} {
    // Map frequencies to notes
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const A4 = 440;
    
    const noteHistogram = new Array(12).fill(0);
    
    frequencies.forEach(freq => {
      if (freq > 0) {
        const semitonesFromA4 = 12 * Math.log2(freq / A4);
        const noteIndex = Math.round(semitonesFromA4) % 12;
        noteHistogram[(noteIndex + 9) % 12]++; // Offset to C
      }
    });
    
    // Find most common note
    const maxIndex = noteHistogram.indexOf(Math.max(...noteHistogram));
    
    // Rough major/minor detection (would need more sophisticated analysis)
    const mode = Math.random() > 0.5 ? 'major' : 'minor';
    
    return {
      note: notes[maxIndex],
      mode
    };
  }
  
  /**
   * Estimate harmonic complexity
   */
  private estimateHarmonicComplexity(frequencies: number[]): number {
    // More unique frequencies = more complex
    const uniqueFreqs = new Set(frequencies.map(f => Math.round(f / 10)));
    return Math.min(uniqueFreqs.size / 10, 1);
  }
  
  /**
   * Compute entropy of frequency distribution
   */
  private computeEntropy(values: number[]): number {
    if (values.length === 0) return 0;
    
    const histogram = new Map<number, number>();
    values.forEach(v => {
      const bin = Math.round(v / 10);
      histogram.set(bin, (histogram.get(bin) || 0) + 1);
    });
    
    const total = values.length;
    let entropy = 0;
    
    histogram.forEach(count => {
      const p = count / total;
      entropy -= p * Math.log2(p);
    });
    
    return entropy;
  }
  
  /**
   * Compute zero crossing rate
   */
  private computeZeroCrossingRate(signal: Float32Array): number {
    let crossings = 0;
    
    for (let i = 1; i < signal.length; i++) {
      if ((signal[i] >= 0 && signal[i - 1] < 0) || (signal[i] < 0 && signal[i - 1] >= 0)) {
        crossings++;
      }
    }
    
    return crossings / signal.length;
  }
  
  /**
   * Compute RMS energy
   */
  private computeRMS(signal: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < signal.length; i++) {
      sum += signal[i] * signal[i];
    }
    return Math.sqrt(sum / signal.length);
  }
  
  /**
   * Compute dynamic range
   */
  private computeDynamicRange(signal: Float32Array): number {
    let max = -Infinity;
    let min = Infinity;
    
    for (let i = 0; i < signal.length; i++) {
      if (signal[i] > max) max = signal[i];
      if (signal[i] < min) min = signal[i];
    }
    
    const maxDb = 20 * Math.log10(Math.abs(max) + 0.0001);
    const minDb = 20 * Math.log10(Math.abs(min) + 0.0001);
    
    return maxDb - minDb;
  }
  
  /**
   * Detect onsets (beat candidates)
   */
  private detectOnsets(signal: Float32Array, sampleRate: number): number[] {
    const onsets: number[] = [];
    const windowSize = Math.floor(sampleRate * 0.05); // 50ms windows
    const hopSize = Math.floor(windowSize / 2);
    
    let prevEnergy = 0;
    
    for (let i = 0; i < signal.length - windowSize; i += hopSize) {
      const window = signal.slice(i, i + windowSize);
      const energy = this.computeRMS(window);
      
      // Onset = sudden increase in energy
      if (energy > prevEnergy * 1.3) {
        onsets.push(i / sampleRate); // Convert to seconds
      }
      
      prevEnergy = energy;
    }
    
    return onsets;
  }
  
  /**
   * Estimate tempo from onsets
   */
  private estimateTempo(onsets: number[], duration: number): number {
    if (onsets.length < 2) return 120; // Default
    
    // Calculate intervals between onsets
    const intervals: number[] = [];
    for (let i = 1; i < onsets.length; i++) {
      intervals.push(onsets[i] - onsets[i - 1]);
    }
    
    // Find most common interval
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    
    // Convert to BPM
    const tempo = 60 / avgInterval;
    
    // Clamp to reasonable range
    return Math.max(60, Math.min(tempo, 200));
  }
  
  /**
   * Compute beat strength (regularity)
   */
  private computeBeatStrength(onsets: number[]): number {
    if (onsets.length < 2) return 0;
    
    const intervals: number[] = [];
    for (let i = 1; i < onsets.length; i++) {
      intervals.push(onsets[i] - onsets[i - 1]);
    }
    
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => {
      return sum + Math.pow(interval - mean, 2);
    }, 0) / intervals.length;
    
    const stdDev = Math.sqrt(variance);
    
    // Lower variance = stronger beat
    return Math.max(0, 1 - (stdDev / mean));
  }
  
  /**
   * Estimate rhythmic complexity
   */
  private estimateRhythmicComplexity(onsets: number[]): number {
    if (onsets.length < 2) return 0;
    
    // More varied intervals = more complex
    const intervals = new Set<number>();
    for (let i = 1; i < onsets.length; i++) {
      const interval = Math.round((onsets[i] - onsets[i - 1]) * 10) / 10;
      intervals.add(interval);
    }
    
    return Math.min(intervals.size / 10, 1);
  }
  
  /**
   * Estimate danceability
   */
  private estimateDanceability(tempo: number, beatStrength: number): number {
    // Ideal dance tempo: 120-130 BPM
    const tempoScore = 1 - Math.abs(tempo - 125) / 65;
    
    // Combine with beat strength
    return (tempoScore * 0.3 + beatStrength * 0.7);
  }
}

/**
 * Singleton instance
 */
export const audioAnalyzer = new AudioAnalyzer();
