'use client';
import {useEffect,useMemo,useState} from 'react';
import {Activity,BrainCircuit,Cable,Database,FileCode2,KeyRound,LockKeyhole,RefreshCw,Settings,ShieldCheck,X} from 'lucide-react';

type Role='admin'|'security';
type Tab='models'|'prompts'|'knowledge'|'database'|'operations';
type Model={id:string;provider:string;model:string;label:string;available:boolean;note:string;capabilities:string[]};
type ModelPolicy={enabled:boolean;security:'approved'|'review'|'blocked'};
type PromptPolicy={active:boolean;review:'approved'|'pending'|'blocked';version:number};
type KbPolicy={enabled:boolean;securityHold:boolean};
type ControlState={version:number;updatedAt:string|null;modelPolicies:Record<string,ModelPolicy>;promptPolicies:Record<string,PromptPolicy>;kbPolicies:Record<string,KbPolicy>;database:{vectorIndexEnabled:boolean;backupEnabled:boolean;objectStorageEnabled:boolean}};
type AuditEvent={eventId:string;at:string;role:Role;action:string;target:string;reason:string;stateVersion:number};
type Config={
 mode:string;warning:string;
 auth:{adminConfigured:boolean;securityConfigured:boolean;tokenValuesExposed:boolean};
 prompts:{id:string;task:string;source:string;status:string;editable:boolean;version:number;reviewStatus:string}[];
 knowledgeBases:{id:string;label:string;path:string;kind:string;status:string}[];
 control:ControlState;
 database:{target:string;configured:boolean;connectionValueExposed:boolean;eventAuditConfigured:boolean;objectStorage:string};
 security:{secretsExposed:boolean;promptBodiesExposed:boolean;privilegedWritesEnabled:boolean;auditRequired:boolean;modelIntegrity:string;kbIntegrity:string};
 audit:AuditEvent[];
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
 const [models,setModels]=useState<Model[]>([]),[routes,setRoutes]=useState<Record<string,string[]>>({}),[config,setConfig]=useState<Config|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState(''),[token,setToken]=useState(''),[reason,setReason]=useState('Изменение через ALINA Control Center');
 const refresh=async()=>{
  setLoading(true);setError('');
  try{
   const [llm,adm]=await Promise.all([fetch('/api/llm').then(r=>r.json()),fetch('/api/admin/config').then(r=>r.json())]);
   setModels(Array.isArray(llm?.models)?llm.models:[]);setRoutes(llm?.routes&&typeof llm.routes==='object'?llm.routes:{});setConfig(adm);
  }catch(e){setError(e instanceof Error?e.message:'Не удалось получить конфигурацию.');}finally{setLoading(false);}
 };
 useEffect(()=>{if(open&&!config&&!loading)void refresh();},[open]);
 useEffect(()=>{setToken('');},[role]);
 const online=useMemo(()=>models.filter(m=>m.available&&m.id!=='auto').length,[models]);
 const providers=useMemo(()=>Array.from(new Set(models.filter(m=>m.id!=='auto').map(m=>m.provider))),[models]);
 const roleConfigured=role==='admin'?Boolean(config?.auth?.adminConfigured):Boolean(config?.auth?.securityConfigured);
 const mutate=async(action:string,target:string,value:unknown)=>{
  if(!roleConfigured){setError(`Для роли ${role} не настроен серверный токен.`);return;}
  if(!token){setError('Введите role token. Он хранится только в памяти этой вкладки.');return;}
  setLoading(true);setError('');
  try{
   const r=await fetch('/api/admin/config',{method:'POST',headers:{'content-type':'application/json','authorization':`Bearer ${token}`},body:JSON.stringify({role,action,target,value,reason})});
   const data=await r.json();if(!r.ok)throw new Error(data?.error||`Admin API HTTP ${r.status}`);
   await refresh();
  }catch(e){setError(e instanceof Error?e.message:'Ошибка изменения конфигурации.');setLoading(false);}
 };
 return <>
  <button className="system-gear" type="button" onClick={()=>setOpen(true)} aria-label="Открыть системные настройки"><Settings size={21}/><span>SYS</span></button>
  {open?<div className="system-console-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false);}}>
   <aside className="system-console" aria-label="Центр управления ALINA">
    <header className="system-console-head system-sticky-top">
     <div><span className="system-kicker">ALINA CONTROL CENTER</span><h2>{role==='admin'?'Администратор':'ИБ / AI Security'}</h2><p>Модели, промты, базы знаний, данные и контроль системы.</p></div>
     <div className="system-head-actions"><button type="button" onClick={()=>void refresh()} title="Обновить"><RefreshCw size={17} className={loading?'spin':''}/></button><button type="button" onClick={()=>setOpen(false)} title="Закрыть"><X size={18}/></button></div>
    </header>

    <div className="system-role-switch system-sticky-role" aria-label="Роль панели">
     <button className={role==='admin'?'active':''} type="button" onClick={()=>setRole('admin')}><Settings size={16}/> Администратор</button>
     <button className={role==='security'?'active':''} type="button" onClick={()=>setRole('security')}><ShieldCheck size={16}/> ИБ / AI Security</button>
    </div>

    <div className="system-console-body">
     <nav className="system-tabs" aria-label="Разделы настроек">{tabs.map(t=>{const I=t.icon;return <button key={t.id} className={tab===t.id?'active':''} type="button" onClick={()=>setTab(t.id)}><I size={17}/><span>{t.label}</span></button>;})}</nav>
     <section className="system-content">
      <div className={'system-preview-note '+(config?.mode==='controlled_writes'?'live':'')}><LockKeyhole size={15}/><span>{config?.warning||'Загрузка режима управления…'}</span></div>
      <div className="system-auth-card">
       <div><strong>{role==='admin'?'ADMIN TOKEN':'SECURITY TOKEN'}</strong><small>{roleConfigured?'серверная роль настроена':'серверная роль не настроена'}</small></div>
       <input type="password" value={token} onChange={e=>setToken(e.target.value)} placeholder={roleConfigured?'Введите токен роли':'Сначала задайте токен в .env.local'} autoComplete="off"/>
       <input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Причина изменения"/>
      </div>
      {error?<div className="system-alert error">{error}</div>:null}
      {tab==='models'?<ModelsPanel models={models} routes={routes} online={online} providers={providers} role={role} control={config?.control} mutate={mutate}/>:null}
      {tab==='prompts'?<PromptsPanel config={config} role={role} mutate={mutate}/>:null}
      {tab==='knowledge'?<KnowledgePanel config={config} role={role} mutate={mutate}/>:null}
      {tab==='database'?<DatabasePanel config={config} role={role} mutate={mutate}/>:null}
      {tab==='operations'?<OperationsPanel config={config} models={models} role={role}/>:null}
     </section>
    </div>
   </aside>
  </div>:null}
 </>;
}

