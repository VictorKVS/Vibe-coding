'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowDown, ArrowUp, BookOpen, Boxes, BriefcaseBusiness,
  CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp,
  ClipboardCheck, Clock3, FileCheck2, FileText, GitCompareArrows, History,
  Link2, Network, PanelLeftClose, PanelLeftOpen, Search, ShieldCheck,
  Sparkles, UserRoundCheck, StickyNote, Tag, Plus, X,
} from 'lucide-react';
import styles from './legal-workbench.module.css';

type WorkTab = 'analysis' | 'duties' | 'checklist' | 'templates' | 'notes' | 'graph' | 'history';
type ChangeKind = 'changed' | 'added' | 'future' | 'repealed';
type AnnotationTag = 'Важно' | 'Проверить' | 'Выполнить' | 'Вопрос';
type RelationType = 'Связан с' | 'Уточняет' | 'Исполняет' | 'Основан на' | 'Противоречит';

type NavDoc = { id: string; title: string; status: 'Актуален' | 'Нужна проверка' | 'Исторический' };
type NavGroup = { id: string; title: string; docs: NavDoc[] };
type ChangeNote = { number: number; kind: ChangeKind; label: string; date: string; act: string; previous: string; effect: string };
type TextBlock = { id: string; text: string; change?: ChangeNote };
type DocumentSection = { id: string; heading: string; blocks: TextBlock[] };
type Annotation = { note: string; tags: AnnotationTag[] };
type DocLink = { id: string; documentId: string; documentTitle: string; relation: RelationType };

const groups: NavGroup[] = [
  { id:'pdn', title:'Персональные данные', docs:[
    {id:'152fz',title:'152-ФЗ «О персональных данных»',status:'Актуален'},
    {id:'1119',title:'ПП РФ №1119',status:'Актуален'},
    {id:'fstec21',title:'Приказ ФСТЭК №21',status:'Актуален'},
    {id:'fsb378',title:'Приказ ФСБ №378',status:'Актуален'}]},
  { id:'kii', title:'Критическая информационная инфраструктура', docs:[
    {id:'187fz',title:'187-ФЗ «О безопасности КИИ»',status:'Актуален'},
    {id:'pp127',title:'ПП РФ №127',status:'Актуален'},
    {id:'fstec235',title:'Приказ ФСТЭК №235',status:'Актуален'},
    {id:'fstec239',title:'Приказ ФСТЭК №239',status:'Актуален'}]},
  { id:'health', title:'Здравоохранение и медицинские ИС', docs:[
    {id:'323fz',title:'323-ФЗ «Об основах охраны здоровья»',status:'Нужна проверка'},
    {id:'emis',title:'Нормативный контур ЕГИСЗ / ЕМИАС',status:'Нужна проверка'}]},
  { id:'security', title:'Информационная безопасность', docs:[
    {id:'fstec17',title:'Приказ ФСТЭК №17',status:'Актуален'},
    {id:'fstec239b',title:'Требования по защите значимых объектов КИИ',status:'Актуален'},
    {id:'internal',title:'Внутренние политики и регламенты',status:'Нужна проверка'}]},
  { id:'standards', title:'ГОСТ, методики и стандарты', docs:[
    {id:'iso27001',title:'ISO/IEC 27001 / сопоставление контролей',status:'Актуален'},
    {id:'gostmeta',title:'ГОСТ — метаданные и статусы',status:'Нужна проверка'}]},
];

