import {
  buildQuestPrompt,
  countCompositionCalls,
  evaluateQuestOutput,
  getComposition,
  getQuest,
  listCompositions,
  listQuests,
  maxCallsPerRun,
  resolveStageAgent,
} from '@/lib/quest-arena';

type RunBody = {
  questId?: string;
  compositionId?: string;
  models?: Record<string, string>;
  scenarioOverride?: string;
};

type LlmResult = {
  text?: string;
  error?: string;
  selection?: string;
  provider?: string;
  model?: string;
  task?: string;
  latencyMs?: number;
  agentId?: string;
  agentName?: string;
  promptId?: string;
  promptVersion?: string;
  knowledgeRefs?: string[];
  routingReason?: string;
  usage?: unknown;
};

type StageResult = {
  stageId: string;
  agentId: string;
  modelSlot: string;
  selection: string;
  ok: boolean;
  text: string;
  error?: string;
  provider?: string;
  model?: string;
  latencyMs?: number;
  promptId?: string;
  promptVersion?: string;
  knowledgeRefs?: string[];
  routingReason?: string;
  usage?: unknown;
};

function experimentId() {
  return `QX-${Date.now().toString(36).toUpperCase()}`;
}

function combinationLabel(models: Record<string, string>) {
  return Object.entries(models)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([slot, model]) => `${slot}=${model}`)
    .join('__');
}

