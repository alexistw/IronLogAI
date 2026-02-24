import { GoogleGenAI } from "@google/genai";
import { Exercise } from '../types';
import { getExerciseEffectiveWeightKg } from '../utils';

let aiClient: GoogleGenAI | null = null;

const getAiClient = () => {
  if (!aiClient) {
    // Strictly follow instructions: access process.env.API_KEY directly.
    // If the environment is not set up correctly (e.g. Vite without define), this might be undefined.
    const apiKey = process.env.API_KEY;
    
    // Debug log to help users verify if their environment variable is being read
    console.log("[IronLog] Initializing Gemini. Key present:", !!apiKey);
    
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
    `${ex.name}: ${ex.sets}x${ex.reps}@${ex.weight}${ex.weightUnit}(${ex.weightMode === 'single_hand' ? 'single-hand' : 'double-hand'}), effective~${getExerciseEffectiveWeightKg(ex).toFixed(1)}kg`
  ).join(', ');

  const prompt = `
    Role: Fitness Coach.
    Context: Weekly workout log starting ${weekStart}.
    Data: ${dataSummary}
    Note: "single-hand" means the logged weight is per hand and effective load is converted as both hands combined.
    
    Task:
    1. Briefly analyze volume/consistency.
    2. Up to two compliment (Strength).
    3. Max two improvement tips.
    
    Constraint: Output in Traditional Chinese (Taiwan). Keep it under 200 words. Be motivating.
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
    console.error("Gemini API Error:", error);
    
    // Provide specific error feedback
    if (error.message?.includes("API key") || error.status === 400 || error.status === 403) {
        return `Configuration Error: API Key issue. (Details: ${error.message || error.status})`;
    }

    return `AI Coach Error: ${error.message || "Unknown error"}. 請稍後再試。`;
  }
};