const documentSections: DocumentSection[] = [
  { id:'intro', heading:'Федеральный закон / демонстрационное представление структуры документа', blocks:[
    {id:'intro-1',text:'В рабочей версии здесь отображается полный канонический текст выбранной редакции документа без сокращений. Текст берётся из FATHER Knowledge Core вместе с хешем, официальным источником, датами действия и историей редакций.'},
    {id:'intro-2',text:'Для прототипа ниже показано непрерывное чтение документа, выбор конкретного фрагмента, встроенные сноски об изменениях и пользовательские рабочие пометки.'}]},
  { id:'art1', heading:'Статья 1. Сфера действия настоящего Федерального закона', blocks:[
    {id:'art1-1',text:'Демонстрационный текст нормы. В продуктивном режиме этот абзац будет заменён точным текстом выбранной редакции официального документа.'},
    {id:'art1-2',text:'Связанные понятия, исключения и условия применимости доступны справа без изменения самого официального текста.'}]},
  { id:'art3', heading:'Статья 3. Основные понятия, используемые в настоящем Федеральном законе', blocks:[
    {id:'art3-1',text:'Демонстрационный фрагмент определения. В системе определение становится отдельным узлом знаний, но в центре пользователь всегда видит его в исходном контексте документа.',change:{number:1,kind:'changed',label:'Фрагмент изменён',date:'01.09.2026',act:'Демо: изменяющий нормативный акт № X',previous:'Предыдущая редакция демонстрационного определения отображается здесь без потери исторического состояния.',effect:'После изменения требуется повторно проверить связанные определения, требования, шаблоны и внутренние документы.'}},
    {id:'art3-2',text:'Нажатие на метку изменения открывает предыдущую формулировку, основание изменения и дату начала применения новой редакции.'}]},
  { id:'art5', heading:'Статья 5. Принципы обработки персональных данных', blocks:[
    {id:'art5-1',text:'Демонстрационный текст нормы. Официальный текст не смешивается с аналитическими комментариями FATHER: аналитика вынесена в правую рабочую панель.'},
    {id:'art5-2',text:'Демонстрационный новый абзац, добавленный в последней редакции.',change:{number:2,kind:'added',label:'Добавлено',date:'01.09.2026',act:'Демо: федеральный закон о внесении изменений № Y',previous:'В предыдущей редакции этого абзаца не было.',effect:'Созданы новые точки проверки применимости и новые зависимости для чек-листов.'}}]},
  { id:'art18', heading:'Статья 18. Обязанности оператора при сборе персональных данных', blocks:[
    {id:'art18-1',text:'Демонстрационный фрагмент. Справа для этого пункта система показывает обязанности, роль исполнителя, необходимые внутренние документы и доказательства исполнения.'},
    {id:'art18-2',text:'Демонстрационный фрагмент, для которого предусмотрено изменение, вступающее в силу позднее текущей даты.',change:{number:3,kind:'future',label:'Будущая редакция',date:'01.01.2027',act:'Демо: нормативный акт с отложенным вступлением в силу № Z',previous:'До указанной даты продолжает применяться текущая редакция этого фрагмента.',effect:'Система заранее создаёт предупреждение, план перехода и перечень затронутых локальных документов.'}}]},
  { id:'art19', heading:'Статья 19. Меры по обеспечению безопасности персональных данных', blocks:[
    {id:'art19-1',text:'Демонстрационный фрагмент. Для выбранной нормы FATHER связывает требования с мерами защиты, системами, ответственными ролями, внутренними документами и доказательствами выполнения.'},
    {id:'art19-2',text:'Демонстрационный фрагмент текущей редакции после замены прежней формулировки.',change:{number:4,kind:'changed',label:'Изменено',date:'15.07.2026',act:'Демо: изменяющий акт № Q',previous:'Здесь показывается точная предыдущая формулировка выбранного пункта из предыдущей редакции.',effect:'Изменение затронуло требования, меры, чек-лист контроля и два шаблона внутренних документов.'}}]},
  { id:'art22', heading:'Статья 22. Уведомление об обработке персональных данных', blocks:[
    {id:'art22-1',text:'Демонстрационный фрагмент. Для каждой нормы система хранит сроки, исключения, применимость, связанные обязанности и состояние проверки актуальности.'},
    {id:'art22-2',text:'Демонстрационный фрагмент, который утратил силу и показывается только при включённом режиме изменений или при просмотре исторической редакции.',change:{number:5,kind:'repealed',label:'Утратило силу',date:'01.08.2026',act:'Демо: изменяющий акт № R',previous:'До 01.08.2026 этот фрагмент входил в действующий текст документа.',effect:'Зависимые обязанности переведены в историческое состояние, но не удалены из графа знаний.'}}]},
  { id:'final', heading:'Заключительные положения', blocks:[
    {id:'final-1',text:'В рабочем режиме полный документ продолжается до последней статьи. Пользователь может читать его как обычную справочно-правовую систему, не переходя между карточками.'}]},
];

