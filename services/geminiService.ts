import { GoogleGenAI } from "@google/genai";
import { Exercise } from '../types';

let aiClient: GoogleGenAI | null = null;

const getAiClient = () => {
  if (!aiClient) {
    // Directly accessing process.env.API_KEY as per standard and to ensure bundlers replace it correctly.
    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
      console.error("IRONLOG ERROR: process.env.API_KEY is undefined. AI features will fail.");
    }
    
    // We initialize it anyway; the SDK will throw if key is invalid, which we catch later.
    aiClient = new GoogleGenAI({ apiKey: apiKey || '' });
  }
  return aiClient;
};

export const generateWeeklyAnalysis = async (exercises: Exercise[], weekStart: string): Promise<string> => {
  if (exercises.length === 0) {
    return "No workouts recorded this week. Let's crush it next week! 本週無訓練紀錄，下週繼續加油！";
  }

  // Optimize token usage by summarizing data more compactly
  const dataSummary = exercises.map(ex => 
    `${ex.name}: ${ex.sets}x${ex.reps}@${ex.weight}kg`
  ).join(', ');

  const prompt = `
    Role: Fitness Coach.
    Context: Weekly workout log starting ${weekStart}.
    Data: ${dataSummary}
    
    Task:
    1. Briefly analyze volume/consistency.
    2. One compliment (Strength).
    3. One improvement tip.
    
    Constraint: Output in Traditional Chinese (Taiwan). Keep it under 150 words. Be motivating.
  `;

  try {
    const ai = getAiClient();
    
    // Using the specifically requested model
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    
    if (!response || !response.text) {
        throw new Error("Empty response from Gemini API");
    }

    return response.text;
  } catch (error: any) {
    // Enhanced error logging for developer debugging
    console.error("Gemini API Error:", error);
    
    // Common error handling
    if (error.message?.includes("API key") || error.status === 400 || error.status === 403) {
        return "Configuration Error: API Key is invalid or missing. 請檢查您的 API Key 設定 (process.env.API_KEY)。";
    }

    return "AI Coach is currently unavailable. 請稍後再試。";
  }
};