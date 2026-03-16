import { GoogleGenAI } from "@google/genai";
import { Exercise, UserProfile } from '../types';
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

type MovementWeekStats = {
  sets: number;
  reps: number;
  topWeightKg: number;
  volumeKg: number;
  weightToReps: Map<string, number>;
};

type WeekStats = {
  weekKey: string;
  weekStart: Date;
  totalSets: number;
  totalVolume: number;
  movementSummary: Record<string, MovementWeekStats>;
};

const roundOne = (value: number) => Math.round(value * 10) / 10;
const LB_TO_KG = 0.45359237;
const INCH_TO_CM = 2.54;

const getProfileHeightText = (profile: UserProfile) => {
  if (profile.heightUnit === 'ft_in') {
    const ft = profile.heightFt ?? 0;
    const inches = profile.heightIn ?? 0;
    if (ft <= 0 && inches <= 0) return '- Height: not provided';
    const cm = roundOne((ft * 12 + inches) * INCH_TO_CM);
    return `- Height: ${ft} ft ${inches} in (~${cm} cm)`;
  }

  if (!profile.heightCm) return '- Height: not provided';
  return `- Height: ${profile.heightCm} cm`;
};

const getProfileWeightText = (profile: UserProfile) => {
  if (!profile.weightValue) return '- Weight: not provided';
  if (profile.weightUnit === 'lb') {
    const kg = roundOne(profile.weightValue * LB_TO_KG);
    return `- Weight: ${profile.weightValue} lb (~${kg} kg)`;
  }
  return `- Weight: ${profile.weightValue} kg`;
};

const buildWeekStats = (weekKey: string, weekExercises: Exercise[]): WeekStats => {
  const weekStart = new Date(weekKey);
  const totalSets = weekExercises.reduce((sum, ex) => sum + ex.sets, 0);
  const totalVolume = weekExercises.reduce((sum, ex) => sum + getExerciseVolumeKg(ex), 0);

  const movementSummary = weekExercises.reduce<Record<string, MovementWeekStats>>((acc, ex) => {
    const weightKg = roundOne(getExerciseEffectiveWeightKg(ex));
    const volumeKg = getExerciseVolumeKg(ex);
    const totalReps = ex.sets * ex.reps;
    const weightKey = String(weightKg);

    if (!acc[ex.name]) {
      acc[ex.name] = {
        sets: 0,
        reps: 0,
        topWeightKg: 0,
        volumeKg: 0,
        weightToReps: new Map<string, number>(),
      };
    }

    acc[ex.name].sets += ex.sets;
    acc[ex.name].reps += totalReps;
    acc[ex.name].topWeightKg = Math.max(acc[ex.name].topWeightKg, weightKg);
    acc[ex.name].volumeKg += volumeKg;
    acc[ex.name].weightToReps.set(weightKey, (acc[ex.name].weightToReps.get(weightKey) || 0) + totalReps);
    return acc;
  }, {});

  return {
    weekKey,
    weekStart,
    totalSets,
    totalVolume,
    movementSummary,
  };
};

const groupExercisesByWeek = (exercises: Exercise[]) => {
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
    .map(([weekKey, weekExercises]) => buildWeekStats(weekKey, weekExercises));
};

const buildWeeklySummaryLines = (weeks: WeekStats[]) =>
  weeks
    .map(week => {
      const movements = Object.entries(week.movementSummary)
        .sort((a, b) => b[1].sets - a[1].sets)
        .map(([name, data]) =>
          `${name}: ${data.sets} sets, ${data.reps} reps, top ${roundOne(data.topWeightKg)}kg, volume ${Math.round(data.volumeKg)}kg`
        )
        .join('; ');

      return `Week ${formatWeekLabel(week.weekStart)} | total sets ${week.totalSets} | total volume ${Math.round(week.totalVolume)}kg | movements: ${movements}`;
    })
    .join('\n');

