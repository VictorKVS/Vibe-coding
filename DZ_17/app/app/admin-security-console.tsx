'use client';
import {useEffect,useMemo,useState} from 'react';
import {Activity,BrainCircuit,Cable,Database,FileCode2,KeyRound,LockKeyhole,RefreshCw,Settings,ShieldCheck,X} from 'lucide-react';

type Role='admin'|'security';
type Tab='models'|'prompts'|'knowledge'|'database'|'operations';
type Model={id:string;provider:string;model:string;label:string;available:boolean;note:string;capabilities:string[]};
type Config={
 mode:string;warning:string;
 prompts:{id:string;task:string;source:string;status:string;editable:boolean}[];
 knowledgeBases:{id:string;label:string;path:string;kind:string;status:string}[];
 database:{target:string;configured:boolean;connectionValueExposed:boolean;eventAuditConfigured:boolean;objectStorage:string};
 security:{secretsExposed:boolean;promptBodiesExposed:boolean;privilegedWritesEnabled:boolean;auditRequired:boolean;modelIntegrity:string;kbIntegrity:string};
};

const tabs:{id:Tab;label:string;icon:typeof Settings}[]=[
 {id:'models',label:'Модели',icon:BrainCircuit},
 {id:'prompts',label:'Промты',icon:FileCode2},
 {id:'knowledge',label:'Базы знаний',icon:Cable},
 {id:'database',label:'База данных',icon:Database},
 {id:'operations',label:'Контроль',icon:Activity},
];

export function AdminSecurityConsole(){
 const [open,setOpen]=useState(false),[role,setRole]=useState<Role>('admin'),[tab,setTab]=useState<Tab>('models');
 const [models,setModels]=useState<Model[]>([]),[routes,setRoutes]=useState<Record<string,string[]>>({}),[config,setConfig]=useState<Config|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const refresh=async()=>{
  setLoading(true);setError('');
  try{
   const [llm,adm]=await Promise.all([fetch('/api/llm').then(r=>r.json()),fetch('/api/admin/config').then(r=>r.json())]);
   setModels(Array.isArray(llm?.models)?llm.models:[]);setRoutes(llm?.routes&&typeof llm.routes==='object'?llm.routes:{});setConfig(adm);
  }catch(e){setError(e instanceof Error?e.message:'Не удалось получить конфигурацию.');}finally{setLoading(false);}
 };
 useEffect(()=>{if(open&&!config&&!loading)void refresh();},[open]);
 const online=useMemo(()=>models.filter(m=>m.available&&m.id!=='auto').length,[models]);
 const providers=useMemo(()=>Array.from(new Set(models.filter(m=>m.id!=='auto').map(m=>m.provider))),[models]);
 return <>
  <button className="system-gear" type="button" onClick={()=>setOpen(true)} aria-label="Открыть системные настройки"><Settings size={21}/><span>SYS</span></button>
  {open?<div className="system-console-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false);}}>
   <aside className="system-console" aria-label="Центр управления ALINA">
    <header className="system-console-head">
     <div><span className="system-kicker">ALINA CONTROL CENTER</span><h2>{role==='admin'?'Администратор':'ИБ / AI Security'}</h2><p>Модели, промты, базы знаний, данные и контроль системы.</p></div>
     <div className="system-head-actions"><button type="button" onClick={()=>void refresh()} title="Обновить"><RefreshCw size={17} className={loading?'spin':''}/></button><button type="button" onClick={()=>setOpen(false)} title="Закрыть"><X size={18}/></button></div>
    </header>

    <div className="system-role-switch" aria-label="Роль панели">
     <button className={role==='admin'?'active':''} type="button" onClick={()=>setRole('admin')}><Settings size={16}/> Администратор</button>
     <button className={role==='security'?'active':''} type="button" onClick={()=>setRole('security')}><ShieldCheck size={16}/> ИБ / AI Security</button>
    </div>

    <div className="system-console-body">
     <nav className="system-tabs" aria-label="Разделы настроек">{tabs.map(t=>{const I=t.icon;return <button key={t.id} className={tab===t.id?'active':''} type="button" onClick={()=>setTab(t.id)}><I size={17}/><span>{t.label}</span></button>;})}</nav>
     <section className="system-content">
      <div className="system-preview-note"><LockKeyhole size={15}/><span>Сейчас это безопасный read-only P0: реальные изменения настроек будут разрешены только после server-side RBAC и audit log.</span></div>
      {error?<div className="system-alert error">{error}</div>:null}
      {tab==='models'?<ModelsPanel models={models} routes={routes} online={online} providers={providers} role={role}/>:null}
      {tab==='prompts'?<PromptsPanel config={config} role={role}/>:null}
      {tab==='knowledge'?<KnowledgePanel config={config} role={role}/>:null}
      {tab==='database'?<DatabasePanel config={config} role={role}/>:null}
      {tab==='operations'?<OperationsPanel config={config} models={models} role={role}/>:null}
     </section>
    </div>
   </aside>
  </div>:null}
 </>;
}

function ModelsPanel({models,routes,online,providers,role}:{models:Model[];routes:Record<string,string[]>;online:number;providers:string[];role:Role}){
 return <div className="system-stack"><div className="system-summary-grid"><Metric label="Доступно моделей" value={String(online)}/><Metric label="Провайдеров" value={String(providers.length)}/><Metric label="Роль" value={role==='admin'?'OPS':'SEC'}/></div>
  <div className="system-card"><div className="system-card-title"><BrainCircuit size={18}/><div><h3>Model Registry</h3><p>{role==='security'?'Контроль происхождения, доверия и допустимости моделей.':'Состояние моделей и маршрутизация задач.'}</p></div></div><div className="system-table">{models.filter(m=>m.id!=='auto').map(m=><div className="system-row" key={m.id}><div><strong>{m.label}</strong><small>{m.provider} · {m.model}</small></div><div className="system-tags">{m.capabilities?.slice(0,4).map(c=><span key={c}>{c}</span>)}</div><b className={m.available?'ok':'off'}>{m.available?'READY':'OFF'}</b></div>)}</div></div>
  <div className="system-card"><h3>Routing by task</h3><div className="system-routes">{Object.entries(routes).map(([task,chain])=><div key={task}><span>{task}</span><code>{chain.join(' → ')||'AUTO'}</code></div>)}</div></div>
 </div>;
}

