import zooKnowledge from '@/knowledge/zoo/knowledge.json';

export type ZooKnowledgeRecord = {
  id: string;
  kind: string;
  title: string;
  text: string;
  tags: string[];
  source: string;
  state: string;
};

export type RetrievedZooKnowledge = ZooKnowledgeRecord & { score: number };

const records = zooKnowledge.records as ZooKnowledgeRecord[];

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-zа-яё0-9_\- ]/gi, ' ');
}

function tokens(value: string) {
  return new Set(normalize(value).split(/\s+/).filter((token) => token.length > 2));
}

export function retrieveZooKnowledge(query: string, limit = 4): RetrievedZooKnowledge[] {
  const queryTokens = tokens(query);
  if (!queryTokens.size) return [];

  return records
    .map((record) => {
      const bodyTokens = tokens(`${record.title} ${record.text}`);
      const tagTokens = tokens(record.tags.join(' '));
      let lexical = 0;
      let tagScore = 0;
      for (const token of queryTokens) {
        if (bodyTokens.has(token)) lexical += 1;
        if (tagTokens.has(token)) tagScore += 2;
      }
      const phraseBonus = record.tags.some((tag) => normalize(query).includes(normalize(tag))) ? 4 : 0;
      return { ...record, score: lexical + tagScore + phraseBonus };
    })
    .filter((record) => record.score > 0)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, Math.max(1, limit));
}

export function formatZooKnowledge(recordsToFormat: RetrievedZooKnowledge[]) {
  if (!recordsToFormat.length) return '';
  return [
    'ZOO KNOWLEDGE (candidate context; keep record ids and states visible):',
    ...recordsToFormat.map(
      (record) => `[${record.id}] (${record.kind}; ${record.state}; source=${record.source}) ${record.title}: ${record.text}`
    )
  ].join('\n');
}
