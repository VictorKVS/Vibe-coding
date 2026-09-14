'use client';

import { useMemo, useState } from 'react';
import {
  Activity,
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
    domain: 'ЗАКОНОДАТЕЛЬСТВО / ПДн',
    kind: 'НОВАЯ РЕДАКЦИЯ',
    title: '152-ФЗ: обнаружена новая редакция',
    short: 'Изменение затрагивает требования по защите персональных данных. До юридически значимого использования новой редакции нужно проверить влияние изменений.',
    detected: '14.09.2026 09:18',
    verified: '14.09.2026 09:31',
    freshness: '99%',
    affected: ['12 требований', '7 мер защиты', '3 политики', '2 алгоритма', '17 шаблонов документов'],
    recommendation: 'Сравнить редакции, оценить влияние и назначить юридическую проверку. Автоматическое принятие изменений заблокировать.',
    reason: 'Изменился нормативный источник высокой юридической силы. С ним связаны 12 действующих требований и зависимые меры защиты.',
    baselineLabel: '152-ФЗ / предыдущая проверенная редакция',
    candidateLabel: '152-ФЗ / новая обнаруженная редакция',
    metrics: [
      { label: 'Юридическая актуальность', oldValue: 'ПОДТВЕРЖДЕНА', newValue: 'НУЖНА ПРОВЕРКА', delta: 'изменение', direction: 'bad' },
      { label: 'Затронутые требования', oldValue: '0', newValue: '12', delta: '+12', direction: 'bad' },
      { label: 'Уровень источника', oldValue: 'A0', newValue: 'A0', delta: 'без изменений', direction: 'neutral' },
      { label: 'Свежесть проверки', oldValue: '0.71', newValue: '0.99', delta: '+0.28', direction: 'good' },
    ],
    evidence: [
      { title: 'Карточка действующей редакции', source: 'Официальный источник / контрольная сумма SHA-256', observed: '14.09.2026 09:18', trust: 'A0', state: 'verified' },
      { title: 'Сравнение структуры требований', source: 'Модуль контроля редакций FATHER', observed: '14.09.2026 09:24', trust: 'СИСТЕМА', state: 'candidate' },
      { title: 'Последняя проверка зависимых мер защиты', source: 'Пакет проверки LEGAL-PDN-031', observed: '28.08.2026', trust: 'ЭКСПЕРТ', state: 'stale' },
    ],
    actions: ['Запустить оценку влияния', 'Назначить юридическую проверку', 'Заморозить автоматическую публикацию зависимых узлов'],
    rollback: 'Предыдущая редакция остаётся доступной как подтверждённое историческое состояние.',
    confidence: '0.96',
  },
  {
    id: 'ALT-EXP-0117',
    severity: 'high',
    domain: 'ПОИСК ЗНАНИЙ / ПЛАТФОРМА',
    kind: 'НОВЫЙ ВАРИАНТ ЛУЧШЕ',
    title: 'Графовый и векторный поиск обошёл текущий вариант',
    short: 'Теневой тест показал улучшение качества, скорости и стоимости. Рабочая система пока не переключена.',
    detected: '14.09.2026 08:42',
    verified: '14.09.2026 09:02',
    freshness: '100%',
    affected: ['Контур поиска знаний', 'Поиск Алины', 'База знаний ИБ', 'Книжная база знаний'],
    recommendation: 'Включить новый вариант на 10% нагрузки, собрать фактическую телеметрию и сохранить возможность быстрого возврата.',
    reason: 'Эксперимент EXP-0117 завершён на 500 задачах. Новый вариант лучше по сводной оценке и не провалил проверки безопасности и трассируемости.',
    baselineLabel: 'Текущий рабочий вариант / основной',
    candidateLabel: 'Графовый + векторный поиск / новый вариант',
    metrics: [
      { label: 'Качество', oldValue: '0.88', newValue: '0.91', delta: '+3.4%', direction: 'good' },
      { label: 'Задержка', oldValue: '12.4 с', newValue: '7.1 с', delta: '-43%', direction: 'good' },
      { label: 'Стоимость задачи', oldValue: '1.00', newValue: '0.72', delta: '-28%', direction: 'good' },
      { label: 'Доля ошибок', oldValue: '8.0%', newValue: '4.2%', delta: '-47%', direction: 'good' },
      { label: 'Полнота трассировки', oldValue: '0.94', newValue: '0.96', delta: '+2.1%', direction: 'good' },
    ],
    evidence: [
      { title: 'Теневой тест EXP-0117', source: 'Контур экспериментов FATHER', observed: '14.09.2026 08:42', trust: 'СИСТЕМА', state: 'verified' },
      { title: 'Результат проверки безопасности', source: 'Роль S4 — проверка безопасности', observed: '14.09.2026 08:55', trust: 'РОЛЬ', state: 'verified' },
      { title: 'Расчёт стоимости', source: 'Телеметрия по 500 запускам', observed: '14.09.2026 08:59', trust: 'СИСТЕМА', state: 'candidate' },
    ],
    actions: ['Запустить ограниченное внедрение на 10%', 'Зафиксировать текущий вариант как точку возврата', 'Подготовить план перехода'],
    rollback: 'Ограниченное внедрение отключается одной операцией; текущий рабочий вариант остаётся неизменным.',
    confidence: '0.91',
  },
  {
    id: 'ALT-KNOW-0088',
    severity: 'review',
    domain: 'ИНФОРМАЦИОННАЯ БЕЗОПАСНОСТЬ / СТАНДАРТ',
    kind: 'ПРОВЕРКА УСТАРЕЛА',
    title: 'Узел знания давно не перепроверялся',
    short: 'Знание может оставаться истинным, но подтверждение его актуальности уже недостаточно свежее для важного решения.',
    detected: '14.09.2026 07:30',
    verified: '02.03.2026 16:11',
    freshness: '42%',
    affected: ['4 метода', '1 алгоритм', '9 пакетов поиска знаний'],
    recommendation: 'Перепроверить первичные источники и только после этого использовать узел для решения с высокими последствиями.',
    reason: 'Свежесть проверки упала ниже порога 0.50. Истинность знания не отменена: это последнее известное подтверждённое состояние.',
    baselineLabel: 'Последнее подтверждённое состояние знания',
    candidateLabel: 'Текущее состояние / требуется повторная проверка',
    metrics: [
      { label: 'Уверенность в истинности', oldValue: '0.94', newValue: '0.94', delta: 'не менялась', direction: 'neutral' },
      { label: 'Свежесть проверки', oldValue: '0.86', newValue: '0.42', delta: '-0.44', direction: 'bad' },
      { label: 'Недавние проверки первичных источников', oldValue: '3', newValue: '0', delta: 'устарело', direction: 'bad' },
    ],
    evidence: [
      { title: 'Предыдущий пакет проверки', source: 'Проверка базы знаний от 02.03.2026', observed: '02.03.2026', trust: 'ЭКСПЕРТ', state: 'verified' },
      { title: 'Оценка свежести', source: 'Контроль актуальности знаний', observed: '14.09.2026 07:30', trust: 'СИСТЕМА', state: 'verified' },
    ],
    actions: ['Перепроверить первичные источники', 'Ограничить использование для критичных решений', 'Назначить владельца знания'],
    rollback: 'Не требуется: основное знание не меняется до повторной проверки.',
    confidence: '1.00',
  },
  {
    id: 'ALT-INFO-0231',
    severity: 'info',
    domain: 'ЯДРО ЗНАНИЙ',
    kind: 'НОВОЕ ПОДТВЕРЖДЕНИЕ',
    title: 'Добавлены новые подтверждающие данные',
    short: 'Новый источник повышает уверенность в знании, но не меняет рекомендуемое действие.',
    detected: '14.09.2026 06:12',
    verified: '14.09.2026 06:18',
    freshness: '100%',
    affected: ['1 утверждение', '2 связи графа'],
    recommendation: 'Добавить подтверждение в историю. Изменение рабочего поведения не требуется.',
    reason: 'Новый независимый источник подтверждает существующую связь, которая уже была одобрена.',
    baselineLabel: 'Уверенность в утверждении / версия 3',
    candidateLabel: 'Уверенность в утверждении / версия 4',
    metrics: [
      { label: 'Уверенность', oldValue: '0.81', newValue: '0.88', delta: '+0.07', direction: 'good' },
      { label: 'Количество подтверждений', oldValue: '3', newValue: '4', delta: '+1', direction: 'good' },
    ],
    evidence: [
      { title: 'Независимый подтверждающий источник', source: 'Источник уровня A1', observed: '14.09.2026 06:12', trust: 'A1', state: 'verified' },
    ],
    actions: ['Принять новое подтверждение', 'Оставить текущую рекомендацию'],
    rollback: 'Новую версию подтверждения можно отклонить без изменения прежних версий.',
    confidence: '0.88',
  },
];

