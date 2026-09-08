const $ = s => document.querySelector(s);
const escape = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const teams = ['Нужно уточнить', 'Отдел продаж', 'Техническая поддержка', 'Бухгалтерия', 'Служба доставки'];
const channels = ['Telegram', 'Телефон / автоответчик', 'Email', 'Чат на сайте', 'Другой канал'];
const icons = {'Telegram':'↗','Телефон / автоответчик':'☎','Email':'✉','Чат на сайте':'◉','Другой канал':'◇'};
const statusText = {new:'Новое',work:'В работе',closed:'Закрыто'};
const key = 'bookcraft.crm.prototype.v1';
const stamp = () => new Date().toISOString();
const uid = () => crypto.randomUUID();
const date = v => new Date(v).toLocaleString('ru-RU', {day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
const initials = n => n.split(/\s+/).slice(0,2).map(s=>s[0]).join('');
const normalize = s => s.trim().toLowerCase();
function seed() {
 const clients = [
  {id:'c1',name:'Анна Миронова',contacts:['anna@example.test','@anna_demo'],orders:[{id:'ЗК-2048',title:'Комплект оборудования · 24 900 ₽',status:'Передан в доставку'}]},
  {id:'c2',name:'Дмитрий Волков',contacts:['dmitry@example.test'],orders:[{id:'ЗК-2041',title:'Обслуживание · 8 500 ₽',status:'Ожидает оплаты'}]},
  {id:'c3',name:'Елена Соколова',contacts:['@elena_demo'],orders:[]},
  {id:'c4',name:'Михаил Орлов',contacts:['+7 000 000-00-04'],orders:[{id:'ЗК-2032',title:'Подключение сервиса · 12 000 ₽',status:'Выполнен'}]}
 ];
 const ago = m => new Date(Date.now()-m*60000).toISOString();
 const tickets = [
  {id:'ОБ-1048',clientId:'c1',channel:'Telegram',title:'Когда привезут мой заказ?',text:'Здравствуйте! Подскажите, когда доставят заказ ЗК-2048? Вчера обещали прислать время доставки, но сообщения пока нет. Желательно привезти до пятницы.',team:'Служба доставки',status:'new',created:ago(8)},
  {id:'ОБ-1047',clientId:'c2',channel:'Email',title:'Нужен счёт для оплаты',text:'Добрый день! Пришлите, пожалуйста, счёт по заказу ЗК-2041. Оплату проведём от юридического лица, реквизиты уже отправляли.',team:'Бухгалтерия',status:'work',created:ago(26)},
  {id:'ОБ-1046',clientId:'c3',channel:'Чат на сайте',title:'Подобрать тариф для команды',text:'Здравствуйте! Хотим купить сервис для команды из 12 человек. Сколько стоит тариф с несколькими каналами связи?',team:'Отдел продаж',status:'new',created:ago(48)},
  {id:'ОБ-1045',clientId:'c4',channel:'Телефон / автоответчик',title:'Не получается войти в кабинет',text:'Добрый день. После подключения не работает вход в личный кабинет. Появляется ошибка. Помогите, пожалуйста.',team:'Техническая поддержка',status:'work',created:ago(70),fileName:'Автоответчик · пример расшифровки'},
  {id:'ОБ-1044',clientId:'c1',channel:'Email',title:'Уточнение адреса доставки',text:'Пожалуйста, доставьте заказ ЗК-2048 в офис. Адрес уточнили при оформлении. Спасибо!',team:'Служба доставки',status:'closed',created:ago(1440)},
  {id:'ОБ-1043',clientId:'c3',channel:'Telegram',title:'Вопрос по сотрудничеству',text:'Можно обсудить наше предложение? Не знаю, к кому обратиться.',team:'Нужно уточнить',status:'new',created:ago(110)}
 ];
 return {version:1,clients,tickets,history:[]};
}
let state;
try { const saved=JSON.parse(localStorage.getItem(key)); if(saved?.version!==1 || !Array.isArray(saved.clients)||!Array.isArray(saved.tickets)||!Array.isArray(saved.history)) throw Error(); state=saved; } catch {state=seed();}
let selected=state.tickets[0]?.id, filter='all',view='all',query='',activeHistory=null,job=null;
const audioUrls = new Map();
let toastTimer;
function toast(text){$('#toast').textContent=text;$('#toast').style.display='block';clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').style.display='none',4000);}
function save(){try{localStorage.setItem(key,JSON.stringify(state));}catch{toast('Не удалось сохранить в браузере. Текущие данные доступны до закрытия страницы.');}}
function analyze(text) {
 const rules=[['Бухгалтерия',/сч[её]т|оплат|реквизит|возврат денег/i],['Техническая поддержка',/ошибк|не работает|не получается|не могу|сломал/i],['Служба доставки',/достав|привез|курьер|посылк/i],['Отдел продаж',/купить|стоим|тариф|цена|сколько стоит|заказать/i]];
 const matches=rules.filter(([,r])=>r.test(text));
 const team=matches.length===1?matches[0][0]:'Нужно уточнить';
 const urgent=/срочно|немедленно|авари/i.test(text);
 return {team,urgent,analysis:`Суть обращения\n${text.slice(0,260)}${text.length>260?'…':''}\n\nНаправление: ${team}.\nПриоритет: ${urgent?'повышенный — проверьте вручную':'обычный'}.\n\nСледующий шаг\n${team==='Нужно уточнить'?'Уточните тему и вручную выберите специалиста: текст не дал однозначного направления.':'Ответственному нужно проверить историю клиента и связанные заказы, затем ответить по исходному каналу.'}\n\nМетод: демонстрационные правила по ключевым словам. Это не ответ AI-модели.`};
}
function recordAnalysis(ticket,result) {
 ticket.analysis=result.analysis;ticket.team=result.team;ticket.urgent=result.urgent;
 const entry={id:uid(),ticketId:ticket.id,title:ticket.fileName||ticket.title,created:stamp(),text:result.analysis};
 state.history=[entry,...state.history].slice(0,3);activeHistory=entry.id;save();
}
function render(){
 $('#nav-count').textContent=state.tickets.length;
 $('#stats').innerHTML=[['Всего обращений',state.tickets.length,'Из всех каналов'],['Ждут ответа',state.tickets.filter(t=>t.status==='new').length,'Новые обращения'],['В работе',state.tickets.filter(t=>t.status==='work').length,'У специалистов'],['Нужно уточнить',state.tickets.filter(t=>t.team===teams[0]&&t.status!=='closed').length,'Требуется решение сотрудника']].map(([l,n,s])=>`<div class="stat"><div class="stat-label">${l}</div><strong>${n.toString().padStart(2,'0')}</strong><small>${s}</small></div>`).join('');
 $('#channels').innerHTML=channels.map(c=>`<div class="channel"><span>${icons[c]} &nbsp; ${c==='Телефон / автоответчик'?'Телефония':c}</span><span>Не подключён</span></div>`).join('');
 document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
 document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('selected',b.dataset.filter===filter));
 $('#list-title').textContent={all:'Входящие обращения',review:'Нужно уточнить',orders:'Обращения с заказами'}[view];
 const visible=state.tickets.filter(t=>{const c=state.clients.find(c=>c.id===t.clientId);return (filter==='all'||t.status===filter)&&(view!=='review'||t.team===teams[0]&&t.status!=='closed')&&(view!=='orders'||c.orders.length)&&(normalize([t.id,t.title,t.text,c.name,...c.contacts].join(' ')).includes(normalize(query)));});
 $('#list-count').textContent=visible.length;
 $('#inbox-list').innerHTML=visible.length?visible.map(t=>{const c=state.clients.find(c=>c.id===t.clientId);return `<button class="ticket ${selected===t.id?'active':''}" data-ticket="${escape(t.id)}" aria-pressed="${selected===t.id}"><div class="ticket-top"><span class="avatar">${escape(initials(c.name))}</span><strong>${escape(c.name)}</strong><small>${date(t.created).split(', ').pop()}</small></div><h3>${escape(t.title)}</h3><p>${escape(t.text)}</p><div class="ticket-meta">${icons[t.channel]||'◇'} ${escape(t.channel)} <span class="pill ${t.status==='new'?'amber':t.status==='work'?'blue':''}">${statusText[t.status]}</span></div></button>`;}).join(''):'<div class="empty">Обращений не найдено. Измените поиск или фильтр.</div>';
 renderDetail();
 $('#history-count').textContent=`${state.history.length} / 3`;
 $('#history').innerHTML=state.history.length?state.history.map(h=>`<button class="history-card ${activeHistory===h.id?'active':''}" data-history="${h.id}"><small>✓ Готово · ${date(h.created)}</small><strong>${escape(h.title)}</strong><p>Открыть сохранённый результат →</p></button>`).join(''):'<div class="empty">Пока нет анализов. Разберите любое обращение — здесь появится сохранённый результат.</div>';
}
function renderDetail(){
 const t=state.tickets.find(t=>t.id===selected);if(!t){$('#detail').innerHTML='<div class="empty">Выберите обращение</div>';$('#context').innerHTML='';return;}
 const c=state.clients.find(c=>c.id===t.clientId),h=state.history.find(h=>h.id===activeHistory&&h.ticketId===t.id),result=h?.text||t.analysis;
 $('#detail').innerHTML=`<div class="detail-top"><span>${escape(t.id)} · ${date(t.created)}</span><span class="pill ${t.status==='new'?'amber':'blue'}">${statusText[t.status]}</span></div><h2>${escape(t.title)}</h2><div class="person"><span class="avatar">${escape(initials(c.name))}</span><div>${escape(c.name)}<small>${escape(t.channel)} · ${escape(c.contacts[0])}</small></div></div><div class="label">Исходное обращение</div><div class="message">${escape(t.text)}</div>${t.fileName?`<p>♫ ${escape(t.fileName)}</p>${audioUrls.has(t.id)?`<audio controls src="${audioUrls.get(t.id)}"></audio>`:'<p>Аудиофайл не хранится после перезагрузки; сохранена расшифровка.</p>'}`:''}<div class="analysis"><div class="analysis-head"><span>✧ Результат анализа</span><span class="pill">${result?'✓ Готово':'Ожидает разбора'}</span></div>${result?`<pre>${escape(result)}</pre>`:'<p>Разберите обращение, чтобы получить направление и следующий шаг.</p>'}<small>Локальный демонстрационный разбор</small></div><div class="assignment"><label>Ответственный отдел<select id="team">${teams.map(team=>`<option ${team===t.team?'selected':''}>${team}</option>`).join('')}</select></label></div><div class="actions"><button class="primary" id="analyze">${result?'Повторить разбор':'Разобрать обращение'}</button><button id="change-status">${t.status==='closed'?'Открыть снова':t.status==='new'?'Взять в работу':'Закрыть обращение'}</button><button id="export">Скачать результат</button></div>`;
 const related=state.tickets.filter(x=>x.clientId===c.id).sort((a,b)=>b.created.localeCompare(a.created));
 $('#context').innerHTML=`<h2>Контекст клиента</h2><div class="client-card"><span class="avatar">${escape(initials(c.name))}</span><strong>${escape(c.name)}</strong><p>${c.contacts.map(escape).join('<br>')}</p><span class="pill">${related.length} обращ. · ${c.orders.length} заказ.</span></div><div><div class="label">Связанные заказы</div>${c.orders.length?c.orders.map(o=>`<div class="order"><strong>${escape(o.id)} ↗</strong><p>${escape(o.title)}</p><span class="pill">${escape(o.status)}</span></div>`).join(''):'<p>Заказов пока нет. Здесь также могут быть заявки, договоры или записи на услугу.</p>'}<p>В примере заказы связаны с карточкой клиента; связь с конкретным обращением требует подтверждения.</p></div><div><div class="label">История обращений</div>${related.map(x=>`<div class="timeline-item"><button data-ticket="${escape(x.id)}">${escape(x.title)}</button><small>${date(x.created)} · ${escape(x.channel)}</small><span>${statusText[x.status]}</span></div>`).join('')}</div>`;
 $('#team').onchange=e=>{t.team=e.target.value;save();render();toast('Ответственный отдел обновлён');};
 $('#change-status').onclick=()=>{t.status=t.status==='new'?'work':t.status==='work'?'closed':'work';save();render();};
 $('#analyze').onclick=()=>{recordAnalysis(t,analyze(t.text));render();toast('Разбор готов. Результат сохранён в историю.');};
 $('#export').onclick=()=>{if(!result){toast('Сначала получите результат анализа');return;}const blob=new Blob([`${t.title}\n\n${result}`],{type:'text/plain;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${t.id}-analysis.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);};
}
document.addEventListener('click',e=>{
 const ticket=e.target.closest('[data-ticket]');if(ticket){selected=ticket.dataset.ticket;activeHistory=null;render();}
 const history=e.target.closest('[data-history]');if(history){const h=state.history.find(h=>h.id===history.dataset.history);selected=h.ticketId;activeHistory=h.id;render();$('#detail').scrollIntoView({behavior:'smooth',block:'nearest'});}
 const f=e.target.closest('[data-filter]');if(f){filter=f.dataset.filter;render();}
 const v=e.target.closest('[data-view]');if(v){view=v.dataset.view;render();}
});
$('#search').oninput=e=>{query=e.target.value;render();};
$('#new').onclick=()=>$('#compose').showModal();
const form=$('#form');
function setBusy(b){form.querySelectorAll('input,textarea,select').forEach(i=>i.disabled=b);$('#submit').disabled=b;$('#clear').disabled=b;$('#cancel-job').hidden=!b;}
function cancel(){if(job){clearTimeout(job);job=null;setBusy(false);$('#form-status').textContent='Обработка отменена. Введённые данные сохранены.';}}
$('#cancel-job').onclick=cancel;
$('#dismiss').onclick=()=>{cancel();$('#compose').close();};
$('#compose').addEventListener('cancel',()=>cancel());
$('#clear').onclick=()=>{form.reset();$('#form-status').textContent='Ввод очищен. История анализов сохранена.';$('#file-hint').textContent='Для разбора записи вставьте её расшифровку выше.';};
form.elements.audio.onchange=()=>{const file=form.elements.audio.files[0];$('#file-hint').textContent=file?`Получили: ${file.name}. Добавьте расшифровку — распознавание пока не подключено.`:'Для разбора записи вставьте её расшифровку выше.';};
form.onsubmit=e=>{
 e.preventDefault();if(job)return;
 const name=form.elements.name.value.trim(),contact=form.elements.contact.value.trim(),text=form.elements.text.value.trim(),channel=form.elements.channel.value,file=form.elements.audio.files[0],fail=form.elements.failure.checked;
 const error=message=>$('#form-status').textContent=message;
 if(!name||!contact){error('Укажите имя и контакт клиента.');return;}
 if(file&&(!/\.(mp3|wav|m4a|ogg|webm)$/i.test(file.name)||file.size>25*1024*1024||file.size===0)){error('Выберите непустой MP3, WAV, M4A, OGG или WEBM до 25 МБ. Ввод сохранён.');return;}
 if(!text){error(file?'Распознавание ещё не подключено. Вставьте расшифровку записи.':'Добавьте текст сообщения или расшифровку звонка.');return;}
 setBusy(true);error('Обрабатываю… Выполняется демонстрационный разбор, обычно около секунды.');
 job=setTimeout(()=>{
  job=null;setBusy(false);
  if(fail){error('Демонстрация ошибки: сервис недоступен. Данные сохранены. Снимите флажок имитации и повторите.');return;}
  let c=state.clients.find(c=>c.contacts.some(x=>normalize(x)===normalize(contact)));
  if(!c){c={id:uid(),name,contacts:[contact],orders:[]};state.clients.push(c);}
  const number=Math.max(1048,...state.tickets.map(t=>Number(t.id.split('-').pop())||0))+1;
  const t={id:`ОБ-${number}`,clientId:c.id,channel,title:text.split(/[.!?\n]/)[0].slice(0,65)||'Новое обращение',text,status:'new',created:stamp(),fileName:file?.name};
  state.tickets.unshift(t);if(file)audioUrls.set(t.id,URL.createObjectURL(file));recordAnalysis(t,analyze(text));selected=t.id;view='all';filter='all';query='';$('#search').value='';render();form.reset();$('#file-hint').textContent='Для разбора записи вставьте её расшифровку выше.';error('');$('#compose').close();toast('Обращение сохранено и связано с историей клиента.');
 },1100);
};
$('#reset').onclick=()=>{if(!confirm('Удалить локальные обращения и анализы и восстановить демонстрационные примеры?'))return;for(const url of audioUrls.values())URL.revokeObjectURL(url);audioUrls.clear();state=seed();selected=state.tickets[0].id;activeHistory=null;filter='all';view='all';query='';$('#search').value='';save();render();};
render();
