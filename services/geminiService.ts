import { GoogleGenAI } from "@google/genai";
import { Exercise } from '../types';
import { getExerciseEffectiveWeightKg, getExerciseVolumeKg, getMonday } from '../utils';

let aiClient: GoogleGenAI | null = null;

const getAiClient = () => {
  if (!aiClient) {
    const apiKey = process.env.API_KEY;
    console.log("[IronLog] Initializing Gemini. Key present:", !!apiKey);
    aiClient = new GoogleGenAI({ apiKey: apiKey || '' });
  }
  return aiClient;
};

const formatWeekLabel = (date: Date) =>
  `${date.toLocaleDateString()} - ${new Date(date.getTime() + 6 * 86400000).toLocaleDateString()}`;

const buildThreeWeekSummary = (exercises: Exercise[]) => {
  const groupedByWeek = new Map<string, Exercise[]>();

  exercises.forEach(ex => {
    const weekStart = getMonday(new Date(ex.date));
    const weekKey = weekStart.toISOString();
    const current = groupedByWeek.get(weekKey) || [];
    current.push(ex);
    groupedByWeek.set(weekKey, current);
  });

  return Array.from(groupedByWeek.entries())
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([weekKey, weekExercises]) => {
      const weekStart = new Date(weekKey);
      const totalSets = weekExercises.reduce((sum, ex) => sum + ex.sets, 0);
      const totalVolume = weekExercises.reduce((sum, ex) => sum + getExerciseVolumeKg(ex), 0);

      const movementSummary = weekExercises.reduce<Record<string, { sets: number; reps: number; topWeightKg: number }>>((acc, ex) => {
        const weightKg = Math.round(getExerciseEffectiveWeightKg(ex) * 10) / 10;
        if (!acc[ex.name]) {
          acc[ex.name] = { sets: 0, reps: 0, topWeightKg: 0 };
        }
        acc[ex.name].sets += ex.sets;
        acc[ex.name].reps += ex.sets * ex.reps;
        acc[ex.name].topWeightKg = Math.max(acc[ex.name].topWeightKg, weightKg);
        return acc;
      }, {});

      const movements = Object.entries(movementSummary)
        .sort((a, b) => b[1].sets - a[1].sets)
        .map(([name, data]) => `${name}: ${data.sets} sets, ${data.reps} reps, top ${data.topWeightKg}kg`)
        .join('; ');

      return `Week ${formatWeekLabel(weekStart)} | total sets ${totalSets} | total volume ${Math.round(totalVolume)}kg | movements: ${movements}`;
    })
    .join('\n');
};

export const generateWeeklyAnalysis = async (
  exercises: Exercise[],
  focusWeekStart: string,
  analysisStart: string,
  analysisEnd: string
): Promise<string> => {
  if (exercises.length === 0) {
    return "No workouts recorded in the last 3 weeks. 近三週沒有訓練紀錄，先從穩定安排本週訓練開始。";
  }

  const dataSummary = buildThreeWeekSummary(exercises);

  const prompt = `
    Role: Fitness coach for a strength training app.
    Focus week: ${focusWeekStart}
    Analysis range: ${analysisStart} to ${analysisEnd} (last 3 weeks, including the focus week).
    All weights are normalized as total kg load.

    Training data by week:
    ${dataSummary}

    Task:
    1. Analyze the recent 3-week trend, but keep the focus on the selected week.
    2. Point out 1-2 strengths based on consistency, volume, or exercise selection.
    3. Give 2 specific suggestions for the next week.
    4. If you notice repeated movement patterns or missing balance, mention them briefly.

    Constraints:
    - Output in Traditional Chinese (Taiwan).
    - Keep it under 220 words.
    - Tone should be motivating, concrete, and practical.
  `;

  try {
    const ai = getAiClient();
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

    if (error.message?.includes("API key") || error.status === 400 || error.status === 403) {
      return `Configuration Error: API Key issue. (Details: ${error.message || error.status})`;
    }

    return `AI Coach Error: ${error.message || "Unknown error"}. 請稍後再試。`;
  }
};