const severityMeta: Record<Severity, { label: string; icon: typeof ShieldAlert }> = {
  critical: { label: 'КРИТИЧНО', icon: Siren },
  high: { label: 'ВЫСОКИЙ', icon: ShieldAlert },
  review: { label: 'ПРОВЕРИТЬ', icon: TriangleAlert },
  info: { label: 'ИНФОРМАЦИЯ', icon: Info },
};

const modes: { id: Mode; label: string; description: string }[] = [
  { id: 'normal', label: 'ОБЫЧНЫЙ', description: 'Полный аналитический контекст' },
  { id: 'load', label: 'НАГРУЗКА', description: 'Скрыты второстепенные детали' },
  { id: 'stress', label: 'СТРЕСС', description: 'Только критичное и следующее безопасное действие' },
];

const decisionLabels: Record<DecisionState, string> = {
  open: 'ОТКРЫТО',
  accepted: 'ПРИНЯТО',
  deferred: 'ОТЛОЖЕНО',
  rejected: 'ОТКЛОНЕНО',
};

const evidenceLabels: Record<Evidence['state'], string> = {
  verified: 'ПОДТВЕРЖДЕНО',
  candidate: 'ТРЕБУЕТ ПРОВЕРКИ',
  stale: 'УСТАРЕЛО',
};

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
            <span className={styles.kicker}>FATHER — КОНТРОЛЬ ЗНАНИЙ</span>
            <h1>Пульт решений оператора</h1>
          </div>
        </div>
        <div className={styles.statusStrip}>
          <span><Database size={15}/> База FATHER <b>ПОДКЛЮЧЕНА</b></span>
          <span><Activity size={15}/> Контроль изменений <b>АКТИВЕН</b></span>
          <span><Clock3 size={15}/> Последняя синхронизация <b>16:26</b></span>
        </div>
      </header>

      <section className={styles.modeBar} aria-label="Режим нагрузки оператора">
        <div>
          <span className={styles.sectionLabel}>РЕЖИМ РАБОТЫ ОПЕРАТОРА</span>
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
          <Siren/><div><strong>{criticalCount}</strong><span>Критично</span></div><small>действовать сейчас</small>
        </button>
        <button onClick={() => setSeverityFilter(severityFilter === 'high' ? 'all' : 'high')} className={`${styles.healthCard} ${styles.highCard}`}>
          <ShieldAlert/><div><strong>{highCount}</strong><span>Высокий</span></div><small>нужно решение</small>
        </button>
        <button onClick={() => setSeverityFilter(severityFilter === 'review' ? 'all' : 'review')} className={`${styles.healthCard} ${styles.reviewCard}`}>
          <TriangleAlert/><div><strong>{reviewCount}</strong><span>Проверить</span></div><small>требует внимания</small>
        </button>
        <div className={`${styles.healthCard} ${styles.systemCard}`}>
          <ShieldCheck/><div><strong>98.7%</strong><span>Состояние знаний</span></div><small>проверенный граф</small>
        </div>
      </section>

      <section className={styles.workspace}>
        <aside className={styles.queuePane}>
          <div className={styles.paneHeader}>
            <div>
              <span className={styles.sectionLabel}>МОЯ ОЧЕРЕДЬ РЕШЕНИЙ</span>
              <h2>{visibleQueue.length} событий</h2>
            </div>
            <BellRing size={20}/>
          </div>

          {mode !== 'stress' && (
            <div className={styles.searchBox}>
              <Search size={16}/>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск по событиям…"/>
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
                    {state !== 'open' && <span className={styles.decisionMini}>{decisionLabels[state]}</span>}
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
              <span>УВЕРЕННОСТЬ</span>
              <strong>{selected.confidence}</strong>
              <small>актуальность {selected.freshness}</small>
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
                <span className={styles.sectionLabel}>СЛЕДУЮЩЕЕ БЕЗОПАСНОЕ ДЕЙСТВИЕ</span>
                <h3>{selected.recommendation}</h3>
                <button className={styles.primaryAction} onClick={() => setPanel('action')}>Перейти к решению <ArrowRight size={17}/></button>
              </section>

              <section className={styles.infoCard}>
                <span className={styles.sectionLabel}>ВЛИЯНИЕ</span>
                <h3>Что затронуто</h3>
                <div className={styles.chipList}>{selected.affected.map((item) => <span key={item}>{item}</span>)}</div>
              </section>

              {mode !== 'stress' && (
                <>
                  <section className={styles.infoCard}>
                    <span className={styles.sectionLabel}>ХРОНОЛОГИЯ</span>
                    <dl className={styles.definitionList}>
                      <div><dt>Обнаружено</dt><dd>{selected.detected}</dd></div>
                      <div><dt>Проверено</dt><dd>{selected.verified}</dd></div>
                      <div><dt>Актуальность</dt><dd>{selected.freshness}</dd></div>
                    </dl>
                  </section>
                  <section className={styles.infoCard}>
                    <button className={styles.whyToggle} onClick={() => setShowWhy((v) => !v)}><CircleHelp size={17}/>Почему система подняла предупреждение?</button>
                    {showWhy && <p className={styles.whyText}>{selected.reason}</p>}
                  </section>
                </>
              )}
            </div>
          )}

          {panel === 'compare' && (
            <div className={styles.comparePanel}>
              <div className={styles.compareHeaders}>
                <div><span>БЫЛО</span><strong>{selected.baselineLabel}</strong></div>
                <ArrowRight/>
                <div><span>СТАЛО / НОВОЕ СОСТОЯНИЕ</span><strong>{selected.candidateLabel}</strong></div>
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
                <div><span className={styles.sectionLabel}>СИГНАЛ ДЛЯ РЕШЕНИЯ</span><strong>{selected.recommendation}</strong></div>
              </div>
            </div>
          )}

          {panel === 'evidence' && (
            <div className={styles.evidencePanel}>
              <div className={styles.evidenceIntro}>
                <BookOpenCheck/>
                <div><span className={styles.sectionLabel}>ЦЕПОЧКА ДОКАЗАТЕЛЬСТВ</span><h3>От решения до первичного источника</h3><p>{selected.reason}</p></div>
              </div>
              <div className={styles.evidenceList}>
                {selected.evidence.map((item, i) => (
                  <article key={`${item.title}-${i}`}>
                    <span className={`${styles.evidenceState} ${styles[item.state]}`}>{evidenceLabels[item.state]}</span>
                    <div><strong>{item.title}</strong><p>{item.source}</p></div>
                    <dl><dt>Зафиксировано</dt><dd>{item.observed}</dd><dt>Доверие</dt><dd>{item.trust}</dd></dl>
                  </article>
                ))}
              </div>
              <div className={styles.graphTrace}>
                <Network size={18}/><span>ИСТОЧНИК</span><ChevronRight/><span>КОПИЯ</span><ChevronRight/><span>ФРАГМЕНТ</span><ChevronRight/><span>ЗНАНИЕ</span><ChevronRight/><span>УЗЕЛ / СВЯЗЬ</span><ChevronRight/><span>ПРЕДУПРЕЖДЕНИЕ</span>
              </div>
            </div>
          )}

          {panel === 'action' && (
            <div className={styles.actionPanel}>
              <section className={styles.actionHero}>
                <span className={styles.sectionLabel}>РЕКОМЕНДУЕМОЕ ДЕЙСТВИЕ</span>
                <h3>{selected.recommendation}</h3>
                <p>Ни одно действие прототипа не меняет рабочую систему автоматически. Здесь проверяется понятность операторского решения.</p>
              </section>

              <div className={styles.actionChecklist}>
                {selected.actions.map((action) => <div key={action}><CheckCircle2 size={18}/><span>{action}</span></div>)}
              </div>

              <div className={styles.rollbackCard}>
                <RotateCcw size={19}/><div><strong>Безопасный возврат</strong><p>{selected.rollback}</p></div>
              </div>

              <div className={styles.decisionBox}>
                <span className={styles.sectionLabel}>РЕШЕНИЕ ОПЕРАТОРА</span>
                <div className={styles.decisionButtons}>
                  <button className={styles.acceptButton} onClick={() => decide('accepted')}><CheckCircle2/>Принять следующий шаг</button>
                  <button className={styles.deferButton} onClick={() => decide('deferred')}><PauseCircle/>Отложить</button>
                  <button className={styles.rejectButton} onClick={() => decide('rejected')}><XCircle/>Отклонить</button>
                </div>
                {selectedDecision !== 'open' && (
                  <div className={`${styles.decisionResult} ${styles[selectedDecision]}`}>
                    <ShieldCheck size={18}/>
                    <span>Решение оператора: <strong>{decisionLabels[selectedDecision]}</strong>. В рабочую систему ничего не применено; событие готово к журналированию.</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </article>
      </section>

      <footer className={styles.footerBar}>
        <span><ShieldCheck size={15}/> Безопасный прототип: запись в рабочую систему отключена</span>
        <span><History size={15}/> Каждое решение → запись в журнал</span>
        <span><FlaskConical size={15}/> Готово к сравнительным тестам интерфейса</span>
        <span><TimerReset size={15}/> Цель: 3 с заметить · 10 с понять · 30 с решить</span>
      </footer>
    </main>
  );
}