const buildShortTermMovementInsights = (weeks: WeekStats[]) => {
  const splitIndex = Math.max(1, Math.floor(weeks.length / 2));
  const firstHalf = weeks.slice(0, splitIndex);
  const secondHalf = weeks.slice(splitIndex);
  const movementNames = Array.from(new Set(weeks.flatMap(week => Object.keys(week.movementSummary))));

  return movementNames
    .map(name => {
      const allStats = weeks
        .map(week => week.movementSummary[name])
        .filter((item): item is MovementWeekStats => !!item);
      const firstHalfStats = firstHalf
        .map(week => week.movementSummary[name])
        .filter((item): item is MovementWeekStats => !!item);
      const secondHalfStats = secondHalf
        .map(week => week.movementSummary[name])
        .filter((item): item is MovementWeekStats => !!item);

      const totalSets = allStats.reduce((sum, item) => sum + item.sets, 0);
      const totalVolume = allStats.reduce((sum, item) => sum + item.volumeKg, 0);
      const firstTopWeight = firstHalfStats.reduce((max, item) => Math.max(max, item.topWeightKg), 0);
      const secondTopWeight = secondHalfStats.reduce((max, item) => Math.max(max, item.topWeightKg), 0);
      const firstVolume = firstHalfStats.reduce((sum, item) => sum + item.volumeKg, 0);
      const secondVolume = secondHalfStats.reduce((sum, item) => sum + item.volumeKg, 0);

      const firstWeightReps = new Map<string, number>();
      firstHalfStats.forEach(item => item.weightToReps.forEach((reps, weight) => {
        firstWeightReps.set(weight, (firstWeightReps.get(weight) || 0) + reps);
      }));

      const secondWeightReps = new Map<string, number>();
      secondHalfStats.forEach(item => item.weightToReps.forEach((reps, weight) => {
        secondWeightReps.set(weight, (secondWeightReps.get(weight) || 0) + reps);
      }));

      const commonWeights = Array.from(firstWeightReps.keys())
        .filter(weight => secondWeightReps.has(weight))
        .sort((a, b) => Number(b) - Number(a));

      const sameWeightRepNote = commonWeights.length > 0
        ? `${commonWeights[0]}kg reps ${firstWeightReps.get(commonWeights[0])} -> ${secondWeightReps.get(commonWeights[0])}`
        : 'no same-load comparison';

      return {
        totalSets,
        totalVolume,
        line: `${name} | 4-week volume ${Math.round(totalVolume)}kg | top weight ${roundOne(firstTopWeight)} -> ${roundOne(secondTopWeight)}kg | volume ${Math.round(firstVolume)} -> ${Math.round(secondVolume)}kg | ${sameWeightRepNote}`,
      };
    })
    .sort((a, b) => b.totalVolume - a.totalVolume || b.totalSets - a.totalSets)
    .slice(0, 8)
    .map(item => item.line)
    .join('\n');
};

const buildLongTermMovementInsights = (weeks: WeekStats[]) => {
  const earlyBlock = weeks.slice(0, 4);
  const lateBlock = weeks.slice(-4);
  const movementNames = Array.from(new Set(weeks.flatMap(week => Object.keys(week.movementSummary))));

  return movementNames
    .map(name => {
      const allStats = weeks
        .map(week => week.movementSummary[name])
        .filter((item): item is MovementWeekStats => !!item);
      const earlyStats = earlyBlock
        .map(week => week.movementSummary[name])
        .filter((item): item is MovementWeekStats => !!item);
      const lateStats = lateBlock
        .map(week => week.movementSummary[name])
        .filter((item): item is MovementWeekStats => !!item);

      const totalSets = allStats.reduce((sum, item) => sum + item.sets, 0);
      const totalVolume = allStats.reduce((sum, item) => sum + item.volumeKg, 0);
      const earlyTopWeight = earlyStats.reduce((max, item) => Math.max(max, item.topWeightKg), 0);
      const lateTopWeight = lateStats.reduce((max, item) => Math.max(max, item.topWeightKg), 0);
      const earlyVolume = earlyStats.reduce((sum, item) => sum + item.volumeKg, 0);
      const lateVolume = lateStats.reduce((sum, item) => sum + item.volumeKg, 0);

      return {
        totalSets,
        totalVolume,
        line: `${name} | 12-week active ${allStats.length}/${weeks.length} weeks | top weight ${roundOne(earlyTopWeight)} -> ${roundOne(lateTopWeight)}kg | early 4-week volume ${Math.round(earlyVolume)}kg | late 4-week volume ${Math.round(lateVolume)}kg`,
      };
    })
    .sort((a, b) => b.totalVolume - a.totalVolume || b.totalSets - a.totalSets)
    .slice(0, 8)
    .map(item => item.line)
    .join('\n');
};

