import { GoogleGenAI } from "@google/genai";
import { Exercise } from '../types';

let aiClient: GoogleGenAI | null = null;

const getAiClient = () => {
  if (!aiClient) {
    let apiKey = '';
    try {
      // Robust check for environment variable
      if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
        apiKey = process.env.API_KEY;
      }
    } catch (e) {
      console.warn("Error accessing environment variables:", e);
    }
    
    // Explicit warning for debugging
    if (!apiKey) {
      console.error("IRONLOG ERROR: API_KEY is missing from process.env. AI features will fail.");
    }

    aiClient = new GoogleGenAI({ apiKey: apiKey });
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
    console.error("Gemini API Error Details:", {
        message: error.message,
        status: error.status, // Often contains 400/401/403/500
        details: error.response // Sometimes contains more info
    });
    
    if (error.message?.includes("API key")) {
        return "Configuration Error: API Key is invalid or missing. 請檢查 API Key 設定。";
    }

    return "AI Coach is currently unavailable (Network/API Error). 請稍後再試。";
  }
};