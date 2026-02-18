import { GoogleGenAI } from "@google/genai";
import { Exercise } from '../types';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateWeeklyAnalysis = async (exercises: Exercise[], weekStart: string): Promise<string> => {
  if (exercises.length === 0) {
    return "No workouts recorded this week. Let's crush it next week! 本週無訓練紀錄，下週繼續加油！";
  }

  // Format data for the model
  const dataSummary = exercises.map(ex => 
    `- ${new Date(ex.date).toLocaleDateString('en-US', { weekday: 'short' })}: ${ex.name} (${ex.sets} sets x ${ex.reps} reps @ ${ex.weight}kg)`
  ).join('\n');

  const prompt = `
    You are an elite fitness coach. Analyze the following workout log for the week starting ${weekStart}.
    
    Workout Data:
    ${dataSummary}
    
    Task:
    1. Summarize the volume and consistency.
    2. Point out 1 strength (e.g., consistency, progressive overload).
    3. Give 1 piece of actionable advice for next week.
    
    IMPORTANT: Please output the response primarily in Traditional Chinese (Taiwan), using English terms for specific exercises or metrics where appropriate for clarity.
    Keep the tone motivational, professional, and concise (under 150 words). Use emojis sparingly but effectively.
    Output plain text only.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Could not generate analysis at this time. 暫時無法生成分析。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "An error occurred while connecting to your AI Coach. Please try again later. 連接 AI 教練時發生錯誤，請稍後再試。";
  }
};