export const profiles = {
 sales: {name:'Продажи и торговля',short:'Продажи',icon:'bag',company:'Northline Store',subtitle:'Товары, заказы и отношения с клиентами',unit:'заказ',entity:'Заказы',people:'Клиенты',resource:'Склад',accent:'#7560db',goal:'Помочь выбрать товар и оформить заказ',prompt:'Хочу заказать оборудование для офиса',greeting:'Здравствуйте! Помогу выбрать товар, оформить заказ или связаться с менеджером.',stages:['Новая заявка','Подбор','Подтверждено','Завершено'],catalog:[{id:'s1',name:'Рабочая станция',price:64900,stock:12},{id:'s2',name:'Монитор 27″',price:24900,stock:24},{id:'s3',name:'Комплект периферии',price:6900,stock:38}],specialists:['Анна · Продажи','Дмитрий · Доставка','Мария · Поддержка']},
 medical:{name:'Клиника и медицина',short:'Клиника',icon:'heart',company:'Клиника «Баланс»',subtitle:'Записи на приём и забота о сервисе',unit:'запись',entity:'Записи на приём',people:'Пациенты',resource:'Услуги',accent:'#329b94',goal:'Записать на приём к выбранному специалисту',prompt:'Хочу записаться к терапевту',greeting:'Здравствуйте! Помогу с записью к специалисту или передам вопрос администратору. Медицинские консультации здесь не проводятся.',stages:['Обращение','Уточнение','Подтверждено','Завершено'],catalog:[{id:'m1',name:'Приём терапевта',price:2500,slots:['Завтра, 10:00','Завтра, 14:30','Пятница, 11:00']},{id:'m2',name:'Приём кардиолога',price:3900,slots:['Завтра, 12:00','Пятница, 15:00']},{id:'m3',name:'Профилактический осмотр',price:5900,slots:['Пятница, 09:00','Пятница, 12:00']},{id:'m4',name:'Приём хирурга',price:3500,slots:['Завтра, 10:00','Завтра, 14:30','Пятница, 11:00']}],specialists:['Елена · Администратор','Алексей · Координатор','Ольга · Регистратура']},
 sport:{name:'Спорткомплекс',short:'Спорт',icon:'activity',company:'Пульс · Спорткомплекс',subtitle:'Абонементы, тренировки и новые привычки',unit:'запись',entity:'Записи и абонементы',people:'Участники',resource:'Занятия',accent:'#da8b43',goal:'Подобрать занятие и записать на тренировку',prompt:'Хочу записаться на пробную тренировку',greeting:'Здравствуйте! Помогу выбрать тренировку, оформить пробное занятие или передам вопрос менеджеру.',stages:['Интерес','Подбор','Подтверждено','Завершено'],catalog:[{id:'p1',name:'Пробная тренировка',price:500,slots:['Завтра, 09:00','Завтра, 18:00','Пятница, 19:00']},{id:'p2',name:'Бассейн · разовое посещение',price:900,slots:['Завтра, 08:00','Завтра, 17:00']},{id:'p3',name:'Персональная тренировка',price:2500,slots:['Пятница, 10:00','Пятница, 18:00']}],specialists:['Иван · Менеджер клуба','Алёна · Администратор','Максим · Тренер']},
 auto:{name:'Автосервис',short:'Автосервис',icon:'tool',company:'Гараж 24',subtitle:'От первого вопроса до готового автомобиля',unit:'заказ-наряд',entity:'Заказ-наряды',people:'Клиенты',resource:'Работы',accent:'#538ccd',goal:'Уточнить услугу и создать заявку мастеру',prompt:'Нужно записаться на диагностику автомобиля',greeting:'Здравствуйте! Помогу выбрать услугу и время визита. Окончательную стоимость работ подтвердит мастер.',stages:['Обращение','Согласование','Подтверждено','Завершено'],catalog:[{id:'a1',name:'Диагностика автомобиля',price:1500,slots:['Завтра, 10:00','Завтра, 16:00']},{id:'a2',name:'Замена масла · работа',price:1200,slots:['Завтра, 11:00','Пятница, 12:00']},{id:'a3',name:'Шиномонтаж · от',price:2400,slots:['Пятница, 09:00','Пятница, 15:00']}],specialists:['Сергей · Мастер-приёмщик','Антон · Сервис','Виктор · Запчасти']},
 massage:{name:'Массажный салон',short:'Массаж',icon:'spark',company:'Тихо · Студия массажа',subtitle:'Запись на сеанс и персональный сервис',unit:'запись',entity:'Записи на сеанс',people:'Гости',resource:'Процедуры',accent:'#bc779e',goal:'Подобрать сеанс и согласовать запись',prompt:'Хочу записаться на расслабляющий массаж',greeting:'Здравствуйте! Помогу выбрать сеанс и удобное время. Вопросы о противопоказаниях передам специалисту.',stages:['Обращение','Подбор','Подтверждено','Завершено'],catalog:[{id:'r1',name:'Расслабляющий массаж · 60 мин',price:3500,slots:['Завтра, 12:00','Завтра, 18:00']},{id:'r2',name:'Массаж спины · 30 мин',price:2200,slots:['Завтра, 11:00','Пятница, 17:00']},{id:'r3',name:'Подарочный сеанс · 90 мин',price:4900,slots:['Пятница, 12:00','Пятница, 15:00']}],specialists:['Анна · Администратор','Мария · Специалист','Екатерина · Сервис']},
 warehouse:{name:'Склад и оптовая торговля',short:'Склад',icon:'box',company:'Оптима · Снабжение',subtitle:'Наличие, комплектация и отгрузка',unit:'заказ',entity:'Заказы на отгрузку',people:'Контрагенты',resource:'Остатки',accent:'#6f91a0',goal:'Подобрать позицию и оформить заявку на поставку',prompt:'Хочу заказать партию товара со склада',greeting:'Здравствуйте! Помогу проверить ассортимент и создать заказ на поставку. Условия доставки согласует менеджер.',stages:['Запрос','Комплектация','Подтверждено','Завершено'],catalog:[{id:'w1',name:'Бумага А4 · коробка',price:2100,stock:80},{id:'w2',name:'Упаковка · комплект',price:900,stock:140},{id:'w3',name:'Расходные материалы · набор',price:3900,stock:46}],specialists:['Артём · Оптовые продажи','Юлия · Логистика','Павел · Склад']}
};
export const channels=['Telegram','Телефон','Email','Чат на сайте'];
export const money=n=>new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:0}).format(n);
const names=['Анна Миронова','Дмитрий Волков','Елена Соколова','Михаил Орлов','Дарья Белова','Алексей Ким','София Лебедева','Андрей Петров'];
export function seedProfile(id,now=Date.now()){
 const p=profiles[id];
 const clients=names.map((name,i)=>({id:`${id}-c${i}`,name,contact:`client${i+1}@example.test`,company:['Личный клиент','ООО «Вектор»','Личный клиент','Студия «Форма»'][i%4]}));
 const records=Array.from({length:24},(_,i)=>({id:`${id}-${1001+i}`,clientId:clients[i%8].id,client:clients[i%8].name,contact:clients[i%8].contact,item:p.catalog[i%3].name,itemId:p.catalog[i%3].id,amount:p.catalog[i%3].price,quantity:1,stage:[0,1,2,3,3,2][i%6],channel:channels[i%4],owner:p.specialists[i%3],created:new Date(now-(i*27+2)*3600000).toISOString(),slot:p.catalog[i%3].slots?.[i%2]||'Согласовать доставку',source:'seed'}));
 return {clients,records,sessions:[],history:[],settings:{greeting:p.greeting,goal:p.goal},stock:Object.fromEntries(p.catalog.filter(i=>i.stock!==undefined).map(i=>[i.id,i.stock]))};
}
export function newSession(id,channel='Чат на сайте',greeting){return {id:crypto.randomUUID(),profile:id,channel,step:'intent',itemId:null,quantity:1,slot:null,contact:'',name:'',messages:[{role:'bot',text:greeting||profiles[id].greeting}],created:new Date().toISOString(),recordId:null};}
export function optionsFor(s){const p=profiles[s.profile];if(s.step==='intent')return [{label:s.profile==='medical'?'Записаться к врачу':'Оформить заявку',value:'new'},{label:'Моя история',value:'history'},{label:'Позвать специалиста',value:'human'}];if(s.step==='item')return p.catalog.map(i=>({label:i.name,value:i.id}));if(s.step==='slot')return p.catalog.find(i=>i.id===s.itemId).slots.map(slot=>({label:slot,value:slot}));if(s.step==='confirm')return [{label:'Подтвердить заявку',value:'confirm'},{label:'Изменить выбор',value:'restart'}];if(s.step==='history-result')return [{label:'Оформить новую заявку',value:'restart'},{label:'Позвать специалиста',value:'human'}];return [];}
export function advance(session,input,data){
 const s=structuredClone(session),p=profiles[s.profile],raw=input.trim(),value=raw.toLowerCase();
 if(!raw)return {session:s};
 const choice=optionsFor(s).find(o=>o.value===raw);s.messages.push({role:'user',text:choice?.label||raw});
 const say=(text)=>s.messages.push({role:'bot',text});
 if(s.step==='done'||s.step==='human'){say('Этот диалог завершён. Начните новый диалог, чтобы создать отдельное обращение.');return {session:s};}
 if(/слышно|слышишь|слышите|проверка (связи|микрофона)/.test(value)||/^(?:\d+[\s,.!;-]*){3,}$/.test(value)){say('Ваше сообщение получено. Если это проверка микрофона — распознанный текст появился в диалоге. '+(s.profile==='medical'?'К какому врачу хотите записаться?':'Как я могу помочь?'));return {session:s};}
 if(s.profile!=='medical'&&/хирург|терапевт|кардиолог|запис.+врач/.test(value)){say('Вы обращаетесь по поводу записи к врачу, а сейчас открыт другой профиль. Выберите «Клиника» и начните беседу — здесь не будем оформлять товар вместо приёма.');return {session:s};}
 if((s.profile==='medical'||s.profile==='massage')&&/диагноз|лекарств|симптом|болит|боль|противопоказ|лечени/.test(value)){s.step='human';say('Этот вопрос требует специалиста. Бот помогает с организацией записи и не даёт медицинских рекомендаций. Создана демонстрационная передача администратору.');return {session:s};}
 if(s.profile==='medical'){
  const doctorTerms=[/терапевт|терапи/i,/кардиолог/i,/профилактич|осмотр/i,/хирург/i];
  const found=p.catalog.filter((item,i)=>doctorTerms[i]?.test(raw));
  if(found.length>1){s.step='item';s.itemId=null;s.slot=null;s.name='';s.contact='';say('Уточните, пожалуйста, какой приём нужен: '+found.map(i=>i.name.toLowerCase()).join(' или ')+'? Выберите один вариант ниже.');return {session:s};}
  if(found.length===1&&['intent','item','slot','name','contact','confirm'].includes(s.step)){
   const item=found[0];s.itemId=item.id;s.quantity=1;s.slot=null;s.name='';s.contact='';s.step='slot';say(`${item.name}. Стоимость в демо: ${money(item.price)}. Удобнее завтра в ${item.slots[0].split(', ')[1]} или ${item.slots[1]?.split(', ')[1]||'другой день'}? Можно выбрать время кнопкой. Администратор подтвердит запись.`);return {session:s};
  }
  if(s.step==='intent'&&/запис|при[её]м|врач|поликлиник/.test(value)){s.step='item';say('К какому врачу вас записать: терапевту, хирургу или кардиологу?');return {session:s};}
 }
 if(raw==='human'||/оператор|человек|специалист|жалоб/.test(value)){s.step='human';say('Передаю вопрос в демонстрационную очередь специалисту. Контекст разговора сохранён. Внешняя отправка ещё не подключена.');return {session:s};}
 if(raw==='restart'||/другая услуга|изменить выбор|сменить услугу/.test(value)){s.step='item';s.itemId=null;s.slot=null;s.quantity=1;s.contact='';s.name='';say('Выберем заново. Какая позиция или услуга вам нужна?');return {session:s};}
 if(raw==='history'||/история|мои заказы|моя запись|статус заказ/.test(value)){s.step='history-contact';say('Для демонстрации введите контакт client1@example.test. В рабочей версии перед показом истории потребуется подтверждение личности.');return {session:s};}
 if(s.step==='intent'){
  s.step='item';
  const terms={sales:[/компьютер|станци/i,/монитор/i,/перифери|клавиатур/i],medical:[/терапевт/i,/кардиолог/i,/профилактич|осмотр/i],sport:[/пробн/i,/бассейн/i,/персональн/i],auto:[/диагностик/i,/масл/i,/шиномонтаж|шин/i],massage:[/расслабля/i,/спин/i,/подароч/i],warehouse:[/бумаг/i,/упаковк/i,/расходн/i]}[s.profile];
  const found=p.catalog.filter((item,i)=>terms[i]?.test(raw));
  if(raw!=='new'&&found.length===1){const item=found[0];s.itemId=item.id;s.step=item.stock!==undefined?'quantity':'slot';say(`${item.name}: ${money(item.price)}. ${item.stock!==undefined?`Доступно ${data.stock[item.id]} шт. Какое количество нужно?`:'Выберите время из демонстрационного расписания. Администратор подтвердит запись.'}`);}
  else say(`Помогу: ${data.settings.goal.toLowerCase()}. Выберите вариант из каталога ниже.`);
  return {session:s};
 }
 if(s.step==='history-contact'){
  const c=data.clients.find(c=>c.contact.toLowerCase()===value);s.step='history-result';
  say(c?`${c.name}, в демонстрационной истории:\n${data.records.filter(r=>r.clientId===c.id).slice(-3).map(r=>`${r.id} · ${r.item} · ${p.stages[r.stage]}`).join('\n')}`:'Совпадений в локальной истории нет. Можно создать новую заявку или обратиться к специалисту.');return {session:s};
 }
 if(s.step==='item'){
  const item=p.catalog.find(i=>i.id===raw||i.name.toLowerCase()===value);
  if(!item){say('Выберите один из вариантов ниже. Так цена и услуга будут взяты из каталога без догадок.');return {session:s};}
  s.itemId=item.id;
  if(item.stock!==undefined){s.step='quantity';say(`${item.name}: ${money(item.price)} за единицу. Доступно ${data.stock[item.id]} шт. Какое количество нужно? Введите целое число.`);}
  else{s.step='slot';say(`${item.name}: ${money(item.price)}. Выберите время из демонстрационного расписания. Запись создаёт заявку на согласование.`);}return {session:s};
 }
 if(s.step==='quantity'){
  const n=Number(raw);if(!/^\d+$/.test(raw)||!Number.isSafeInteger(n)||n<1||n>data.stock[s.itemId]){say(`Введите количество от 1 до ${data.stock[s.itemId]}. Если остатка не хватает, позовите специалиста.`);return {session:s};}s.quantity=n;s.slot='Согласовать доставку';s.step='name';say('Как к вам обращаться?');return {session:s};
 }
 if(s.step==='slot'){const slots=p.catalog.find(i=>i.id===s.itemId).slots;let chosen=slots.includes(raw)?raw:null;if(!chosen&&s.profile==='medical'){const candidates=slots.filter(slot=>{const day=slot.toLowerCase().includes('пятниц')?/пятниц/.test(value):/завтра/.test(value);const time=slot.split(', ')[1];return day&&(value.includes(time)||time==='10:00'&&/утр|десять|\b10\b/.test(value)||time==='14:30'&&/после обеда|четырнадцать|два тридцать/.test(value)||time==='11:00'&&/одиннадцать/.test(value));});if(candidates.length===1)chosen=candidates[0];}if(!chosen){say('Подскажите день и время. Доступные варианты показаны ниже; можно нажать подходящий.');return {session:s};}s.slot=chosen;s.step='name';say('Как к вам обращаться?');return {session:s};}
 if(s.step==='name'){if(raw.length<2||raw.length>100){say('Укажите имя длиной от 2 до 100 символов.');return {session:s};}s.name=s.profile==='medical'?raw.replace(/^(меня зовут|мо[её] имя|я)\s+/i,'').replace(/[.!]+$/,''):raw;s.step='contact';say('Укажите email или телефон для связи. Для теста можно использовать client1@example.test.');return {session:s};}
 if(s.step==='contact'){
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)&&!/^\+?[\d ()-]{7,24}$/.test(raw)){say('Контакт не распознан. Введите email или телефон с кодом города.');return {session:s};}
  s.contact=raw;s.step='confirm';const item=p.catalog.find(i=>i.id===s.itemId);
  say(`Проверьте заявку:\n${item.name}${s.quantity>1?` × ${s.quantity}`:''}\nСумма: ${money(item.price*s.quantity)}\n${s.slot}\n${s.name} · ${s.contact}\n\nСоздать заявку в локальной CRM? ${item.stock!==undefined?'Товар будет зарезервирован в демо-остатках.':'Время дополнительно подтвердит администратор.'}`);return {session:s};
 }
 if(s.step==='confirm'){
  if(raw!=='confirm'&&!(s.profile==='medical'&&/^(да|да[, ]+подтверждаю|подтверждаю|подтвердить|вс[её] верно|да[, ]+вс[её] верно)[.! ]*$/i.test(raw))){say('Нажмите «Подтвердить заявку» или «Изменить выбор». Без подтверждения заявка не создаётся.');return {session:s};}
  const item=p.catalog.find(i=>i.id===s.itemId);if(item.stock!==undefined&&data.stock[item.id]<s.quantity){s.step='quantity';say('Остаток изменился. Укажите доступное количество или позовите специалиста.');return {session:s};}
  const existing=data.clients.find(c=>c.contact.toLowerCase()===s.contact.toLowerCase());
  const client=existing||{id:crypto.randomUUID(),name:s.name,contact:s.contact,company:'Новый клиент'};
  const record={id:`${s.profile}-${crypto.randomUUID().slice(0,8)}`,clientId:client.id,client:client.name,contact:client.contact,item:item.name,itemId:item.id,amount:item.price*s.quantity,quantity:s.quantity,stage:0,channel:s.channel,owner:p.specialists[0],created:new Date().toISOString(),slot:s.slot,source:'bot'};
  s.step='done';s.recordId=record.id;say(`Готово! Заявка ${record.id} создана. ${p.specialists[0]} согласует детали. Она уже доступна в CRM вместе с историей диалога. Это локальная демонстрация — сообщение клиенту во внешний канал не отправлялось.`);
  return {session:s,record,client:existing?null:client};
 }
 say('Выберите следующий шаг или позовите специалиста.');return {session:s};
}
export function metrics(data,days,now=Date.now()){
 const records=data.records.filter(r=>now-Date.parse(r.created)<=days*86400000);
 const sum=records.reduce((n,r)=>n+r.amount,0),completed=records.filter(r=>r.stage===3).length;
 return {records,sum,completed,conversion:records.length?Math.round(completed/records.length*100):0,byChannel:channels.map(c=>({name:c,count:records.filter(r=>r.channel===c).length})),byStage:[0,1,2,3].map(i=>records.filter(r=>r.stage===i).length)};
}
export function summarizeSession(s,data){
 const p=profiles[s.profile],item=p.catalog.find(i=>i.id===s.itemId);
 return `Профиль: ${p.name}\nКанал: ${s.channel}\nКлиент: ${s.name||'Не указан'}\nКонтакт: ${s.contact||'Не указан'}\n\nРезультат обращения\n${item?`${item.name} · ${money(item.price*s.quantity)}\n${s.slot||'Время не выбрано'}`:'Услуга или товар ещё не выбраны.'}\n${s.recordId?`Создана заявка ${s.recordId}.`:'Заявка ещё не создана.'}\n\nСледующий шаг\n${s.step==='human'?'Специалисту изучить историю и ответить клиенту.':s.step==='done'?'Ответственному подтвердить детали заявки.':'Продолжить уточнение данных в диалоге.'}\n\nКонтекст разговора\n${s.messages.filter(m=>m.role==='user').map(m=>m.text).join(' → ')}\n\n${s.example?'Учебный пример обращения Виктора. Реального звонка или заказа не было.\n':''}Разбор сформирован из состояния сценария, без LLM.`;
}
export function seedPersonalHistory(id,data){
 if(data.personalExamplesVersion===1)return;
 const p=profiles[id];
 for(let i=0;i<3;i++){
  let s=newSession(id,['Телефон','Telegram','Email'][i],data.settings.greeting);
  const item=p.catalog[i];
  const input=['new',item.id,item.stock!==undefined?'1':item.slots[0],'Виктор','viktor@example.test','confirm'];
  for(const message of input){const r=advance(s,message,data);s=r.session;if(r.client)data.clients.push(r.client);if(r.record){r.record.source='personal-demo';r.record.stage=[3,2,0][i];r.record.created=new Date(Date.now()-(i+1)*86400000).toISOString();data.records.unshift(r.record);}}
  s.example=true;s.created=new Date(Date.now()-(i+1)*86400000).toISOString();data.sessions.push(s);
 }
 if(!data.history.length)data.history=data.sessions.filter(s=>s.example).slice(0,3).map(s=>({id:crypto.randomUUID(),sessionId:s.id,title:`Виктор · ${p.catalog.find(i=>i.id===s.itemId)?.name}`,created:s.created,text:summarizeSession(s,data)}));
 data.personalExamplesVersion=1;
}
