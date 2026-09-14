'use client';

import { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BellRing,
  BookOpenCheck,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  Database,
  Eye,
  FileWarning,
  FlaskConical,
  Gauge,
  GitCompareArrows,
  History,
  Info,
  Network,
  PauseCircle,
  PlayCircle,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Sparkles,
  TimerReset,
  TriangleAlert,
  XCircle,
} from 'lucide-react';
import styles from './operator-console.module.css';

type Severity = 'critical' | 'high' | 'review' | 'info';
type Mode = 'normal' | 'load' | 'stress';
type DecisionState = 'open' | 'accepted' | 'deferred' | 'rejected';
type Panel = 'summary' | 'compare' | 'evidence' | 'action';

type Metric = {
  label: string;
  oldValue: string;
  newValue: string;
  delta: string;
  direction: 'good' | 'bad' | 'neutral';
};

type Evidence = {
  title: string;
  source: string;
  observed: string;
  trust: string;
  state: 'verified' | 'candidate' | 'stale';
};

type AlertItem = {
  id: string;
  severity: Severity;
  domain: string;
  kind: string;
  title: string;
  short: string;
  detected: string;
  verified: string;
  freshness: string;
  affected: string[];
  recommendation: string;
  reason: string;
  baselineLabel: string;
  candidateLabel: string;
  metrics: Metric[];
  evidence: Evidence[];
  actions: string[];
  rollback: string;
  confidence: string;
};