const tabMeta: Record<WorkTab,{label:string;icon:typeof Sparkles}> = {
  analysis:{label:'Анализ',icon:Sparkles}, duties:{label:'Обязанности',icon:UserRoundCheck},
  checklist:{label:'Чек-лист',icon:ClipboardCheck}, templates:{label:'Образцы',icon:FileCheck2},
  notes:{label:'Заметки',icon:StickyNote}, graph:{label:'Связи',icon:Network}, history:{label:'Редакции',icon:History},
};
const allBlocks=documentSections.flatMap(s=>s.blocks);
const changedBlocks=allBlocks.filter(b=>b.change);
const allDocs=groups.flatMap(g=>g.docs);

export default function LegalWorkbenchV2(){
  const [leftOpen,setLeftOpen]=useState(true),[rightOpen,setRightOpen]=useState(true);
  const [expanded,setExpanded]=useState<Record<string,boolean>>({pdn:true,kii:true});
  const [selectedDoc,setSelectedDoc]=useState('152fz'),[selectedParagraph,setSelectedParagraph]=useState('art19-1');
  const [tab,setTab]=useState<WorkTab>('analysis'),[query,setQuery]=useState('');
  const [showChanges,setShowChanges]=useState(true),[onlyChanges,setOnlyChanges]=useState(false),[compareMode,setCompareMode]=useState(false);
  const [activeChangeId,setActiveChangeId]=useState<string|null>('art19-2');
  const [annotations,setAnnotations]=useState<Record<string,Annotation>>({
    'art19-1':{note:'Проверить, какие внутренние меры уже подтверждены актами внедрения.',tags:['Проверить']}
  });
  const [links,setLinks]=useState<Record<string,DocLink[]>>({
    'art19-1':[{id:'lnk-1',documentId:'1119',documentTitle:'ПП РФ №1119',relation:'Основан на'}]
  });

  const visibleGroups=useMemo(()=>{const q=query.trim().toLowerCase();if(!q)return groups;return groups.map(g=>({...g,docs:g.docs.filter(d=>`${g.title} ${d.title}`.toLowerCase().includes(q))})).filter(g=>g.docs.length||g.title.toLowerCase().includes(q));},[query]);
  const selected=allDocs.find(d=>d.id===selectedDoc)??allDocs[0];
  const selectedBlock=allBlocks.find(b=>b.id===selectedParagraph)??allBlocks[0];
  const activeChange=allBlocks.find(b=>b.id===activeChangeId)?.change;
  const visibleSections=onlyChanges?documentSections.map(s=>({...s,blocks:s.blocks.filter(b=>b.change)})).filter(s=>s.blocks.length):documentSections;
  const moveChange=(dir:-1|1)=>{const i=Math.max(0,changedBlocks.findIndex(b=>b.id===activeChangeId));const n=changedBlocks[(i+dir+changedBlocks.length)%changedBlocks.length];setActiveChangeId(n.id);setSelectedParagraph(n.id)};

  return <main className={styles.page}>
    <header className={styles.topbar}><div className={styles.brand}><a href="/operator-console" className={styles.back}><ChevronLeft size={17}/> Пульт оператора</a><div><span>FATHER / НОРМАТИВНЫЙ НАВИГАТОР</span><h1>Рабочее место юриста и технического специалиста</h1></div></div><div className={styles.topActions}><button className={compareMode?styles.primary:''} onClick={()=>setCompareMode(v=>!v)}><GitCompareArrows size={16}/>{compareMode?'Закрыть сравнение':'Сравнить редакции'}</button><button className={styles.primary}><ShieldCheck size={16}/>Проверить актуальность</button></div></header>
    <section className={styles.statusbar}><span className={styles.ok}><CheckCircle2 size={15}/>Документ: <b>актуален по последней проверке</b></span><span><Clock3 size={15}/>Проверено: <b>14.09.2026 18:40</b></span><span><Link2 size={15}/>Источник: <b>A0 / официальный</b></span><span><BookOpen size={15}/>Центр: <b>полный текст документа</b></span></section>

    <section className={`${styles.workspace} ${leftOpen?'':styles.leftClosed} ${rightOpen?'':styles.rightClosed}`}>
      <aside className={styles.navigator}><div className={styles.navigatorHeader}><div><span className={styles.eyebrow}>СПЕЦИАЛЬНОСТИ И РАЗДЕЛЫ</span><h2>Нормативная база</h2></div><button className={styles.iconButton} onClick={()=>setLeftOpen(false)}><PanelLeftClose size={18}/></button></div><div className={styles.searchBox}><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Закон, приказ, тема…"/></div><div className={styles.tree}>{visibleGroups.map(g=>{const open=expanded[g.id]??false;return <section key={g.id} className={styles.treeGroup}><button className={styles.groupButton} onClick={()=>setExpanded(p=>({...p,[g.id]:!open}))}><BriefcaseBusiness size={17}/><span>{g.title}</span>{open?<ChevronUp size={15}/>:<ChevronDown size={15}/>}</button>{open&&<div className={styles.docList}>{g.docs.map(d=><button key={d.id} className={selectedDoc===d.id?styles.docActive:''} onClick={()=>setSelectedDoc(d.id)}><FileText size={15}/><div><strong>{d.title}</strong><small className={d.status==='Актуален'?styles.docOk:styles.docWarn}>{d.status}</small></div></button>)}</div>}</section>})}</div></aside>
      {!leftOpen&&<button className={`${styles.edgeButton} ${styles.edgeLeft}`} onClick={()=>setLeftOpen(true)}><PanelLeftOpen size={18}/></button>}

      <article className={styles.documentPane}><div className={styles.documentHeader}><div><span className={styles.eyebrow}>ПОЛНЫЙ ТЕКСТ ДОКУМЕНТА</span><h2>{selected.title}</h2><p>Редакция на выбранную дату · канонический источник · изменения, заметки и связи привязаны к фрагментам</p></div><div className={styles.documentBadges}><span className={styles.actual}>{selected.status}</span><span>Версия: текущая</span><span>На дату: 14.09.2026</span></div></div>
      <div className={styles.documentTools}><button>Оглавление</button><button>Найти в тексте</button><button className={showChanges?styles.toolActive:''} onClick={()=>setShowChanges(v=>!v)}>{showChanges?'Изменения показаны':'Показать изменения'}</button><button className={onlyChanges?styles.toolActive:''} onClick={()=>setOnlyChanges(v=>!v)}>{onlyChanges?'Показан полный текст':'Только изменения'}</button><button onClick={()=>moveChange(-1)}><ArrowUp size={14}/>Предыдущее изменение</button><button onClick={()=>moveChange(1)}><ArrowDown size={14}/>Следующее изменение</button><button onClick={()=>{setTab('notes');setRightOpen(true)}}><StickyNote size={14}/>Заметка к фрагменту</button></div>
      <div className={styles.demoNotice}><AlertTriangle size={18}/><div><strong>Прототип интерфейса полного текста.</strong><span>Сейчас текст демонстрационный. После подключения канонического контура здесь будет полный официальный текст выбранной редакции без сокращений.</span></div></div>
      {compareMode&&activeChange&&<div className={styles.compareStrip}><div><span>ПРЕДЫДУЩАЯ РЕДАКЦИЯ</span><p>{activeChange.previous}</p></div><div><span>ТЕКУЩАЯ / НОВАЯ РЕДАКЦИЯ</span><p>{allBlocks.find(b=>b.id===activeChangeId)?.text}</p></div></div>}
      <div className={styles.documentBody}><div className={styles.fullTextSheet}><div className={styles.lawTitle}><span>ДЕМОНСТРАЦИОННОЕ ПРЕДСТАВЛЕНИЕ</span><h3>{selected.title}</h3><p>Полный текст читается непрерывно. Рабочие заметки и связи не изменяют официальный текст.</p></div>
      {visibleSections.map(section=><section className={styles.lawSection} key={section.id}><h4>{section.heading}</h4>{section.blocks.map(block=>{const changeVisible=showChanges&&block.change;const active=activeChangeId===block.id;const selectedText=selectedParagraph===block.id;const ann=annotations[block.id];const docLinks=links[block.id]??[];return <div key={block.id} className={`${styles.textBlock} ${selectedText?styles.textBlockSelected:''} ${changeVisible?styles[`change_${block.change!.kind}`]:''}`} onClick={()=>setSelectedParagraph(block.id)}><p>{block.text}</p><div className={styles.userMarkers}>{ann?.note&&<button title="Есть заметка" onClick={e=>{e.stopPropagation();setSelectedParagraph(block.id);setTab('notes');setRightOpen(true)}}><StickyNote size={13}/></button>}{ann?.tags.map(t=><span key={t}>{t}</span>)}{docLinks.length>0&&<button title={`Связей: ${docLinks.length}`} onClick={e=>{e.stopPropagation();setSelectedParagraph(block.id);setTab('notes');setRightOpen(true)}}><Link2 size={13}/>{docLinks.length}</button>}</div>{changeVisible&&<button className={styles.changeMarker} onClick={e=>{e.stopPropagation();setActiveChangeId(active?null:block.id);setSelectedParagraph(block.id)}}>{block.change!.number}</button>}{changeVisible&&active&&<div className={styles.changeNote} onClick={e=>e.stopPropagation()}><div className={styles.changeNoteHeader}><strong>Изменение №{block.change!.number}: {block.change!.label}</strong><span>с {block.change!.date}</span></div><p><b>Основание:</b> {block.change!.act}</p><div className={styles.changeDiff}><div><span>Было</span><p>{block.change!.previous}</p></div><div><span>Стало</span><p>{block.text}</p></div></div><p className={styles.changeImpact}><b>Что меняется для организации:</b> {block.change!.effect}</p></div>}</div>})}</section>)}
      <section className={styles.footnotes}><h4>Сноски к изменениям</h4>{changedBlocks.map(b=><button key={b.id} onClick={()=>{setActiveChangeId(b.id);setSelectedParagraph(b.id)}}><b>{b.change!.number}</b><span>{b.change!.label} · с {b.change!.date} · {b.change!.act}</span></button>)}</section></div></div></article>

      {!rightOpen&&<button className={`${styles.edgeButton} ${styles.edgeRight}`} onClick={()=>setRightOpen(true)}><Boxes size={18}/></button>}
      <aside className={styles.workPane}><div className={styles.workHeader}><div><span className={styles.eyebrow}>РАБОТА С ВЫБРАННЫМ ФРАГМЕНТОМ</span><h2>{selectedBlock.change?`Изменение №${selectedBlock.change.number}`:'Норма документа'}</h2><p>{selectedBlock.text}</p></div><button className={styles.iconButton} onClick={()=>setRightOpen(false)}><ChevronRight size={18}/></button></div><nav className={styles.tabs}>{(Object.entries(tabMeta) as [WorkTab,{label:string;icon:typeof Sparkles}][]).map(([id,m])=>{const Icon=m.icon;return <button key={id} className={tab===id?styles.tabActive:''} onClick={()=>setTab(id)}><Icon size={15}/>{m.label}</button>})}</nav><div className={styles.workBody}>{tab==='analysis'&&<AnalysisTab/>}{tab==='duties'&&<DutiesTab/>}{tab==='checklist'&&<ChecklistTab/>}{tab==='templates'&&<TemplatesTab/>}{tab==='notes'&&<NotesTab blockId={selectedBlock.id} annotations={annotations} setAnnotations={setAnnotations} links={links} setLinks={setLinks}/>} {tab==='graph'&&<GraphTab links={links[selectedBlock.id]??[]}/>} {tab==='history'&&<HistoryTab activeChange={selectedBlock.change}/>}</div></aside>
    </section>
  </main>
}

