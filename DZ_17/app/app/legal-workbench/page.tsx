'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Boxes,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  FileText,
  GitCompareArrows,
  History,
  Link2,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
} from 'lucide-react';
import styles from './legal-workbench.module.css';

type WorkTab = 'analysis' | 'duties' | 'checklist' | 'templates' | 'graph' | 'history';

type NavDoc = {
  id: string;
  title: string;
  status: 'Актуален' | 'Нужна проверка' | 'Исторический';
};

type NavGroup = {
  id: string;
  title: string;
  docs: NavDoc[];
};

const groups: NavGroup[] = [
  {
    id: 'pdn',
    title: 'Персональные данные',
    docs: [
      { id: '152fz', title: '152-ФЗ «О персональных данных»', status: 'Актуален' },
      { id: '1119', title: 'ПП РФ №1119', status: 'Актуален' },
      { id: 'fstec21', title: 'Приказ ФСТЭК №21', status: 'Актуален' },
      { id: 'fsb378', title: 'Приказ ФСБ №378', status: 'Актуален' },
    ],
  },
  {
    id: 'kii',
    title: 'Критическая информационная инфраструктура',
    docs: [
      { id: '187fz', title: '187-ФЗ «О безопасности КИИ»', status: 'Актуален' },
      { id: 'pp127', title: 'ПП РФ №127', status: 'Актуален' },
      { id: 'fstec235', title: 'Приказ ФСТЭК №235', status: 'Актуален' },
      { id: 'fstec239', title: 'Приказ ФСТЭК №239', status: 'Актуален' },
    ],
  },
  {
    id: 'health',
    title: 'Здравоохранение и медицинские ИС',
    docs: [
      { id: '323fz', title: '323-ФЗ «Об основах охраны здоровья»', status: 'Нужна проверка' },
      { id: 'emis', title: 'Нормативный контур ЕГИСЗ / ЕМИАС', status: 'Нужна проверка' },
    ],
  },
  {
    id: 'security',
    title: 'Информационная безопасность',
    docs: [
      { id: 'fstec17', title: 'Приказ ФСТЭК №17', status: 'Актуален' },
      { id: 'fstec239b', title: 'Требования по защите значимых объектов КИИ', status: 'Актуален' },
      { id: 'internal', title: 'Внутренние политики и регламенты', status: 'Нужна проверка' },
    ],
  },
  {
    id: 'standards',
    title: 'ГОСТ, методики и стандарты',
    docs: [
      { id: 'iso27001', title: 'ISO/IEC 27001 / сопоставление контролей', status: 'Актуален' },
      { id: 'gostmeta', title: 'ГОСТ — метаданные и статусы', status: 'Нужна проверка' },
    ],
  },
];

const demoParagraphs = [
  {
    id: 'art18-1',
    heading: 'Статья 18. Обязанности оператора при сборе персональных данных',
    text: 'Демонстрационный фрагмент. В рабочем режиме здесь отображается канонический текст выбранной редакции документа из FATHER Knowledge Core с точной ссылкой на источник, датой проверки и историей изменений.',
  },
  {
    id: 'art19-1',
    heading: 'Статья 19. Меры по обеспечению безопасности персональных данных',
    text: 'Демонстрационный фрагмент. Выбранная норма должна быть связана с конкретными требованиями, мерами защиты, ответственными ролями, внутренними документами, контролями исполнения и доказательствами выполнения.',
  },
  {
    id: 'art22-1',
    heading: 'Статья 22. Уведомление об обработке персональных данных',
    text: 'Демонстрационный фрагмент. Для каждой нормы система хранит применимость, сроки, исключения, связанные обязанности, риск неисполнения и состояние проверки актуальности.',
  },
];

const tabMeta: Record<WorkTab, { label: string; icon: typeof Sparkles }> = {
  analysis: { label: 'Анализ', icon: Sparkles },
  duties: { label: 'Обязанности', icon: UserRoundCheck },
  checklist: { label: 'Чек-лист', icon: ClipboardCheck },
  templates: { label: 'Образцы', icon: FileCheck2 },
  graph: { label: 'Связи', icon: Network },
  history: { label: 'Редакции', icon: History },
};