const alerts: AlertItem[] = [
  {
    id: 'ALT-LEGAL-0042',
    severity: 'critical',
    domain: 'LEGAL / PDN',
    kind: 'NEW VERSION',
    title: '152-ФЗ: обнаружена новая редакция',
    short: 'Изменение затрагивает требования, связанные с защитой персональных данных. Требуется impact review до использования новой редакции в юридически значимых выводах.',
    detected: '14.09.2026 09:18',
    verified: '14.09.2026 09:31',
    freshness: '99%',
    affected: ['12 требований', '7 контролей', '3 политики', '2 алгоритма', '17 шаблонов документов'],
    recommendation: 'Сравнить редакции и запустить impact analysis. Не продвигать изменения в canonical без review.',
    reason: 'Изменился нормативный источник с высокой юридической силой. У 12 зависимых узлов есть активные связи APPLIES_TO / REQUIRES.',
    baselineLabel: '152-ФЗ / предыдущая проверенная редакция',
    candidateLabel: '152-ФЗ / новая обнаруженная редакция',
    metrics: [
      { label: 'Юридическая актуальность', oldValue: 'VERIFIED', newValue: 'NEEDS REVIEW', delta: 'изменение', direction: 'bad' },
      { label: 'Затронутые требования', oldValue: '0', newValue: '12', delta: '+12', direction: 'bad' },
      { label: 'Источник', oldValue: 'A0', newValue: 'A0', delta: 'без изменений', direction: 'neutral' },
      { label: 'Freshness', oldValue: '0.71', newValue: '0.99', delta: '+0.28', direction: 'good' },
    ],
    evidence: [
      { title: 'Карточка текущей редакции', source: 'Official source / capture SHA-256', observed: '14.09.2026 09:18', trust: 'A0', state: 'verified' },
      { title: 'Diff структуры требований', source: 'FATHER Legal Temporal Engine', observed: '14.09.2026 09:24', trust: 'SYSTEM', state: 'candidate' },
      { title: 'Последняя acceptance-проверка зависимых controls', source: 'Review batch LEGAL-PDN-031', observed: '28.08.2026', trust: 'HUMAN', state: 'stale' },
    ],
    actions: ['Запустить impact analysis', 'Назначить юридический review', 'Заморозить auto-publish зависимых узлов'],
    rollback: 'Предыдущая редакция остаётся доступной как verified historical state.',
    confidence: '0.96',
  },
  {
    id: 'ALT-EXP-0117',
    severity: 'high',
    domain: 'RAG / PLATFORM',
    kind: 'CHALLENGER WON',
    title: 'Graph+Vector RAG обошёл текущий retrieval-v2',
    short: 'Shadow-тест показал улучшение качества, скорости и стоимости. Production не переключён.',
    detected: '14.09.2026 08:42',
    verified: '14.09.2026 09:02',
    freshness: '100%',
    affected: ['RAG pipeline', 'ALINA retrieval', 'Security KB', 'Book KB'],
    recommendation: 'Перевести challenger в canary на 10% нагрузки и собрать фактический rollback-safe telemetry.',
    reason: 'EXP-0117 завершён на 500 задачах. Challenger выиграл по composite score без провала security/traceability gates.',
    baselineLabel: 'retrieval-v2 / CHAMPION',
    candidateLabel: 'graph-vector-v3 / CHALLENGER',
    metrics: [
      { label: 'Quality', oldValue: '0.88', newValue: '0.91', delta: '+3.4%', direction: 'good' },
      { label: 'Latency', oldValue: '12.4 s', newValue: '7.1 s', delta: '-43%', direction: 'good' },
      { label: 'Cost / task', oldValue: '1.00', newValue: '0.72', delta: '-28%', direction: 'good' },
      { label: 'Failure rate', oldValue: '8.0%', newValue: '4.2%', delta: '-47%', direction: 'good' },
      { label: 'Trace completeness', oldValue: '0.94', newValue: '0.96', delta: '+2.1%', direction: 'good' },
    ],
    evidence: [
      { title: 'EXP-0117 shadow benchmark', source: 'FATHER Experiment Engine', observed: '14.09.2026 08:42', trust: 'SYSTEM', state: 'verified' },
      { title: 'Security gate result', source: 'S4 Security Reviewer', observed: '14.09.2026 08:55', trust: 'ROLE', state: 'verified' },
      { title: 'Cost projection', source: 'Telemetry / 500-run sample', observed: '14.09.2026 08:59', trust: 'SYSTEM', state: 'candidate' },
    ],
    actions: ['Запустить canary 10%', 'Зафиксировать champion baseline', 'Подготовить migration proposal'],
    rollback: 'Canary отключается одной операцией; champion retrieval-v2 остаётся неизменённым.',
    confidence: '0.91',
  },
  {
    id: 'ALT-KNOW-0088',
    severity: 'review',
    domain: 'SECURITY / STANDARD',
    kind: 'STALE VERIFICATION',
    title: 'Узел знания давно не перепроверялся',
    short: 'Знание может оставаться истинным, но его актуальность недостаточно свежая для high-impact решения.',
    detected: '14.09.2026 07:30',
    verified: '02.03.2026 16:11',
    freshness: '42%',
    affected: ['4 метода', '1 алгоритм', '9 RAG-пакетов'],
    recommendation: 'Перепроверить первичные источники и только после этого использовать узел в high-impact recommendation.',
    reason: 'Freshness упал ниже policy threshold 0.50. Истина не отозвана; статус остаётся “last known verified”.',
    baselineLabel: 'Последнее verified knowledge state',
    candidateLabel: 'Текущее состояние / requires revalidation',
    metrics: [
      { label: 'Truth confidence', oldValue: '0.94', newValue: '0.94', delta: 'не менялось', direction: 'neutral' },
      { label: 'Freshness', oldValue: '0.86', newValue: '0.42', delta: '-0.44', direction: 'bad' },
      { label: 'Primary source checks', oldValue: '3', newValue: '0 recent', delta: 'stale', direction: 'bad' },
    ],
    evidence: [
      { title: 'Previous verification packet', source: 'KB review 2026-03-02', observed: '02.03.2026', trust: 'HUMAN', state: 'verified' },
      { title: 'Freshness policy evaluation', source: 'Knowledge Watch', observed: '14.09.2026 07:30', trust: 'SYSTEM', state: 'verified' },
    ],
    actions: ['Перепроверить источники', 'Ограничить использование high-impact', 'Назначить владельца знания'],
    rollback: 'Не требуется: canonical knowledge не изменяется до revalidation.',
    confidence: '1.00',
  },
  {
    id: 'ALT-INFO-0231',
    severity: 'info',
    domain: 'KNOWLEDGE CORE',
    kind: 'NEW EVIDENCE',
    title: 'Добавлены новые подтверждающие данные',
    short: 'Новые evidence повышают confidence, но не меняют рекомендуемое действие.',
    detected: '14.09.2026 06:12',
    verified: '14.09.2026 06:18',
    freshness: '100%',
    affected: ['1 claim', '2 graph edges'],
    recommendation: 'Принять evidence в history; изменение production-поведения не требуется.',
    reason: 'Новый источник подтверждает существующую связь, уже имевшую approved status.',
    baselineLabel: 'Claim confidence v3',
    candidateLabel: 'Claim confidence v4',
    metrics: [
      { label: 'Confidence', oldValue: '0.81', newValue: '0.88', delta: '+0.07', direction: 'good' },
      { label: 'Evidence count', oldValue: '3', newValue: '4', delta: '+1', direction: 'good' },
    ],
    evidence: [
      { title: 'Independent supporting source', source: 'Source A1', observed: '14.09.2026 06:12', trust: 'A1', state: 'verified' },
    ],
    actions: ['Принять evidence', 'Оставить текущую рекомендацию'],
    rollback: 'Новая evidence-version может быть отклонена без изменения старых версий.',
    confidence: '0.88',
  },
];