function AnalysisTab(){return <><section className={styles.workCard}><span className={styles.cardLabel}>ПРОСТЫМИ СЛОВАМИ</span><h3>Что означает выбранная норма</h3><p>FATHER объясняет практический смысл нормы отдельно от официального текста: что требуется, кому это относится, какие условия и исключения важны.</p></section><section className={styles.workCard}><span className={styles.cardLabel}>ПРИМЕНИМОСТЬ</span><div className={styles.tagRow}><span>Оператор ПДн</span><span>Медицинская ИС</span><span>ИБ-подразделение</span><span>ИТ-эксплуатация</span></div></section><section className={styles.workCard}><span className={styles.cardLabel}>РИСК</span><div className={styles.riskLine}><b>Высокий</b><span>если обязанность не исполнена или её исполнение нельзя подтвердить</span></div></section></>}
function DutiesTab(){return <div className={styles.roleList}><article><UserRoundCheck/><div><strong>Ответственный за организацию обработки ПДн</strong><p>Контролирует организационные меры, документы, назначение ролей и подтверждение исполнения.</p><small>Основание: выбранная норма + внутренний приказ о назначении</small></div></article><article><ShieldCheck/><div><strong>Специалист по информационной безопасности</strong><p>Формирует требования к защите, контролирует реализацию мер и собирает доказательства выполнения.</p><small>Должностная обязанность: контроль соблюдения требований ИБ</small></div></article><article><BriefcaseBusiness/><div><strong>Владелец информационной системы</strong><p>Обеспечивает выполнение требований в конкретной системе и устранение выявленных несоответствий.</p><small>Ответственность: только в пределах закреплённых полномочий</small></div></article></div>}
function ChecklistTab(){const items=['Назначен ответственный','Определены категории данных и субъектов','Определён уровень защищённости','Сформирована модель угроз','Меры защиты сопоставлены требованиям','Есть подтверждения внедрения','Проводится периодическая проверка'];return <div className={styles.checkList}>{items.map((x,i)=><label key={x}><input type="checkbox" defaultChecked={i<3}/><span>{x}</span><small>{i<3?'подтверждено':'требует проверки'}</small></label>)}</div>}
function TemplatesTab(){return <div className={styles.templateList}>{['Приказ о назначении ответственного','Политика обработки персональных данных','Перечень информационных систем ПДн','Акт оценки применимости требований','Чек-лист внутреннего контроля','План устранения несоответствий'].map(x=><button key={x}><FileCheck2 size={17}/><span>{x}</span><ChevronRight size={15}/></button>)}</div>}