function PromptsPanel({config,role}:{config:Config|null;role:Role}){
 return <div className="system-stack"><div className="system-card"><div className="system-card-title"><FileCode2 size={18}/><div><h3>Prompt Registry</h3><p>{role==='security'?'Промты видны как управляемые объекты; содержимое не выдаётся клиенту до RBAC.':'Версии, назначение и физический источник промтов.'}</p></div></div>{config?.prompts?.map(p=><div className="system-row" key={p.id}><div><strong>{p.id}</strong><small>{p.task} · {p.source}</small></div><b className={p.status==='active'?'ok':'warn'}>{p.status.toUpperCase()}</b></div>)||<p className="system-muted">Загрузка каталога…</p>}</div>
  <div className="system-card"><h3>Правило изменения</h3><p className="system-muted">Редактирование промта должно создавать новую версию, запись в audit log, ссылку на автора/роль и возможность rollback. Для ИБ добавляется security review перед активацией.</p></div></div>;
}

function KnowledgePanel({config,role}:{config:Config|null;role:Role}){
 return <div className="system-stack"><div className="system-card"><div className="system-card-title"><Cable size={18}/><div><h3>Knowledge Base Connections</h3><p>{role==='security'?'Проверка provenance, целостности и разрешённых подключений.':'Какие универсальные и предметные KB подключены к агентам.'}</p></div></div>{config?.knowledgeBases?.map(k=><div className="system-row" key={k.id}><div><strong>{k.label}</strong><small>{k.id} · {k.path}</small></div><b className={k.status==='configured'?'ok':'warn'}>{k.status.toUpperCase()}</b></div>)||<p className="system-muted">Загрузка подключений…</p>}</div>
  <div className="system-card"><h3>Наследование без дублей</h3><code className="system-code">FOUNDATION → ROLE PROFILE → DOMAIN / TECH → PROJECT / TASK</code><p className="system-muted">Профили агентов должны ссылаться на canonical ID, а не копировать ГОСТы, методы и книги.</p></div></div>;
}

function DatabasePanel({config,role}:{config:Config|null;role:Role}){
 const db=config?.database;return <div className="system-stack"><div className="system-summary-grid"><Metric label="PostgreSQL" value={db?.configured?'CONNECTED':'NOT SET'} tone={db?.configured?'ok':'warn'}/><Metric label="Audit DB" value={db?.eventAuditConfigured?'READY':'NOT SET'} tone={db?.eventAuditConfigured?'ok':'warn'}/><Metric label="Secrets" value="HIDDEN" tone="ok"/></div>
  <div className="system-card"><div className="system-card-title"><Database size={18}/><div><h3>Data Layer</h3><p>{role==='security'?'Контроль доступа, утечек, audit и целостности данных.':'Подключение основной БД, vector index и object storage.'}</p></div></div><div className="system-kv"><span>Целевая БД</span><strong>{db?.target||'PostgreSQL + pgvector'}</strong><span>Connection string</span><strong>не раскрывается UI</strong><span>Object Storage</span><strong>{db?.objectStorage||'MinIO/S3 — planned'}</strong></div></div>
  <div className="system-card"><h3>Будущие настройки</h3><p className="system-muted">Pool size, migrations, backup/restore, retention, encryption, pgvector indexes, object-store buckets и отдельный audit/event ledger.</p></div></div>;
}

function OperationsPanel({config,models,role}:{config:Config|null;models:Model[];role:Role}){
 const sec=config?.security;return <div className="system-stack"><div className="system-card"><div className="system-card-title">{role==='security'?<ShieldCheck size={18}/>:<Activity size={18}/>}<div><h3>{role==='security'?'Security Control':'Operations Control'}</h3><p>{role==='security'?'AI/KB security, model integrity, secrets and audit.':'Техническое состояние runtime и конфигурации.'}</p></div></div><div className="system-kv"><span>Privileged writes</span><strong>{sec?.privilegedWritesEnabled?'ENABLED':'LOCKED'}</strong><span>Secrets exposed</span><strong>{sec?.secretsExposed?'YES':'NO'}</strong><span>Prompt bodies exposed</span><strong>{sec?.promptBodiesExposed?'YES':'NO'}</strong><span>Audit required</span><strong>{sec?.auditRequired?'YES':'NO'}</strong><span>Model integrity</span><strong>{sec?.modelIntegrity||'planned'}</strong><span>KB integrity</span><strong>{sec?.kbIntegrity||'documented'}</strong></div></div>
  <div className="system-card"><div className="system-card-title"><KeyRound size={18}/><div><h3>Provider Safety</h3><p>В UI не показываются токены, пароли и значения connection strings.</p></div></div><p className="system-muted">Текущий каталог: {models.length} записей. После RBAC здесь будут блокировка модели/провайдера, quarantine, разрешённые классы данных, hash/version history и security hold.</p></div></div>;
}

function Metric({label,value,tone=''}:{label:string;value:string;tone?:string}){return <div className={'system-metric '+tone}><span>{label}</span><strong>{value}</strong></div>;}
