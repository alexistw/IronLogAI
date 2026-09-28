import { Exercise, UserProfile } from '../types';
import { getExerciseEffectiveWeightKg, getExerciseVolumeKg, getMonday } from '../utils';
import { requestCoach } from './aiClient';

const formatWeekLabel = (date: Date) =>
  `${date.toLocaleDateString()} - ${new Date(date.getTime() + 6 * 86400000).toLocaleDateString()}`;

type MovementWeekStats = {
  sets: number;
  reps: number;
  topWeightKg: number;
  volumeKg: number;
  weightToReps: Map<string, number>;
  bodyweightMode?: 'bw_plus' | 'bw_minus';
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
        bodyweightMode: ex.bodyweightMode ?? (ex.assisted ? 'bw_minus' : undefined),
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

const groupExercisesByWeek = (exercises: Exercise[], analysisStart: Date, weekCount: number) => {
  const groupedByWeek = new Map<string, Exercise[]>();

  exercises.forEach(ex => {
    const weekStart = getMonday(new Date(ex.date));
    const weekKey = weekStart.toISOString();
    const current = groupedByWeek.get(weekKey) || [];
    current.push(ex);
    groupedByWeek.set(weekKey, current);
  });

  return Array.from({ length: weekCount }, (_, index) => {
    const weekStart = new Date(analysisStart);
    weekStart.setDate(weekStart.getDate() + index * 7);
    const weekKey = getMonday(weekStart).toISOString();
    return buildWeekStats(weekKey, groupedByWeek.get(weekKey) || []);
  });
};

const buildWeeklySummaryLines = (weeks: WeekStats[]) =>
  weeks
    .map(week => {
      const movements = Object.entries(week.movementSummary)
        .sort((a, b) => b[1].sets - a[1].sets)
        .map(([name, data]) => {
          const tag = data.bodyweightMode === 'bw_plus' ? ' [BW+]' : data.bodyweightMode === 'bw_minus' ? ' [BW-]' : '';
          return `${name}${tag}: ${data.sets} sets, ${data.reps} total reps, top ${roundOne(data.topWeightKg)}kg, volume ${Math.round(data.volumeKg)}kg`;
        })
        .join('; ');

      return `Week ${formatWeekLabel(week.weekStart)} | total sets ${week.totalSets} | total volume ${Math.round(week.totalVolume)}kg | movements: ${movements || 'none'}`;
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
        ? `at ${commonWeights[0]}kg total reps ${firstWeightReps.get(commonWeights[0])} -> ${secondWeightReps.get(commonWeights[0])}`
        : 'no same-load comparison';

      const bwTag = allStats[0]?.bodyweightMode === 'bw_plus' ? ' [BW+]' : allStats[0]?.bodyweightMode === 'bw_minus' ? ' [BW-]' : '';
      return {
        totalSets,
        totalVolume,
        line: `${name}${bwTag} | 4-week volume ${Math.round(totalVolume)}kg | top weight ${roundOne(firstTopWeight)} -> ${roundOne(secondTopWeight)}kg | volume ${Math.round(firstVolume)} -> ${Math.round(secondVolume)}kg | ${sameWeightRepNote}`,
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

      const bwTag = allStats[0]?.bodyweightMode === 'bw_plus' ? ' [BW+]' : allStats[0]?.bodyweightMode === 'bw_minus' ? ' [BW-]' : '';
      return {
        totalSets,
        totalVolume,
        line: `${name}${bwTag} | 12-week active ${allStats.length}/${weeks.length} weeks | top weight ${roundOne(earlyTopWeight)} -> ${roundOne(lateTopWeight)}kg | early 4-week volume ${Math.round(earlyVolume)}kg | late 4-week volume ${Math.round(lateVolume)}kg`,
      };
    })
    .sort((a, b) => b.totalVolume - a.totalVolume || b.totalSets - a.totalSets)
    .slice(0, 8)
    .map(item => item.line)
    .join('\n');
};

const buildAnalysisSummary = (exercises: Exercise[], analysisStart: Date) => {
  // Keep the full calendar timeline. A week without workouts is meaningful
  // training data (zero sets and volume), rather than a gap to discard.
  const allWeeks = groupExercisesByWeek(exercises, analysisStart, 8);
  const previousFourWeeks = allWeeks.slice(0, 4);
  const recentFourWeeks = allWeeks.slice(-4);

  return {
    previousFourWeekSummary: buildWeeklySummaryLines(previousFourWeeks),
    recentFourWeekSummary: buildWeeklySummaryLines(recentFourWeeks),
  };
};

export const generateWeeklyAnalysis = async (
  exercises: Exercise[],
  focusWeekStart: Date,
  analysisStart: Date,
  analysisEnd: Date,
  userProfile: UserProfile
): Promise<string> => {
  if (exercises.length === 0) {
    return "No workouts recorded in the selected analysis window.";
  }

  const {
    previousFourWeekSummary,
    recentFourWeekSummary,
  } = buildAnalysisSummary(exercises, analysisStart);

  const bodyInfo = [getProfileHeightText(userProfile), getProfileWeightText(userProfile)].join('\n');

  const prompt = `
Focus week: ${focusWeekStart.toLocaleDateString()}
Analysis range: ${analysisStart.toLocaleDateString()} to ${analysisEnd.toLocaleDateString()}

User body metrics (current):
${bodyInfo}

Data rules:
- Every block contains four consecutive calendar weeks. "movements: none" is a real
  zero-training week and must remain part of the trend.
- "sets" and "total reps" are weekly totals across all sessions. Total reps means
  sets x reps-per-set summed, never reps completed in one set.
- "top" is the heaviest effective load that week; "volume" is load x reps, in kg.
- The two blocks below are eight consecutive calendar weeks. For the long-term
  comparison, compare the previous four weeks with the recent four weeks.

Previous 4-week block:
${previousFourWeekSummary}

Recent 4-week block:
${recentFourWeekSummary}

Please provide:
1. A concise recent 4-week trend summary that includes zero-training weeks.
2. An 8-week comparison of the previous 4-week block versus the recent 4-week block.
3. Analyze training balance and trend by primary muscle group: chest, shoulders,
   back, and legs. Infer each movement's primary group from its name. Do not create
   a movement-by-movement observations section. If a group has insufficient data,
   say so instead of guessing.
4. Key workload, consistency, imbalance, plateau, and recovery risks.
5. Practical next-week action steps, organized by those four muscle groups where relevant.

`;

  // Throws on failure rather than returning the error text as the report —
  // the caller persists whatever comes back, so a returned error message ended
  // up saved as that week's analysis until it was manually regenerated.
  return requestCoach('weekly-coach', prompt);
};