const buildAnalysisSummary = (exercises: Exercise[]) => {
  const allWeeks = groupExercisesByWeek(exercises);
  const recentFourWeeks = allWeeks.slice(-4);
  const hasTwelveWeeks = allWeeks.length >= 12;

  return {
    hasTwelveWeeks,
    recentFourWeekSummary: buildWeeklySummaryLines(recentFourWeeks),
    recentFourWeekTotals: recentFourWeeks
      .map(week => `${formatWeekLabel(week.weekStart)}: sets ${week.totalSets}, volume ${Math.round(week.totalVolume)}kg`)
      .join(' | '),
    recentFourWeekMovementInsights: buildShortTermMovementInsights(recentFourWeeks),
    twelveWeekSummary: hasTwelveWeeks ? buildWeeklySummaryLines(allWeeks) : '',
    twelveWeekTotals: hasTwelveWeeks
      ? allWeeks.map(week => `${formatWeekLabel(week.weekStart)}: ${Math.round(week.totalVolume)}kg`).join(' | ')
      : '',
    twelveWeekMovementInsights: hasTwelveWeeks ? buildLongTermMovementInsights(allWeeks) : '',
  };
};

export const generateWeeklyAnalysis = async (
  exercises: Exercise[],
  focusWeekStart: string,
  analysisStart: string,
  analysisEnd: string,
  userProfile: UserProfile
): Promise<string> => {
  if (exercises.length === 0) {
    return "No workouts recorded in the selected analysis window.";
  }

  const {
    hasTwelveWeeks,
    recentFourWeekSummary,
    recentFourWeekTotals,
    recentFourWeekMovementInsights,
    twelveWeekSummary,
    twelveWeekTotals,
    twelveWeekMovementInsights,
  } = buildAnalysisSummary(exercises);

  const bodyInfo = [getProfileHeightText(userProfile), getProfileWeightText(userProfile)].join('\n');

  const prompt = `
You are a strength training coach for a workout log app.
Focus week: ${focusWeekStart}
Analysis range: ${analysisStart} to ${analysisEnd}
All loads are normalized to total kg.

User body metrics (current):
${bodyInfo}

Recent 4-week weekly data:
${recentFourWeekSummary}

Recent 4-week total trend:
${recentFourWeekTotals}

Recent 4-week movement trend:
${recentFourWeekMovementInsights}

${hasTwelveWeeks ? `Recent 12-week weekly data:
${twelveWeekSummary}

Recent 12-week volume curve:
${twelveWeekTotals}

Recent 12-week movement trend:
${twelveWeekMovementInsights}` : '12-week review: skip, because available training history is under 12 weeks.'}

Please provide:
1. A concise 4-week trend summary.
2. Concrete movement-level observations (load, reps at same load, total volume, possible bottlenecks).
3. If 12 weeks are available, compare early vs late period trend and risks.
4. If 12 weeks are not available, clearly state this limitation.
5. Practical next-week action steps.

Constraints:
- Output in Traditional Chinese (Taiwan).
- Use short paragraphs or bullet points.
- Keep it under 280 words.
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

    return `AI Coach Error: ${error.message || "Unknown error"}.`;
  }
};
