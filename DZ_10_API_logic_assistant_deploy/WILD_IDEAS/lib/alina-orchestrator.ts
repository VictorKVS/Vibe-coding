import { buildAgentSystemPrompt, getZooAgent, isAgentId, promptMeta, type AgentId } from '@/lib/alina-zoo';
import { formatZooKnowledge, retrieveZooKnowledge } from '@/lib/zoo-rag';

export type AlinaTask = 'dialogue' | 'synthesis' | 'architecture';

const rules: Array<{ agent: AgentId; patterns: RegExp[]; reason: string }> = [
  {
    agent: 'security_engineer',
    patterns: [/security intake/i, /threat.?model/i, /матриц.*угроз/i, /модел.*угроз/i, /границ.*довер/i, /trust boundary/i, /abuse case/i, /security requirement/i, /остаточн.*риск/i],
    reason: 'security/threat-modeling intent'
  },
  {
    agent: 'system_engineer',
    patterns: [/system engineer/i, /системн.*инжен/i, /system context/i, /data flow/i, /поток.*данн/i, /интерфейс.*систем/i, /nfr/i, /нефункцион/i, /операционн.*режим/i],
    reason: 'system-engineering intent'
  },
  {
    agent: 'solution_architect',
    patterns: [/solution architect/i, /архитектурн.*вариант/i, /архитектур.*решен/i, /\badr\b/i, /trade.?off/i, /компонентн.*архитект/i],
    reason: 'solution-architecture intent'
  },
  {
    agent: 'product_manager',
    patterns: [/product manager/i, /продуктов.*требован/i, /ценност.*продукт/i, /product scope/i, /целев.*пользоват/i, /метрик.*успех/i, /product outcome/i],
    reason: 'product-definition intent'
  },
  {
    agent: 'prompt_engineer',
    patterns: [/\bпромпт/i, /system prompt/i, /prompt engineer/i, /контекст.?инжен/i, /prompt.?eval/i, /инструкц.*агент/i],
    reason: 'prompt/context engineering intent'
  },
  {
    agent: 'knowledge_growth_analyst',
    patterns: [/баз[ау] знан/i, /knowledge base/i, /\brag\b/i, /retriev/i, /чанк/i, /provenance/i, /источник.*утвержден/i, /противореч.*источник/i],
    reason: 'knowledge engineering intent'
  },
  {
    agent: 'research_analyst',
    patterns: [/исслед/i, /проверь.*источник/i, /найди.*источник/i, /рынок/i, /тренд/i, /подтверд.*факт/i, /evidence/i],
    reason: 'research/evidence intent'
  },
  {
    agent: 'skeptical_reviewer',
    patterns: [/разнес/i, /покритику/i, /red.?team/i, /контрпример/i, /скрыт.*предполож/i, /failure mode/i, /риск.*не замет/i],
    reason: 'adversarial review intent'
  },
  {
    agent: 'narrative_architect',
    patterns: [/сюжет/i, /геро/i, /персонаж/i, /мир/i, /арка/i, /сцен[ауы]/i, /story/i, /narrative/i, /continuity/i],
    reason: 'narrative design intent'
  }
];

export type AlinaPlan = {
  agentId: AgentId;
  agentName: string;
  promptId: string;
  promptVersion: string;
  routingReason: string;
  systemPrompt: string;
  knowledgeRefs: string[];
  knowledgeText: string;
};

export function routeAgent(query: string, explicitAgent?: string): { agentId: AgentId; reason: string } {
  if (isAgentId(explicitAgent)) return { agentId: explicitAgent, reason: 'explicit agent selection' };
  for (const rule of rules) {
    if (rule.patterns.some((pattern) => pattern.test(query))) return { agentId: rule.agent, reason: rule.reason };
  }
  return { agentId: 'alina_orchestrator', reason: 'default conversational orchestration' };
}

export function planAlinaRequest(input: {
  query: string;
  task: AlinaTask;
  explicitAgent?: string;
}): AlinaPlan {
  const routed = routeAgent(input.query, input.explicitAgent);
  const agent = getZooAgent(routed.agentId);
  const prompt = promptMeta(agent);
  const knowledge = retrieveZooKnowledge(`${input.query} ${agent.capabilities.join(' ')} ${input.task}`, 4);
  const knowledgeText = formatZooKnowledge(knowledge);
  const systemPrompt = [
    buildAgentSystemPrompt(agent),
    '',
    `Task class: ${input.task}.`,
    `Routing reason: ${routed.reason}.`,
    knowledgeText,
    'Use retrieved Zoo knowledge only when applicable. If it does not answer the task, ignore it rather than forcing a connection.'
  ].filter(Boolean).join('\n');

  return {
    agentId: agent.id,
    agentName: agent.name,
    promptId: prompt.id,
    promptVersion: prompt.version,
    routingReason: routed.reason,
    systemPrompt,
    knowledgeRefs: knowledge.map((record) => record.id),
    knowledgeText
  };
}
