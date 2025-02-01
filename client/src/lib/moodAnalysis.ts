import OpenAI from "openai";
import { type Song } from "@/types/song";
import { type MusicMood, detectMood } from "./moodDetection";

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export async function analyzeMoodWithAI(song: Song): Promise<MusicMood> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a music mood analysis expert. Analyze the song title and artist to determine its mood. Respond with exactly one word from this list: energetic, calm, happy, melancholic, mysterious, romantic"
        },
        {
          role: "user",
          content: `Song Title: ${song.title}\nArtist: ${song.artist}\n\nWhat is the mood of this song?`
        }
      ],
      temperature: 0.3,
      max_tokens: 10,
    });

    const mood = response.choices[0].message.content?.toLowerCase().trim() as MusicMood;
    return mood;
  } catch (error) {
    console.error('Error analyzing mood with AI:', error);
    // Fall back to basic detection
    return detectMood(song);
  }
}