function filenameSafe(value: string) {
  return value.replace(/[^a-zA-Z0-9_.=-]+/g, '-').replace(/-+/g, '-').slice(0, 180);
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function callLlm(requestUrl: string, payload: object): Promise<LlmResult> {
  const response = await fetch(new URL('/api/llm', requestUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await response.json()) as LlmResult;
  if (!response.ok) throw new Error(data.error || `LLM HTTP ${response.status}`);
  return data;
}

export async function GET() {
  return Response.json({
    catalogId: 'ALINA-QUEST-ARENA-0001',
    maxCallsPerRun: maxCallsPerRun(),
    quests: listQuests(),
    compositions: listCompositions(),
  });
}

export async function POST(request: Request) {
  const started = Date.now();
  const generatedAt = new Date().toISOString();
  const runId = experimentId();
  try {
    const body = (await request.json()) as RunBody;
    const quest = getQuest(body.questId || '');
    const composition = getComposition(body.compositionId || '');
    if (!quest) return Response.json({ error: 'Unknown questId' }, { status: 400 });
    if (!composition) return Response.json({ error: 'Unknown compositionId' }, { status: 400 });

    const calls = countCompositionCalls(composition);
    if (calls > maxCallsPerRun()) {
      return Response.json({ error: `Composition exceeds maxCallsPerRun=${maxCallsPerRun()}` }, { status: 400 });
    }

    const models = body.models || {};
    const missingSlots = composition.modelSlots.filter((slot) => !models[slot]);
    if (missingSlots.length) {
      return Response.json({ error: `Missing model slots: ${missingSlots.join(', ')}` }, { status: 400 });
    }

    const combo = combinationLabel(models);
    const signatureMaterial = JSON.stringify({
      questId: quest.id,
      compositionId: composition.id,
      models: Object.fromEntries(Object.entries(models).sort(([a], [b]) => a.localeCompare(b))),
      scenario: body.scenarioOverride?.trim() || quest.scenario,
    });
    const combinationFingerprint = await sha256(signatureMaterial);
    const shortFingerprint = combinationFingerprint.slice(0, 12);
    const artifactFilename = `${generatedAt.replace(/[:.]/g, '-') }__${quest.id}__${composition.id}__${filenameSafe(combo)}__${shortFingerprint}.json`;

    const previous: Record<string, string> = {};
    const stageResults: StageResult[] = [];

    for (const wave of composition.waves) {
      const waveResults = await Promise.all(
        wave.map(async (stage): Promise<StageResult> => {
          const agentId = resolveStageAgent(stage, quest);
          const selection = models[stage.modelSlot];
          const prompt = buildQuestPrompt(quest, stage, previous, body.scenarioOverride);
          const stageStarted = Date.now();
          try {
            const result = await callLlm(request.url, {
              selection,
              task: quest.task,
              agent: agentId,
              messages: [{ role: 'user', content: prompt }],
              context: {
                questArena: true,
                questId: quest.id,
                compositionId: composition.id,
                stageId: stage.id,
                modelSlot: stage.modelSlot,
                combinationFingerprint: shortFingerprint,
              },
            });
            return {
              stageId: stage.id,
              agentId,
              modelSlot: stage.modelSlot,
              selection,
              ok: true,
              text: String(result.text || ''),
              provider: result.provider,
              model: result.model,
              latencyMs: result.latencyMs ?? Date.now() - stageStarted,
              promptId: result.promptId,
              promptVersion: result.promptVersion,
              knowledgeRefs: result.knowledgeRefs,
              routingReason: result.routingReason,
              usage: result.usage,
            };
          } catch (error) {
            return {
              stageId: stage.id,
              agentId,
              modelSlot: stage.modelSlot,
              selection,
              ok: false,
              text: '',
              error: error instanceof Error ? error.message : 'Stage failed',
              latencyMs: Date.now() - stageStarted,
            };
          }
        }),
      );

      stageResults.push(...waveResults);
      for (const result of waveResults) {
        if (result.ok) previous[result.stageId] = result.text;
      }

      const failed = waveResults.filter((result) => !result.ok);
      if (failed.length) {
        return Response.json(
          {
            schemaVersion: 1,
            experimentId: runId,
            generatedAt,
            artifactFilename,
            combinationLabel: combo,
            combinationFingerprint,
            reviewState: 'PENDING_STRICT_REVIEW',
            status: 'PARTIAL_FAILURE',
            questId: quest.id,
            compositionId: composition.id,
            models,
            callsPlanned: calls,
            callsCompleted: stageResults.length,
            wallMs: Date.now() - started,
            stageResults,
            error: `Wave failed: ${failed.map((item) => item.stageId).join(', ')}`,
          },
          { status: 502 },
        );
      }
    }

    const finalResult = stageResults.find((result) => result.stageId === composition.finalStage);
    if (!finalResult?.text) {
      return Response.json({ error: 'Final stage produced no output', stageResults }, { status: 500 });
    }

    const automaticEvaluation = evaluateQuestOutput(quest, finalResult.text);
    const totalReportedLatencyMs = stageResults.reduce((sum, result) => sum + (result.latencyMs || 0), 0);

    const record = {
      schemaVersion: 1,
      experimentId: runId,
      generatedAt,
      artifactFilename,
      combinationLabel: combo,
      combinationFingerprint,
      status: 'COMPLETED',
      reviewState: 'PENDING_STRICT_REVIEW',
      quest: {
        id: quest.id,
        title: quest.title,
        profession: quest.profession,
        level: quest.level,
        scenario: body.scenarioOverride?.trim() || quest.scenario,
        objective: quest.objective,
        constraints: quest.constraints,
        successCriteria: quest.successCriteria,
      },
      composition: { id: composition.id, title: composition.title, description: composition.description },
      models,
      callsUsed: stageResults.length,
      wallMs: Date.now() - started,
      totalReportedLatencyMs,
      finalStage: composition.finalStage,
      finalOutput: finalResult.text,
      automaticEvaluation,
      stageResults,
      strictReview: {
        state: 'PENDING',
        reviewer: null,
        reviewedAt: null,
        verdict: null,
        hardFail: null,
        score: null,
        dimensions: {
          professionalCorrectness: null,
          constraintAdherence: null,
          evidenceDiscipline: null,
          completeness: null,
          clarity: null,
          efficiency: null,
        },
        strengths: [],
        criticalDefects: [],
        notes: null,
      },
      note: 'Automatic score is a structural signal, not proof of professional correctness. The strictReview block is intentionally empty until independent review.',
    };

    return Response.json(record);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Quest Arena error' }, { status: 500 });
  }
}