function ModelsPanel({models,routes,online,providers,role,control,mutate}:{models:Model[];routes:Record<string,string[]>;online:number;providers:string[];role:Role;control?:ControlState;mutate:(a:string,t:string,v:unknown)=>Promise<void>}){
 return <div className="system-stack"><div className="system-summary-grid"><Metric label="Доступно моделей" value={String(online)}/><Metric label="Провайдеров" value={String(providers.length)}/><Metric label="Control version" value={String(control?.version||1)}/></div>
  <div className="system-card"><div className="system-card-title"><BrainCircuit size={18}/><div><h3>Model Registry</h3><p>{role==='security'?'Контроль доверия и допуска моделей.':'Состояние моделей и эксплуатационный enable/disable.'}</p></div></div><div className="system-table">{models.filter(m=>m.id!=='auto').map(m=>{const p=control?.modelPolicies?.[m.id]||{enabled:true,security:'review' as const};return <div className="system-row system-row-actions" key={m.id}><div><strong>{m.label}</strong><small>{m.provider} · {m.model}</small></div><div className="system-tags">{m.capabilities?.slice(0,4).map(c=><span key={c}>{c}</span>)}</div><div className="system-action-cell">{role==='admin'?<button className={p.enabled?'mini ok':'mini off'} onClick={()=>void mutate('model.set_enabled',m.id,!p.enabled)}>{p.enabled?'ENABLED':'DISABLED'}</button>:<select value={p.security} onChange={e=>void mutate('model.set_security',m.id,e.target.value)}><option value="approved">APPROVED</option><option value="review">REVIEW</option><option value="blocked">BLOCKED</option></select>}<b className={m.available?'ok':'off'}>{m.available?'READY':'OFF'}</b></div></div>})}</div></div>
  <div className="system-card"><h3>Routing by task</h3><div className="system-routes">{Object.entries(routes).map(([task,chain])=><div key={task}><span>{task}</span><code>{chain.join(' → ')||'AUTO'}</code></div>)}</div><p className="system-muted">P1 хранит управляющее состояние моделей. Применение этих override к runtime-routing будет подключено отдельным адаптером, чтобы не смешивать control plane и LLM gateway.</p></div>
 </div>;
}

