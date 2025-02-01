import { type Song } from "@/types/song";

export type MusicMood = 
  | "energetic"
  | "calm"
  | "happy"
  | "melancholic"
  | "mysterious"
  | "romantic";

// Enhanced mood backgrounds with stronger colors and proper gradient syntax
export const moodBackgrounds: Record<MusicMood, {
  gradient: string;
  overlay: string;
  textColor: string;
}> = {
  energetic: {
    gradient: "linear-gradient(135deg, #FF4B2B 0%, #FF416C 100%)",
    overlay: "rgba(255, 75, 43, 0.3)",
    textColor: "text-orange-500"
  },
  calm: {
    gradient: "linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)",
    overlay: "rgba(33, 147, 176, 0.3)",
    textColor: "text-blue-400"
  },
  happy: {
    gradient: "linear-gradient(135deg, #FFD93D 0%, #FF6B6B 100%)",
    overlay: "rgba(255, 217, 61, 0.3)",
    textColor: "text-yellow-500"
  },
  melancholic: {
    gradient: "linear-gradient(135deg, #614385 0%, #516395 100%)",
    overlay: "rgba(97, 67, 133, 0.3)",
    textColor: "text-purple-500"
  },
  mysterious: {
    gradient: "linear-gradient(135deg, #232526 0%, #414345 100%)",
    overlay: "rgba(35, 37, 38, 0.3)",
    textColor: "text-gray-500"
  },
  romantic: {
    gradient: "linear-gradient(135deg, #FF758C 0%, #FF7EB3 100%)",
    overlay: "rgba(255, 117, 140, 0.3)",
    textColor: "text-pink-500"
  }
};

// Enhanced mood detection based on song title and artist
export function detectMood(song: Song): MusicMood {
  const text = `${song.title} ${song.artist}`.toLowerCase();

  if (text.match(/party|dance|beat|energy|power|rock|electronic/)) {
    return "energetic";
  }
  if (text.match(/love|heart|romance|kiss|sweet/)) {
    return "romantic";
  }
  if (text.match(/happy|joy|fun|smile|sunny|bright/)) {
    return "happy";
  }
  if (text.match(/sad|cry|tear|alone|lost|blue/)) {
    return "melancholic";
  }
  if (text.match(/dream|sleep|peace|quiet|gentle|ambient/)) {
    return "calm";
  }

  return "mysterious"; // default mood
}