export default function LegalWorkbenchPage() {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ pdn: true, kii: true });
  const [selectedDoc, setSelectedDoc] = useState('152fz');
  const [selectedParagraph, setSelectedParagraph] = useState('art19-1');
  const [tab, setTab] = useState<WorkTab>('analysis');
  const [query, setQuery] = useState('');

  const visibleGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((group) => ({
        ...group,
        docs: group.docs.filter((doc) => `${group.title} ${doc.title}`.toLowerCase().includes(q)),
      }))
      .filter((group) => group.docs.length > 0 || group.title.toLowerCase().includes(q));
  }, [query]);

  const selected = groups.flatMap((group) => group.docs).find((doc) => doc.id === selectedDoc) ?? groups[0].docs[0];
  const paragraph = demoParagraphs.find((item) => item.id === selectedParagraph) ?? demoParagraphs[1];

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <a href="/operator-console" className={styles.back}><ChevronLeft size={17}/> Пульт оператора</a>
          <div>
            <span>FATHER / НОРМАТИВНЫЙ НАВИГАТОР</span>
            <h1>Рабочее место юриста и технического специалиста</h1>
          </div>
        </div>
        <div className={styles.topActions}>
          <button><GitCompareArrows size={16}/> Сравнить редакции</button>
          <button className={styles.primary}><ShieldCheck size={16}/> Проверить актуальность</button>
        </div>
      </header>

      <section className={styles.statusbar}>
        <span className={styles.ok}><CheckCircle2 size={15}/> Документ: <b>актуален по последней проверке</b></span>
        <span><Clock3 size={15}/> Проверено: <b>14.09.2026 18:40</b></span>
        <span><Link2 size={15}/> Источник: <b>A0 / официальный</b></span>
        <span><BookOpen size={15}/> Режим: <b>демо структуры</b></span>
      </section>

      <section className={`${styles.workspace} ${leftOpen ? '' : styles.leftClosed} ${rightOpen ? '' : styles.rightClosed}`}>
        <aside className={styles.navigator}>
          <div className={styles.navigatorHeader}>
            <div>
              <span className={styles.eyebrow}>СПЕЦИАЛЬНОСТИ И РАЗДЕЛЫ</span>
              <h2>Нормативная база</h2>
            </div>
            <button className={styles.iconButton} onClick={() => setLeftOpen(false)} title="Свернуть навигацию"><PanelLeftClose size={18}/></button>
          </div>

          <div className={styles.searchBox}>
            <Search size={16}/>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Закон, приказ, тема…"/>
          </div>

          <div className={styles.tree}>
            {visibleGroups.map((group) => {
              const isOpen = expanded[group.id] ?? false;
              return (
                <section key={group.id} className={styles.treeGroup}>
                  <button className={styles.groupButton} onClick={() => setExpanded((prev) => ({ ...prev, [group.id]: !isOpen }))}>
                    <BriefcaseBusiness size={17}/><span>{group.title}</span>{isOpen ? <ChevronUp size={15}/> : <ChevronDown size={15}/>}
                  </button>
                  {isOpen && (
                    <div className={styles.docList}>
                      {group.docs.map((doc) => (
                        <button
                          key={doc.id}
                          className={selectedDoc === doc.id ? styles.docActive : ''}
                          onClick={() => setSelectedDoc(doc.id)}
                        >
                          <FileText size={15}/>
                          <div><strong>{doc.title}</strong><small className={doc.status === 'Актуален' ? styles.docOk : styles.docWarn}>{doc.status}</small></div>
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </aside>

        {!leftOpen && (
          <button className={`${styles.edgeButton} ${styles.edgeLeft}`} onClick={() => setLeftOpen(true)} title="Открыть нормативную базу"><PanelLeftOpen size={18}/></button>
        )}

        <article className={styles.documentPane}>
          <div className={styles.documentHeader}>
            <div>
              <span className={styles.eyebrow}>ТЕКУЩИЙ ДОКУМЕНТ</span>
              <h2>{selected.title}</h2>
              <p>Редакция на выбранную дату · канонический источник · история редакций сохранена</p>
            </div>
            <div className={styles.documentBadges}>
              <span className={styles.actual}>{selected.status}</span>
              <span>Версия: текущая</span>
              <span>На дату: 14.09.2026</span>
            </div>
          </div>

          <div className={styles.documentTools}>
            <button>Оглавление</button>
            <button>Найти в тексте</button>
            <button>Показать изменения</button>
            <button>Сохранить заметку</button>
          </div>

          <div className={styles.demoNotice}>
            <AlertTriangle size={18}/>
            <div><strong>Прототип интерфейса.</strong><span>Ниже демонстрационные фрагменты. В рабочей версии центр показывает полный проверенный текст из FATHER Knowledge Core, а не вручную зашитый текст.</span></div>
          </div>

          <div className={styles.documentBody}>
            <h3>Федеральный закон / рабочее представление</h3>
            <p className={styles.lead}>Нажмите на норму: правая панель сразу покажет смысл, обязанности, ответственных, подтверждения исполнения и связанные документы.</p>
            {demoParagraphs.map((item) => (
              <section
                key={item.id}
                className={`${styles.paragraph} ${selectedParagraph === item.id ? styles.paragraphActive : ''}`}
                onClick={() => setSelectedParagraph(item.id)}
              >
                <div className={styles.paragraphMarker}>{selectedParagraph === item.id ? 'ВЫБРАНО' : 'НОРМА'}</div>
                <h4>{item.heading}</h4>
                <p>{item.text}</p>
                <div className={styles.paragraphMeta}><span>Источник: канонический документ</span><span>Статус связи: подтверждена</span><span>Узлы графа: 18</span></div>
              </section>
            ))}
          </div>
        </article>

        {!rightOpen && (
          <button className={`${styles.edgeButton} ${styles.edgeRight}`} onClick={() => setRightOpen(true)} title="Открыть рабочую панель"><Boxes size={18}/></button>
        )}

        <aside className={styles.workPane}>
          <div className={styles.workHeader}>
            <div>
              <span className={styles.eyebrow}>РАБОТА С НОРМОЙ</span>
              <h2>{paragraph.heading}</h2>
            </div>
            <button className={styles.iconButton} onClick={() => setRightOpen(false)} title="Свернуть рабочую панель"><ChevronRight size={18}/></button>
          </div>

          <nav className={styles.tabs}>
            {(Object.entries(tabMeta) as [WorkTab, { label: string; icon: typeof Sparkles }][]).map(([id, meta]) => {
              const Icon = meta.icon;
              return <button key={id} className={tab === id ? styles.tabActive : ''} onClick={() => setTab(id)}><Icon size={15}/>{meta.label}</button>;
            })}
          </nav>

          <div className={styles.workBody}>
            {tab === 'analysis' && <AnalysisTab/>}
            {tab === 'duties' && <DutiesTab/>}
            {tab === 'checklist' && <ChecklistTab/>}
            {tab === 'templates' && <TemplatesTab/>}
            {tab === 'graph' && <GraphTab/>}
            {tab === 'history' && <HistoryTab/>}
          </div>
        </aside>
      </section>
    </main>
  );
}

function AnalysisTab() {
  return <>
    <section className={styles.workCard}><span className={styles.cardLabel}>ПРОСТЫМИ СЛОВАМИ</span><h3>Что требует эта норма</h3><p>Организация должна не только формально иметь меры защиты, но и уметь доказать, что они определены, внедрены, назначены ответственным и реально контролируются.</p></section>
    <section className={styles.workCard}><span className={styles.cardLabel}>ПРИМЕНИМОСТЬ</span><div className={styles.tagRow}><span>Оператор ПДн</span><span>Медицинская ИС</span><span>ИБ-подразделение</span><span>ИТ-эксплуатация</span></div></section>
    <section className={styles.workCard}><span className={styles.cardLabel}>РИСК</span><div className={styles.riskLine}><b>Высокий</b><span>если мера отсутствует или её исполнение нельзя подтвердить</span></div></section>
  </>;
}

function DutiesTab() {
  return <div className={styles.roleList}>
    <article><UserRoundCheck/><div><strong>Ответственный за организацию обработки ПДн</strong><p>Контролирует организационные меры, документы, назначение ролей и подтверждение исполнения.</p><small>Основание: выбранная норма + внутренний приказ о назначении</small></div></article>
    <article><ShieldCheck/><div><strong>Специалист по информационной безопасности</strong><p>Формирует требования к защите, контролирует реализацию мер и собирает доказательства выполнения.</p><small>Должностная обязанность: контроль соблюдения требований ИБ</small></div></article>
    <article><BriefcaseBusiness/><div><strong>Владелец информационной системы</strong><p>Обеспечивает выполнение требований в конкретной системе и устранение выявленных несоответствий.</p><small>Ответственность: в пределах полномочий и закреплённых функций</small></div></article>
  </div>;
}

function ChecklistTab() {
  const items = ['Назначен ответственный', 'Определены категории данных и субъектов', 'Определён уровень защищённости', 'Сформирована модель угроз', 'Меры защиты сопоставлены требованиям', 'Есть подтверждения внедрения', 'Проводится периодическая проверка'];
  return <div className={styles.checkList}>{items.map((item, i) => <label key={item}><input type="checkbox" defaultChecked={i < 3}/><span>{item}</span><small>{i < 3 ? 'подтверждено' : 'требует проверки'}</small></label>)}</div>;
}

function TemplatesTab() {
  return <div className={styles.templateList}>
    {['Приказ о назначении ответственного', 'Политика обработки персональных данных', 'Перечень информационных систем ПДн', 'Акт оценки применимости требований', 'Чек-лист внутреннего контроля', 'План устранения несоответствий'].map((item) => <button key={item}><FileCheck2 size={17}/><span>{item}</span><ChevronRight size={15}/></button>)}
  </div>;
}

function GraphTab() {
  return <div className={styles.graphBox}>
    <div className={styles.graphNodePrimary}>Статья 19</div>
    <div className={styles.graphArrow}>↓</div>
    <div className={styles.graphGrid}><span>ПП РФ №1119</span><span>ФСТЭК №21</span><span>ФСБ №378</span><span>Внутренние меры</span></div>
    <div className={styles.graphArrow}>↓</div>
    <div className={styles.graphGrid}><span>Контроли</span><span>Системы</span><span>Ответственные</span><span>Документы</span></div>
    <button className={styles.graphButton}><Network size={16}/> Открыть полный граф зависимостей</button>
  </div>;
}

function HistoryTab() {
  return <div className={styles.historyList}>
    <article><span>14.09.2026</span><div><strong>Последняя проверка актуальности</strong><p>Статус подтверждён по источнику уровня A0.</p></div></article>
    <article><span>28.08.2026</span><div><strong>Проверены зависимые меры</strong><p>Сопоставление с контролями сохранено в истории.</p></div></article>
    <article><span>История</span><div><strong>Все предыдущие редакции сохраняются</strong><p>Можно открыть состояние нормы на любую контрольную дату.</p></div></article>
  </div>;
}
