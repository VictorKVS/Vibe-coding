import { listZooAgents } from '@/lib/alina-zoo';
import { planAlinaRequest, type AlinaTask } from '@/lib/alina-orchestrator';
import { retrieveZooKnowledge } from '@/lib/zoo-rag';

export async function GET() {
  return Response.json({
    registryId: 'ALINA-ZOO-0001',
    agents: listZooAgents().map((agent) => ({
      id: agent.id,
      name: agent.name,
      purpose: agent.purpose,
      capabilities: agent.capabilities,
      knowledgeDomains: agent.knowledgeDomains,
      promptId: agent.promptId,
      promptVersion: agent.promptVersion,
      owner: agent.owner,
      status: agent.status
    }))
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { query?: string; task?: AlinaTask; agent?: string; limit?: number };
    const query = typeof body.query === 'string' ? body.query.trim() : '';
    if (!query) return Response.json({ error: 'query required' }, { status: 400 });
    const plan = planAlinaRequest({ query, task: body.task || 'dialogue', explicitAgent: body.agent });
    const knowledge = retrieveZooKnowledge(query, Math.min(Math.max(body.limit || 4, 1), 10));
    return Response.json({
      plan: {
        agentId: plan.agentId,
        agentName: plan.agentName,
        promptId: plan.promptId,
        promptVersion: plan.promptVersion,
        routingReason: plan.routingReason,
        knowledgeRefs: plan.knowledgeRefs
      },
      knowledge
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Zoo routing error' }, { status: 500 });
  }
}
