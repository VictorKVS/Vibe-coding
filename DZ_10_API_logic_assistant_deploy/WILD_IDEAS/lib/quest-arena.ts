import questCatalog from '@/knowledge/zoo/quests.json';
import compositionCatalog from '@/knowledge/zoo/compositions.json';

export type QuestTask = 'dialogue' | 'synthesis' | 'architecture';

export type Quest = {
  id: string;
  profession: string;
  level: string;
  title: string;
  defaultAgent: string;
  task: QuestTask;
  scenario: string;
  objective: string;
  constraints: string[];
  successCriteria: string[];
  automaticChecks: {
    mustContainAnyGroups: string[][];
    mustNotContain: string[];
    minChars: number;
  };
};

export type CompositionStage = {
  id: string;
  agent: string;
  modelSlot: string;
  instruction: string;
  uses?: string[];
};

export type Composition = {
  id: string;
  title: string;
  description: string;
  modelSlots: string[];
  waves: CompositionStage[][];
  finalStage: string;
};

export type AutomaticCheck = {
  id: string;
  passed: boolean;
  detail: string;
};

const quests = questCatalog.quests as Quest[];
const compositions = compositionCatalog.compositions as Composition[];

export function listQuests() {
  return quests;
}

export function listCompositions() {
  return compositions;
}

export function maxCallsPerRun() {
  return compositionCatalog.maxCallsPerRun;
}

export function getQuest(id: string) {
  return quests.find((quest) => quest.id === id) || null;
}

export function getComposition(id: string) {
  return compositions.find((composition) => composition.id === id) || null;
}

export function resolveStageAgent(stage: CompositionStage, quest: Quest) {
  return stage.agent === '$quest.defaultAgent' ? quest.defaultAgent : stage.agent;
}

export function countCompositionCalls(composition: Composition) {
  return composition.waves.reduce((total, wave) => total + wave.length, 0);
}

function normalize(value: string) {
  return value.toLocaleLowerCase('ru-RU');
}

export function evaluateQuestOutput(quest: Quest, output: string) {
  const text = normalize(output);
  const checks: AutomaticCheck[] = [];

  quest.automaticChecks.mustContainAnyGroups.forEach((group, index) => {
    const matched = group.find((term) => text.includes(normalize(term)));
    checks.push({
      id: `required-group-${index + 1}`,
      passed: Boolean(matched),
      detail: matched ? `found: ${matched}` : `missing one of: ${group.join(' | ')}`,
    });
  });

  quest.automaticChecks.mustNotContain.forEach((term, index) => {
    const found = text.includes(normalize(term));
    checks.push({
      id: `forbidden-${index + 1}`,
      passed: !found,
      detail: found ? `forbidden phrase found: ${term}` : `not found: ${term}`,
    });
  });

  checks.push({
    id: 'minimum-length',
    passed: output.trim().length >= quest.automaticChecks.minChars,
    detail: `${output.trim().length} chars / minimum ${quest.automaticChecks.minChars}`,
  });

  const passed = checks.filter((check) => check.passed).length;
  const total = checks.length;

  return {
    passed,
    total,
    score: total ? Math.round((passed / total) * 100) : 0,
    allPassed: passed === total,
    checks,
    note: 'Deterministic checks validate required signals and obvious violations only; they do not prove professional correctness.',
  };
}

export function buildQuestPrompt(
  quest: Quest,
  stage: CompositionStage,
  previous: Record<string, string>,
  overrideScenario?: string,
) {
  const dependencies = (stage.uses || [])
    .map((id) => previous[id] ? `\n--- ${id.toUpperCase()} ---\n${previous[id]}` : '')
    .filter(Boolean)
    .join('\n');

  return [
    `PROFESSIONAL QUEST: ${quest.id} · ${quest.title}`,
    `Profession: ${quest.profession}`,
    `Level: ${quest.level}`,
    '',
    'SCENARIO:',
    overrideScenario?.trim() || quest.scenario,
    '',
    'OBJECTIVE:',
    quest.objective,
    '',
    'CONSTRAINTS:',
    ...quest.constraints.map((item) => `- ${item}`),
    '',
    'SUCCESS CRITERIA:',
    ...quest.successCriteria.map((item) => `- ${item}`),
    '',
    `CURRENT STAGE: ${stage.id}`,
    stage.instruction,
    dependencies ? `\nINPUTS FROM PREVIOUS STAGES:${dependencies}` : '',
    '',
    'Ответ должен быть профессионально полезным, проверяемым и не скрывать неизвестное.',
  ].filter(Boolean).join('\n');
}