const severityMeta: Record<Severity, { label: string; icon: typeof ShieldAlert }> = {
  critical: { label: 'CRITICAL', icon: Siren },
  high: { label: 'HIGH', icon: ShieldAlert },
  review: { label: 'REVIEW', icon: TriangleAlert },
  info: { label: 'INFO', icon: Info },
};

const modes: { id: Mode; label: string; description: string }[] = [
  { id: 'normal', label: 'NORMAL', description: 'Полный аналитический контекст' },
  { id: 'load', label: 'LOAD', description: 'Скрыть второстепенные детали' },
  { id: 'stress', label: 'STRESS', description: 'Только критичное и следующее действие' },
];

export default function OperatorConsolePage() {
  const [mode, setMode] = useState<Mode>('normal');
  const [selectedId, setSelectedId] = useState(alerts[0].id);
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all');
  const [panel, setPanel] = useState<Panel>('summary');
  const [query, setQuery] = useState('');
  const [decision, setDecision] = useState<Record<string, DecisionState>>({});
  const [showWhy, setShowWhy] = useState(false);

  const filtered = useMemo(() => {
    return alerts.filter((item) => {
      const severityOk = severityFilter === 'all' || item.severity === severityFilter;
      const q = query.trim().toLowerCase();
      const queryOk = !q || [item.title, item.domain, item.kind, item.id].some((value) => value.toLowerCase().includes(q));
      return severityOk && queryOk;
    });
  }, [severityFilter, query]);

  const selected = alerts.find((item) => item.id === selectedId) ?? filtered[0] ?? alerts[0];
  const selectedDecision = decision[selected.id] ?? 'open';
  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const highCount = alerts.filter((a) => a.severity === 'high').length;
  const reviewCount = alerts.filter((a) => a.severity === 'review').length;

  const visibleQueue = mode === 'stress'
    ? filtered.filter((item) => item.severity === 'critical' || item.severity === 'high').slice(0, 5)
    : mode === 'load'
      ? filtered.slice(0, 7)
      : filtered;

  const decide = (state: DecisionState) => {
    setDecision((prev) => ({ ...prev, [selected.id]: state }));
  };

  return (
    <main className={`${styles.page} ${styles[mode]}`}>
      <header className={styles.topbar}>
        <div className={styles.brandBlock}>
          <a href="/" className={styles.backLink}><ArrowLeft size={16}/> DZ-17</a>
          <div>
            <span className={styles.kicker}>FATHER KNOWLEDGE WATCH</span>
            <h1>Operator Decision Console</h1>
          </div>
        </div>
        <div className={styles.statusStrip}>
          <span><Database size={15}/> FATHER DB <b>CONNECTED</b></span>
          <span><Activity size={15}/> Watch <b>ACTIVE</b></span>
          <span><Clock3 size={15}/> Last sync <b>16:26</b></span>
        </div>
      </header>

      <section className={styles.modeBar} aria-label="Режим нагрузки оператора">
        <div>
          <span className={styles.sectionLabel}>OPERATOR LOAD MODE</span>
          <p>{modes.find((m) => m.id === mode)?.description}</p>
        </div>
        <div className={styles.modeButtons}>
          {modes.map((item) => (
            <button
              key={item.id}
              className={mode === item.id ? styles.modeActive : ''}
              onClick={() => setMode(item.id)}
              aria-pressed={mode === item.id}
            >
              {item.id === 'stress' ? <Siren size={16}/> : item.id === 'load' ? <Gauge size={16}/> : <Eye size={16}/>}
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.healthRow}>
        <button onClick={() => setSeverityFilter(severityFilter === 'critical' ? 'all' : 'critical')} className={`${styles.healthCard} ${styles.criticalCard}`}>
          <Siren/><div><strong>{criticalCount}</strong><span>Critical</span></div><small>действовать сейчас</small>
        </button>
        <button onClick={() => setSeverityFilter(severityFilter === 'high' ? 'all' : 'high')} className={`${styles.healthCard} ${styles.highCard}`}>
          <ShieldAlert/><div><strong>{highCount}</strong><span>High</span></div><small>решение требуется</small>
        </button>
        <button onClick={() => setSeverityFilter(severityFilter === 'review' ? 'all' : 'review')} className={`${styles.healthCard} ${styles.reviewCard}`}>
          <TriangleAlert/><div><strong>{reviewCount}</strong><span>Review</span></div><small>проверить</small>
        </button>
        <div className={`${styles.healthCard} ${styles.systemCard}`}>
          <ShieldCheck/><div><strong>98.7%</strong><span>Knowledge health</span></div><small>validated graph</small>
        </div>
      </section>

      <section className={styles.workspace}>
        <aside className={styles.queuePane}>
          <div className={styles.paneHeader}>
            <div>
              <span className={styles.sectionLabel}>MY ACTION QUEUE</span>
              <h2>{visibleQueue.length} событий</h2>
            </div>
            <BellRing size={20}/>
          </div>

          {mode !== 'stress' && (
            <div className={styles.searchBox}>
              <Search size={16}/>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск по алертам…"/>
            </div>
          )}

          <div className={styles.queueList}>
            {visibleQueue.map((item, index) => {
              const meta = severityMeta[item.severity];
              const Icon = meta.icon;
              const state = decision[item.id] ?? 'open';
              return (
                <button
                  key={item.id}
                  className={`${styles.alertCard} ${styles[item.severity]} ${selected.id === item.id ? styles.alertSelected : ''}`}
                  onClick={() => { setSelectedId(item.id); setPanel('summary'); setShowWhy(false); }}
                >
                  <div className={styles.alertTopline}>
                    <span className={styles.alertRank}>{String(index + 1).padStart(2, '0')}</span>
                    <span className={styles.severity}><Icon size={14}/>{meta.label}</span>
                    {state !== 'open' && <span className={styles.decisionMini}>{state.toUpperCase()}</span>}
                  </div>
                  <strong>{item.title}</strong>
                  {mode !== 'stress' && <p>{item.short}</p>}
                  <div className={styles.alertFooter}>
                    <span>{item.domain}</span>
                    <ChevronRight size={16}/>
                  </div>
                </button>
              );
            })}
            {visibleQueue.length === 0 && <div className={styles.emptyState}>По текущему фильтру событий нет.</div>}
          </div>
        </aside>

        <article className={styles.detailPane}>
          <div className={styles.detailHeader}>
            <div>
              <div className={styles.detailMeta}>
                <span className={`${styles.severityPill} ${styles[selected.severity]}`}>{severityMeta[selected.severity].label}</span>
                <span>{selected.kind}</span>
                <span>{selected.id}</span>
              </div>
              <h2>{selected.title}</h2>
              <p>{selected.short}</p>
            </div>
            <div className={styles.confidenceBox}>
              <span>CONFIDENCE</span>
              <strong>{selected.confidence}</strong>
              <small>freshness {selected.freshness}</small>
            </div>
          </div>

          <nav className={styles.tabs} aria-label="Карточка решения">
            {([
              ['summary', 'Что произошло', BellRing],
              ['compare', 'Было → стало', GitCompareArrows],
              ['evidence', 'Почему', BookOpenCheck],
              ['action', 'Что делать', PlayCircle],
            ] as const).map(([id, label, Icon]) => (
              <button key={id} className={panel === id ? styles.tabActive : ''} onClick={() => setPanel(id)}>
                <Icon size={16}/>{label}
              </button>
            ))}
          </nav>

          {panel === 'summary' && (
            <div className={styles.panelGrid}>
              <section className={styles.focusCard}>
                <span className={styles.sectionLabel}>NEXT SAFE ACTION</span>
                <h3>{selected.recommendation}</h3>
                <button className={styles.primaryAction} onClick={() => setPanel('action')}>Перейти к решению <ArrowRight size={17}/></button>
              </section>

              <section className={styles.infoCard}>
                <span className={styles.sectionLabel}>IMPACT</span>
                <h3>Что затронуто</h3>
                <div className={styles.chipList}>{selected.affected.map((item) => <span key={item}>{item}</span>)}</div>
              </section>

              {mode !== 'stress' && (
                <>
                  <section className={styles.infoCard}>
                    <span className={styles.sectionLabel}>TIMELINE</span>
                    <dl className={styles.definitionList}>
                      <div><dt>Обнаружено</dt><dd>{selected.detected}</dd></div>
                      <div><dt>Проверено</dt><dd>{selected.verified}</dd></div>
                      <div><dt>Freshness</dt><dd>{selected.freshness}</dd></div>
                    </dl>
                  </section>
                  <section className={styles.infoCard}>
                    <button className={styles.whyToggle} onClick={() => setShowWhy((v) => !v)}><CircleHelp size={17}/>Почему система подняла алерт?</button>
                    {showWhy && <p className={styles.whyText}>{selected.reason}</p>}
                  </section>
                </>
              )}
            </div>
          )}

          {panel === 'compare' && (
            <div className={styles.comparePanel}>
              <div className={styles.compareHeaders}>
                <div><span>BASELINE</span><strong>{selected.baselineLabel}</strong></div>
                <ArrowRight/>
                <div><span>CANDIDATE / NEW STATE</span><strong>{selected.candidateLabel}</strong></div>
              </div>
              <div className={styles.metricTable}>
                {selected.metrics.map((metric) => (
                  <div className={styles.metricRow} key={metric.label}>
                    <strong>{metric.label}</strong>
                    <span>{metric.oldValue}</span>
                    <ArrowRight size={16}/>
                    <span>{metric.newValue}</span>
                    <em className={styles[metric.direction]}>{metric.delta}</em>
                  </div>
                ))}
              </div>
              <div className={styles.impactBanner}>
                <BarChart3 size={22}/>
                <div><span className={styles.sectionLabel}>DECISION SIGNAL</span><strong>{selected.recommendation}</strong></div>
              </div>
            </div>
          )}

          {panel === 'evidence' && (
            <div className={styles.evidencePanel}>
              <div className={styles.evidenceIntro}>
                <BookOpenCheck/>
                <div><span className={styles.sectionLabel}>EVIDENCE CHAIN</span><h3>От решения до источника</h3><p>{selected.reason}</p></div>
              </div>
              <div className={styles.evidenceList}>
                {selected.evidence.map((item, i) => (
                  <article key={`${item.title}-${i}`}>
                    <span className={`${styles.evidenceState} ${styles[item.state]}`}>{item.state.toUpperCase()}</span>
                    <div><strong>{item.title}</strong><p>{item.source}</p></div>
                    <dl><dt>Observed</dt><dd>{item.observed}</dd><dt>Trust</dt><dd>{item.trust}</dd></dl>
                  </article>
                ))}
              </div>
              <div className={styles.graphTrace}>
                <Network size={18}/><span>SOURCE</span><ChevronRight/><span>CAPTURE</span><ChevronRight/><span>SPAN</span><ChevronRight/><span>KNOWLEDGE</span><ChevronRight/><span>NODE / EDGE</span><ChevronRight/><span>ALERT</span>
              </div>
            </div>
          )}

          {panel === 'action' && (
            <div className={styles.actionPanel}>
              <section className={styles.actionHero}>
                <span className={styles.sectionLabel}>RECOMMENDED ACTION</span>
                <h3>{selected.recommendation}</h3>
                <p>Ни одно действие прототипа не изменяет production автоматически. Здесь проверяется операторский workflow и понятность решения.</p>
              </section>

              <div className={styles.actionChecklist}>
                {selected.actions.map((action) => <div key={action}><CheckCircle2 size={18}/><span>{action}</span></div>)}
              </div>

              <div className={styles.rollbackCard}>
                <RotateCcw size={19}/><div><strong>Rollback / безопасный возврат</strong><p>{selected.rollback}</p></div>
              </div>

              <div className={styles.decisionBox}>
                <span className={styles.sectionLabel}>OPERATOR DECISION</span>
                <div className={styles.decisionButtons}>
                  <button className={styles.acceptButton} onClick={() => decide('accepted')}><CheckCircle2/>Принять следующий шаг</button>
                  <button className={styles.deferButton} onClick={() => decide('deferred')}><PauseCircle/>Отложить</button>
                  <button className={styles.rejectButton} onClick={() => decide('rejected')}><XCircle/>Отклонить</button>
                </div>
                {selectedDecision !== 'open' && (
                  <div className={`${styles.decisionResult} ${styles[selectedDecision]}`}>
                    <ShieldCheck size={18}/>
                    <span>Решение оператора: <strong>{selectedDecision.toUpperCase()}</strong>. В production ничего не применено; событие готово к журналированию.</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </article>
      </section>

      <footer className={styles.footerBar}>
        <span><ShieldCheck size={15}/> Safe prototype: no production writes</span>
        <span><History size={15}/> Every decision → audit event</span>
        <span><FlaskConical size={15}/> Ready for operator A/B usability tests</span>
        <span><TimerReset size={15}/> Target: 3s detect · 10s understand · 30s act</span>
      </footer>
    </main>
  );
}