function NotesTab({blockId,annotations,setAnnotations,links,setLinks}:{blockId:string;annotations:Record<string,Annotation>;setAnnotations:React.Dispatch<React.SetStateAction<Record<string,Annotation>>>;links:Record<string,DocLink[]>;setLinks:React.Dispatch<React.SetStateAction<Record<string,DocLink[]>>>}){
  const ann=annotations[blockId]??{note:'',tags:[]};const currentLinks=links[blockId]??[];
  const [target,setTarget]=useState('1119');const [relation,setRelation]=useState<RelationType>('Связан с');
  const setNote=(note:string)=>setAnnotations(p=>({...p,[blockId]:{...ann,note}}));
  const toggleTag=(tag:AnnotationTag)=>setAnnotations(p=>({...p,[blockId]:{...ann,tags:ann.tags.includes(tag)?ann.tags.filter(x=>x!==tag):[...ann.tags,tag]}}));
  const addLink=()=>{const doc=allDocs.find(d=>d.id===target);if(!doc||currentLinks.some(l=>l.documentId===target&&l.relation===relation))return;const item:DocLink={id:`${blockId}-${target}-${Date.now()}`,documentId:target,documentTitle:doc.title,relation};setLinks(p=>({...p,[blockId]:[...(p[blockId]??[]),item]}))};
  const removeLink=(id:string)=>setLinks(p=>({...p,[blockId]:(p[blockId]??[]).filter(l=>l.id!==id)}));
  return <div className={styles.annotationPanel}><section className={styles.workCard}><span className={styles.cardLabel}>ЗАМЕТКА К ФРАГМЕНТУ</span><textarea value={ann.note} onChange={e=>setNote(e.target.value)} placeholder="Что нужно проверить, сделать или обсудить по этой норме…"/><small>В прототипе хранится только в состоянии страницы. В рабочей версии — с автором, временем, видимостью и журналом изменений.</small></section><section className={styles.workCard}><span className={styles.cardLabel}>МЕТКИ</span><div className={styles.annotationTags}>{(['Важно','Проверить','Выполнить','Вопрос'] as AnnotationTag[]).map(t=><button key={t} className={ann.tags.includes(t)?styles.tagActive:''} onClick={()=>toggleTag(t)}><Tag size={13}/>{t}</button>)}</div></section><section className={styles.workCard}><span className={styles.cardLabel}>СВЯЗАТЬ С ДОКУМЕНТОМ</span><div className={styles.linkBuilder}><select value={target} onChange={e=>setTarget(e.target.value)}>{allDocs.filter(d=>d.id!=='152fz').map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</select><select value={relation} onChange={e=>setRelation(e.target.value as RelationType)}>{(['Связан с','Уточняет','Исполняет','Основан на','Противоречит'] as RelationType[]).map(r=><option key={r}>{r}</option>)}</select><button onClick={addLink}><Plus size={14}/>Добавить связь</button></div><div className={styles.linkList}>{currentLinks.map(l=><div key={l.id}><Link2 size={14}/><span><b>{l.relation}</b> → {l.documentTitle}</span><button onClick={()=>removeLink(l.id)}><X size={14}/></button></div>)}{currentLinks.length===0&&<p>Связей пока нет.</p>}</div></section></div>
}

function GraphTab({links}:{links:DocLink[]}){return <div className={styles.graphBox}><div className={styles.graphNodePrimary}>Выбранная норма</div><div className={styles.graphArrow}>↓</div><div className={styles.graphGrid}><span>ПП РФ №1119</span><span>ФСТЭК №21</span><span>ФСБ №378</span><span>Внутренние меры</span>{links.map(l=><span key={l.id}>{l.relation}: {l.documentTitle}</span>)}</div><div className={styles.graphArrow}>↓</div><div className={styles.graphGrid}><span>Контроли</span><span>Системы</span><span>Ответственные роли</span><span>Документы</span></div><button className={styles.graphButton}><Network size={16}/>Открыть полный граф зависимостей</button></div>}
function HistoryTab({activeChange}:{activeChange?:ChangeNote}){return <div className={styles.historyList}>{activeChange&&<article><span>{activeChange.date}</span><div><strong>{activeChange.label}</strong><p>{activeChange.act}</p></div></article>}<article><span>14.09.2026</span><div><strong>Последняя проверка актуальности</strong><p>Статус подтверждён по источнику уровня A0.</p></div></article><article><span>История</span><div><strong>Все предыдущие редакции сохраняются</strong><p>Можно открыть состояние нормы на любую контрольную дату и увидеть, каким актом изменён конкретный фрагмент.</p></div></article></div>}
