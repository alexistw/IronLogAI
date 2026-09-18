// Allowlisted tasks. The app may only ask for one of these — the proxy is not
// a general-purpose LLM endpoint, which keeps the blast radius small if the
// endpoint URL leaks.
//
// System prompts live here rather than in the app so tone, language and length
// can be retuned by redeploying the worker, with no App Store review cycle.

export interface TaskDefinition {
  system: string;
  maxTokens: number;
  temperature?: number;
  maxPromptChars: number;
}

export const TASKS: Record<string, TaskDefinition> = {
  'weekly-coach': {
    system: [
      'You are a strength training coach reviewing a lifter\'s workout log.',
      'All loads given to you are normalized to total kilograms (effective weight).',
      'Movement tags: [BW+] = bodyweight plus added weight (heavier = stronger).',
      '[BW-] = bodyweight minus assistance (heavier logged weight = less assistance = improvement).',
      '',
      'Output rules:',
      '- Write in Traditional Chinese (Taiwan).',
      '- Use short paragraphs or bullet points.',
      '- Stay under 280 words.',
      '- Be motivating, concrete and practical. No filler, no disclaimers.',
    ].join('\n'),
    maxTokens: 4096,
    temperature: 0.7,
    maxPromptChars: 24_000,
  },
};

export const isKnownTask = (task: string): task is keyof typeof TASKS =>
  Object.prototype.hasOwnProperty.call(TASKS, task);
