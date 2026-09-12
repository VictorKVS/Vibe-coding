import registry from '@/knowledge/zoo/agents.json';
import promptManifest from '@/prompts/manifest.json';

export type AgentId =
  | 'alina_orchestrator'
  | 'research_analyst'
  | 'knowledge_growth_analyst'
  | 'prompt_engineer'
  | 'narrative_architect'
  | 'skeptical_reviewer';

export type ZooAgent = {
  id: AgentId;
  name: string;
  purpose: string;
  capabilities: string[];
  knowledgeDomains: string[];
  promptId: string;
  promptVersion: string;
  handoffTargets: AgentId[];
  mustNot: string[];
  owner: string;
  status: string;
};

const agents = registry.agents as ZooAgent[];

export function listZooAgents(): ZooAgent[] {
  return agents.filter((agent) => agent.status === 'active');
}

export function isAgentId(value: string | undefined): value is AgentId {
  return Boolean(value && agents.some((agent) => agent.id === value));
}

export function getZooAgent(id: AgentId): ZooAgent {
  const agent = agents.find((item) => item.id === id);
  if (!agent) throw new Error(`Unknown Zoo agent: ${id}`);
  return agent;
}

export function promptMeta(agent: ZooAgent) {
  const item = promptManifest.prompts.find((prompt) => prompt.id === agent.promptId);
  return item || { id: agent.promptId, version: agent.promptVersion, status: 'unregistered' };
}

const roleGuidance: Record<AgentId, string> = {
  alina_orchestrator:
    'Веди диалог, уточняй намерение, подключай специалиста только когда это улучшает результат. Сохраняй подтверждённые пользователем решения и явно отделяй факт от гипотезы.',
  research_analyst:
    'Работай как исследователь: отделяй подтверждённые факты, рыночные сигналы и гипотезы; отмечай пробелы доказательств. Не выдумывай источники и не маскируй неопределённость.',
  knowledge_growth_analyst:
    'Работай как инженер баз знаний: различай источник, атомарное утверждение, интерпретацию, конфликт, gap и статус проверки. Предлагай структуру KB и eval-кейсы, но не присваивай сгенерированному знанию статус VERIFIED самостоятельно.',
  prompt_engineer:
    'Работай как профессиональный Prompt/Context Engineer. Разделяй стабильную политику, task instructions, RAG-контекст, runtime state и examples. Давай id/version, переменные, eval-кейсы, риски и статус DRAFT/READY_FOR_EVAL/NEEDS_MORE_CONTEXT. Никогда не выдавай себе PRODUCTION.',
  narrative_architect:
    'Работай как архитектор истории: следи за Story DNA, причинностью, арками, миром и непротиворечивостью. Предлагай альтернативы, но не отбирай у пользователя право на ключевые творческие решения.',
  skeptical_reviewer:
    'Ищи скрытые предположения, контрпримеры, слабые места, вторичные последствия и более простые варианты. Критикуй доказательно: предпочтение само по себе не является основанием.'
};

export function buildAgentSystemPrompt(agent: ZooAgent): string {
  return [
    'Ты — Алина, AI-продюсер проекта «Дикие идеи → в деньги», работающая через управляемый Agent Zoo.',
    `Активная роль: ${agent.name} (${agent.id}).`,
    `Назначение роли: ${agent.purpose}`,
    roleGuidance[agent.id],
    `Запрещено роли: ${agent.mustNot.join('; ')}.`,
    'Отвечай по-русски, предметно. Не обещай коммерческий успех. Сохраняй видимыми неопределённость и основания выводов.',
    'Если retrieved knowledge имеет статус ниже verified, используй его как рабочий контекст, а не как безусловную истину.'
  ].join('\n');
}
