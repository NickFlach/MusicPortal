import { type Song } from "@/types/song";

export type MusicMood = 
  | "energetic"
  | "calm"
  | "happy"
  | "melancholic"
  | "mysterious"
  | "romantic";

// Simple mapping of moods to background gradients and colors
export const moodBackgrounds: Record<MusicMood, {
  gradient: string;
  overlay: string;
  textColor: string;
}> = {
  energetic: {
    gradient: "linear-gradient(45deg, #FF4B2B, #FF416C)",
    overlay: "rgba(255, 75, 43, 0.1)",
    textColor: "text-orange-500"
  },
  calm: {
    gradient: "linear-gradient(45deg, #2193b0, #6dd5ed)",
    overlay: "rgba(33, 147, 176, 0.1)",
    textColor: "text-blue-400"
  },
  happy: {
    gradient: "linear-gradient(45deg, #FFD93D, #FF6B6B)",
    overlay: "rgba(255, 217, 61, 0.1)",
    textColor: "text-yellow-500"
  },
  melancholic: {
    gradient: "linear-gradient(45deg, #614385, #516395)",
    overlay: "rgba(97, 67, 133, 0.1)",
    textColor: "text-purple-500"
  },
  mysterious: {
    gradient: "linear-gradient(45deg, #232526, #414345)",
    overlay: "rgba(35, 37, 38, 0.1)",
    textColor: "text-gray-500"
  },
  romantic: {
    gradient: "linear-gradient(45deg, #FF758C, #FF7EB3)",
    overlay: "rgba(255, 117, 140, 0.1)",
    textColor: "text-pink-500"
  }
};

// Simple mood detection based on song title and artist
// This is a placeholder - in a real app, we'd use audio analysis
export function detectMood(song: Song): MusicMood {
  const text = `${song.title} ${song.artist}`.toLowerCase();
  
  if (text.match(/party|dance|beat|energy|power/)) {
    return "energetic";
  }
  if (text.match(/love|heart|romance|kiss/)) {
    return "romantic";
  }
  if (text.match(/happy|joy|fun|smile/)) {
    return "happy";
  }
  if (text.match(/sad|cry|tear|alone|lost/)) {
    return "melancholic";
  }
  if (text.match(/dream|sleep|peace|quiet|gentle/)) {
    return "calm";
  }
  
  return "mysterious"; // default mood
}