function PromptsPanel({config,role,mutate}:{config:Config|null;role:Role;mutate:(a:string,t:string,v:unknown)=>Promise<void>}){
 return <div className="system-stack"><div className="system-card"><div className="system-card-title"><FileCode2 size={18}/><div><h3>Prompt Registry</h3><p>{role==='security'?'Security review и блокировка версии.':'Активация и версия промтов; содержимое остаётся на сервере.'}</p></div></div>{config?.prompts?.map(p=>{const state=config.control?.promptPolicies?.[p.id]||{active:p.status==='active',review:p.reviewStatus as 'approved'|'pending'|'blocked',version:p.version};return <div className="system-row system-row-actions" key={p.id}><div><strong>{p.id}</strong><small>{p.task} · {p.source} · v{state.version}</small></div><span className="system-state-label">{state.review.toUpperCase()}</span><div className="system-action-cell">{role==='admin'?<button className={state.active?'mini ok':'mini off'} onClick={()=>void mutate('prompt.set_active',p.id,!state.active)}>{state.active?'ACTIVE':'INACTIVE'}</button>:<select value={state.review} onChange={e=>void mutate('prompt.set_review',p.id,e.target.value)}><option value="approved">APPROVED</option><option value="pending">PENDING</option><option value="blocked">BLOCKED</option></select>}</div></div>})||<p className="system-muted">Загрузка каталога…</p>}</div>
  <div className="system-card"><h3>Правило изменения</h3><p className="system-muted">Каждая активация повышает версию control-state и создаёт audit event. Тело системного промта не выдаётся клиенту; редактирование текста будет отдельным versioned workflow с rollback.</p></div></div>;
}

function KnowledgePanel({config,role,mutate}:{config:Config|null;role:Role;mutate:(a:string,t:string,v:unknown)=>Promise<void>}){
 return <div className="system-stack"><div className="system-card"><div className="system-card-title"><Cable size={18}/><div><h3>Knowledge Base Connections</h3><p>{role==='security'?'Security hold поверх тех же canonical KB.':'Включение KB без создания физических копий.'}</p></div></div>{config?.knowledgeBases?.map(k=>{const state=config.control?.kbPolicies?.[k.id]||{enabled:k.status==='configured',securityHold:false};return <div className="system-row system-row-actions" key={k.id}><div><strong>{k.label}</strong><small>{k.id} · {k.path}</small></div><span className="system-state-label">{state.securityHold?'SECURITY HOLD':k.status.toUpperCase()}</span><div className="system-action-cell">{role==='admin'?<button className={state.enabled?'mini ok':'mini off'} onClick={()=>void mutate('kb.set_enabled',k.id,!state.enabled)}>{state.enabled?'CONNECTED':'DISCONNECTED'}</button>:<button className={state.securityHold?'mini warn':'mini ok'} onClick={()=>void mutate('kb.set_hold',k.id,!state.securityHold)}>{state.securityHold?'HOLD':'RELEASED'}</button>}</div></div>})||<p className="system-muted">Загрузка подключений…</p>}</div>
  <div className="system-card"><h3>Наследование без дублей</h3><code className="system-code">FOUNDATION → ROLE PROFILE → DOMAIN / TECH → PROJECT / TASK</code><p className="system-muted">Профили агентов ссылаются на canonical ID. Security hold не переписывает KB, а блокирует её использование политикой control plane.</p></div></div>;
}

