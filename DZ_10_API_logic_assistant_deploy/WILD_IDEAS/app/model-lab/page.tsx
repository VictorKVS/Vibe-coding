'use client';

import { useEffect, useMemo, useState } from 'react';

type ModelItem = {
  id: string;
  provider: string;
  model: string;
  label: string;
  available: boolean;
  note: string;
};

type AgentItem = {
  id: string;
  name: string;
  purpose: string;
};

type EvalCase = {
  id: string;
  title: string;
  agentId: string;
  task: 'dialogue' | 'synthesis' | 'architecture';
  prompt: string;
  rubric: string[];
};

type ExperimentResult = {
  selection: string;
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
  text?: string;
  error?: string;
};

const box: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,.14)',
  borderRadius: 18,
  background: 'rgba(12,16,26,.78)',
  padding: 18,
};

export default function ModelLabPage() {
  const [models, setModels] = useState<ModelItem[]>([]);
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [cases, setCases] = useState<EvalCase[]>([]);
  const [caseId, setCaseId] = useState('ME-004');
  const [agentId, setAgentId] = useState('prompt_engineer');
  const [task, setTask] = useState<'dialogue' | 'synthesis' | 'architecture'>('architecture');
  const [query, setQuery] = useState('');
  const [selectedModels, setSelectedModels] = useState<string[]>(['demo']);
  const [results, setResults] = useState<ExperimentResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/llm').then((r) => r.json()),
      fetch('/api/zoo').then((r) => r.json()),
      fetch('/api/zoo/experiments').then((r) => r.json()),
    ])
      .then(([llm, zoo, evals]) => {
        const nextModels = Array.isArray(llm?.models) ? llm.models.filter((item: ModelItem) => item.available) : [];
        const nextAgents = Array.isArray(zoo?.agents) ? zoo.agents : [];
        const nextCases = Array.isArray(evals?.cases) ? evals.cases : [];
        setModels(nextModels);
        setAgents(nextAgents);
        setCases(nextCases);
        const initial = nextCases.find((item: EvalCase) => item.id === 'ME-004') || nextCases[0];
        if (initial) {
          setCaseId(initial.id);
          setAgentId(initial.agentId);
          setTask(initial.task);
          setQuery(initial.prompt);
        }
        const firstReal = nextModels.find((item: ModelItem) => item.id !== 'auto' && item.id !== 'demo');
        setSelectedModels(firstReal ? ['demo', firstReal.id] : ['demo']);
      })
      .catch(() => setError('Не удалось загрузить Model Lab.'));
  }, []);

  const currentCase = useMemo(() => cases.find((item) => item.id === caseId) || null, [cases, caseId]);

  function chooseCase(value: string) {
    setCaseId(value);
    const item = cases.find((candidate) => candidate.id === value);
    if (!item) return;
    setAgentId(item.agentId);
    setTask(item.task);
    setQuery(item.prompt);
    setResults([]);
  }

  function toggleModel(id: string) {
    setError('');
    setSelectedModels((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 4) {
        setError('За один эксперимент можно выбрать максимум 4 модели.');
        return current;
      }
      return [...current, id];
    });
  }

  async function runExperiment() {
    if (!query.trim()) {
      setError('Введите запрос.');
      return;
    }
    if (!selectedModels.length) {
      setError('Выберите хотя бы одну модель.');
      return;
    }
    setBusy(true);
    setError('');
    setResults([]);
    try {
      const responses = await Promise.all(
        selectedModels.map(async (selection): Promise<ExperimentResult> => {
          const started = performance.now();
          try {
            const response = await fetch('/api/llm', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                selection,
                task,
                agent: agentId,
                messages: [{ role: 'user', content: query }],
                context: { experiment: true, caseId, rubric: currentCase?.rubric || [] },
              }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`);
            return { ...data, selection } as ExperimentResult;
          } catch (caught) {
            return {
              selection,
              latencyMs: Math.round(performance.now() - started),
              error: caught instanceof Error ? caught.message : 'Experiment error',
            };
          }
        }),
      );
      setResults(responses);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: '#080b12', color: '#f5f7fb', padding: '28px clamp(18px,4vw,56px)', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1500, margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap' }}>
          <div>
            <a href="/" style={{ color: '#9fb1d0', textDecoration: 'none' }}>← Дикие идеи</a>
            <p style={{ margin: '18px 0 6px', color: '#7fd9c4', letterSpacing: '.12em', fontSize: 12 }}>ALINA / AGENT ZOO</p>
            <h1 style={{ margin: 0, fontSize: 'clamp(32px,5vw,68px)', lineHeight: .96 }}>Model Lab</h1>
            <p style={{ maxWidth: 850, color: '#aeb8ca', fontSize: 17, lineHeight: 1.55 }}>
              Один и тот же кейс запускается через выбранного специалиста и несколько моделей. Сравниваем наблюдаемые ответы, latency, usage, prompt version и knowledge refs — без автоматического объявления «лучшей модели».
            </p>
          </div>
          <div style={{ ...box, maxWidth: 400 }}>
            <strong>Важно</strong>
            <p style={{ margin: '8px 0 0', color: '#b9c1cf', lineHeight: 1.45 }}>
              Реальные провайдеры могут тарифицировать каждый запуск. Никакие эксперименты автоматически не запускаются: только по кнопке ниже.
            </p>
          </div>
        </header>

        <section style={{ ...box, marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 14 }}>
            <label>
              <span style={{ display: 'block', color: '#95a3ba', fontSize: 12, marginBottom: 7 }}>EVAL CASE</span>
              <select value={caseId} onChange={(event) => chooseCase(event.target.value)} style={{ width: '100%', padding: 11, borderRadius: 10 }}>
                {cases.map((item) => <option key={item.id} value={item.id}>{item.id} · {item.title}</option>)}
              </select>
            </label>
            <label>
              <span style={{ display: 'block', color: '#95a3ba', fontSize: 12, marginBottom: 7 }}>AGENT</span>
              <select value={agentId} onChange={(event) => setAgentId(event.target.value)} style={{ width: '100%', padding: 11, borderRadius: 10 }}>
                {agents.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label>
              <span style={{ display: 'block', color: '#95a3ba', fontSize: 12, marginBottom: 7 }}>TASK CLASS</span>
              <select value={task} onChange={(event) => setTask(event.target.value as typeof task)} style={{ width: '100%', padding: 11, borderRadius: 10 }}>
                <option value="dialogue">dialogue</option>
                <option value="synthesis">synthesis</option>
                <option value="architecture">architecture</option>
              </select>
            </label>
          </div>

          <label style={{ display: 'block', marginTop: 18 }}>
            <span style={{ display: 'block', color: '#95a3ba', fontSize: 12, marginBottom: 7 }}>ОДИНАКОВЫЙ ЗАПРОС ДЛЯ ВСЕХ МОДЕЛЕЙ</span>
            <textarea value={query} onChange={(event) => setQuery(event.target.value)} rows={6} style={{ width: '100%', boxSizing: 'border-box', padding: 14, borderRadius: 12, font: 'inherit' }} />
          </label>

          {currentCase && (
            <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background: 'rgba(127,217,196,.07)' }}>
              <strong>Rubric:</strong>
              <ul style={{ marginBottom: 0 }}>
                {currentCase.rubric.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          )}
        </section>

        <section style={{ ...box, marginBottom: 20 }}>
          <h2 style={{ marginTop: 0 }}>Модели</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 10 }}>
            {models.filter((item) => item.id !== 'auto').map((item) => {
              const active = selectedModels.includes(item.id);
              return (
                <button key={item.id} type="button" onClick={() => toggleModel(item.id)} style={{ textAlign: 'left', padding: 14, borderRadius: 12, cursor: 'pointer', border: active ? '1px solid #7fd9c4' : '1px solid rgba(255,255,255,.14)', background: active ? 'rgba(127,217,196,.10)' : 'rgba(255,255,255,.03)', color: '#f5f7fb' }}>
                  <strong>{active ? '✓ ' : ''}{item.label}</strong>
                  <small style={{ display: 'block', marginTop: 5, color: '#9eabc0' }}>{item.note}</small>
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 18, flexWrap: 'wrap' }}>
            <button type="button" disabled={busy} onClick={runExperiment} style={{ border: 0, borderRadius: 12, padding: '12px 18px', fontWeight: 700, cursor: busy ? 'wait' : 'pointer' }}>
              {busy ? 'Запускаю…' : `Сравнить ${selectedModels.length || ''} модели`}
            </button>
            <span style={{ color: '#92a0b5' }}>Выбрано: {selectedModels.length}/4</span>
            {error && <span style={{ color: '#ff9e9e' }}>{error}</span>}
          </div>
        </section>

        {results.length > 0 && (
          <section>
            <h2>Результаты</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 16 }}>
              {results.map((result) => (
                <article key={result.selection} style={box}>
                  <p style={{ color: '#7fd9c4', fontSize: 12, letterSpacing: '.08em' }}>{result.selection}</p>
                  {result.error ? (
                    <p style={{ color: '#ff9e9e' }}>{result.error}</p>
                  ) : (
                    <>
                      <h3 style={{ marginBottom: 8 }}>{result.provider} · {result.model}</h3>
                      <p style={{ marginTop: 0, color: '#9eabc0' }}>
                        {result.agentName || result.agentId} · {result.latencyMs} ms<br />
                        {result.promptId}@{result.promptVersion}<br />
                        refs: {(result.knowledgeRefs || []).join(', ') || '—'}
                      </p>
                      <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{result.text}</div>
                      {result.usage != null && (
                        <details style={{ marginTop: 14 }}>
                          <summary>Usage</summary>
                          <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(result.usage, null, 2)}</pre>
                        </details>
                      )}
                      <details style={{ marginTop: 10 }}>
                        <summary>Trace</summary>
                        <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify({ agentId: result.agentId, routingReason: result.routingReason, task: result.task, knowledgeRefs: result.knowledgeRefs }, null, 2)}</pre>
                      </details>
                    </>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