function DatabasePanel({config,role,mutate}:{config:Config|null;role:Role;mutate:(a:string,t:string,v:unknown)=>Promise<void>}){
 const db=config?.database,flags=config?.control?.database;return <div className="system-stack"><div className="system-summary-grid"><Metric label="PostgreSQL" value={db?.configured?'CONNECTED':'NOT SET'} tone={db?.configured?'ok':'warn'}/><Metric label="Audit DB" value={db?.eventAuditConfigured?'READY':'LOCAL JSONL'} tone={db?.eventAuditConfigured?'ok':'warn'}/><Metric label="Secrets" value="HIDDEN" tone="ok"/></div>
  <div className="system-card"><div className="system-card-title"><Database size={18}/><div><h3>Data Layer</h3><p>{role==='security'?'Контроль доступа и разделения данных.':'Runtime flags без хранения connection string в UI.'}</p></div></div><div className="system-kv"><span>Целевая БД</span><strong>{db?.target||'PostgreSQL + pgvector'}</strong><span>Connection string</span><strong>не раскрывается UI</strong><span>Object Storage</span><strong>{db?.objectStorage||'MinIO/S3 — planned'}</strong></div></div>
  {role==='admin'?<div className="system-card"><h3>Runtime flags</h3><div className="system-toggle-list"><Toggle label="pgvector index" value={Boolean(flags?.vectorIndexEnabled)} onChange={v=>void mutate('database.set_flag','database',{key:'vectorIndexEnabled',enabled:v})}/><Toggle label="backup policy" value={Boolean(flags?.backupEnabled)} onChange={v=>void mutate('database.set_flag','database',{key:'backupEnabled',enabled:v})}/><Toggle label="object storage" value={Boolean(flags?.objectStorageEnabled)} onChange={v=>void mutate('database.set_flag','database',{key:'objectStorageEnabled',enabled:v})}/></div></div>:<div className="system-card"><h3>ИБ view</h3><p className="system-muted">Connection strings и секреты не раскрываются. ИБ получает audit/security metadata, но не значения credentials.</p></div>}
 </div>;
}

function OperationsPanel({config,models,role}:{config:Config|null;models:Model[];role:Role}){
 const sec=config?.security;return <div className="system-stack"><div className="system-card"><div className="system-card-title">{role==='security'?<ShieldCheck size={18}/>:<Activity size={18}/>}<div><h3>{role==='security'?'Security Control':'Operations Control'}</h3><p>{role==='security'?'AI/KB security, secrets и audit.':'Техническое состояние control plane.'}</p></div></div><div className="system-kv"><span>Privileged writes</span><strong>{sec?.privilegedWritesEnabled?'CONTROLLED':'LOCKED'}</strong><span>Secrets exposed</span><strong>{sec?.secretsExposed?'YES':'NO'}</strong><span>Prompt bodies exposed</span><strong>{sec?.promptBodiesExposed?'YES':'NO'}</strong><span>Audit required</span><strong>{sec?.auditRequired?'YES':'NO'}</strong><span>Control version</span><strong>{config?.control?.version||1}</strong><span>Updated</span><strong>{config?.control?.updatedAt||'never'}</strong></div></div>
  <div className="system-card"><div className="system-card-title"><KeyRound size={18}/><div><h3>Audit Ledger</h3><p>Последние привилегированные изменения; token values не записываются.</p></div></div><div className="system-audit-list">{config?.audit?.length?config.audit.map(e=><div key={e.eventId}><strong>{e.action}</strong><span>{e.role} · {e.target}</span><small>{e.at} · v{e.stateVersion} · {e.reason}</small></div>):<p className="system-muted">Событий пока нет.</p>}</div><p className="system-muted">Текущий каталог моделей: {models.length} записей.</p></div></div>;
}

function Toggle({label,value,onChange}:{label:string;value:boolean;onChange:(v:boolean)=>void}){return <button className={'system-toggle '+(value?'on':'')} type="button" onClick={()=>onChange(!value)}><span>{label}</span><b>{value?'ON':'OFF'}</b></button>;}
function Metric({label,value,tone=''}:{label:string;value:string;tone?:string}){return <div className={'system-metric '+tone}><span>{label}</span><strong>{value}</strong></div>;}
