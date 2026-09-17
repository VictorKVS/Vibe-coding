export type EvidenceSource={id:string;title:string;publisher:string;year:string;url:string;kind:string;signal:string;limit:string};
export type ComparableProject={title:string;year:string;format:string;why:string;mechanics:string[]};
export type ResearchLane={id:string;label:string;summary:string;sources:EvidenceSource[];projects:ComparableProject[]};

export const researchLanes:ResearchLane[]=[
 {id:'books',label:'КНИГИ',summary:'Аудитория, форматы чтения, длинная сюжетная арка и серийность.',sources:[
  {id:'pew-2026',title:'Book reading habits in the U.S. vary by education, age and other factors',publisher:'Pew Research Center',year:'2026',url:'https://www.pewresearch.org/chart/book-reading-habits-in-the-u-s-vary-by-education-age-and-other-factors/',kind:'исследование аудитории',signal:'Чтение остаётся массовым; цифровые и аудиоформаты заметно представлены у молодых взрослых.',limit:'США; данные описывают чтение в целом, а не конкретный жанр.'},
 ],projects:[
  {title:'Три мушкетёра',year:'1844',format:'роман / сериализация',why:'Эталон ансамбля: новичок входит в чужой мир через конфликты и получает команду.',mechanics:['outsider','rivals→allies','political intrigue']},
  {title:'Dune',year:'1965',format:'роман / франшиза',why:'Личная судьба наследника разворачивается в политику, религию и большой мир.',mechanics:['family legacy','expanding universe','power cost']},
  {title:"Ender's Game",year:'1985',format:'роман / серия',why:'Закрытая военная школа естественно создаёт испытания, соперничество и лидерство.',mechanics:['combat academy','training escalation','leadership']},
 ]},
 {id:'screen',label:'КИНО / СТРИМИНГ',summary:'Визуальный мир, темп, сериализуемость, discovery и короткие форматы.',sources:[
  {id:'deloitte-2025',title:'2025 Digital Media Trends',publisher:'Deloitte Insights',year:'2025',url:'https://www.deloitte.com/global/en/insights/industry/technology/digital-media-trends-consumption-habits-survey/2025.html',kind:'исследование медиапотребления',signal:'У молодых аудиторий social video и creators играют заметную роль в discovery и рекомендациях.',limit:'Опрос потребителей США; не является прогнозом успеха отдельного проекта.'},
 ],projects:[
  {title:'Blade Runner',year:'1982',format:'кино / IP',why:'Киберпанк работает сильнее, когда технология связана с идентичностью и неравенством.',mechanics:['high-tech/low-life','identity','corporate power']},
  {title:'The Hunger Games',year:'2008–',format:'книги / кино',why:'Герой из бедной периферии попадает в центр элитной системы и становится политическим символом.',mechanics:['low→elite','public spectacle','political escalation']},
  {title:'Arcane',year:'2021–',format:'анимационный сериал',why:'Личный конфликт и классовое неравенство раскрывают большой технологический мир постепенно.',mechanics:['class divide','family conflict','world reveal']},
 ]},
 {id:'comics',label:'КОМИКСЫ / GRAPHIC',summary:'Читаемый силуэт героя, визуальный ритм, панели, cliffhanger и повторяемый дизайн.',sources:[
  {id:'deloitte-2026-monitor',title:'Digital media monitor',publisher:'Deloitte Insights',year:'2026',url:'https://www.deloitte.com/us/en/insights/industry/technology/digital-media-trends-consumption-habits-survey/digital-media-monitor-dashboard.html',kind:'медиамонитор',signal:'Визуальный и social-first контент конкурирует за внимание с традиционным видео.',limit:'Сигнал о медиапотреблении; не измеряет продажи graphic novel напрямую.'},
 ],projects:[
  {title:'Watchmen',year:'1986–1987',format:'graphic novel',why:'Показывает, как супергеройская оболочка выдерживает политический и моральный конфликт.',mechanics:['moral ambiguity','ensemble','political layer']},
  {title:'The Sandman',year:'1989–',format:'комикс / адаптация',why:'Сильная мифология позволяет расширять мир через отдельные истории и эпохи.',mechanics:['mythology','anthology expansion','visual motifs']},
  {title:'Akira',year:'1982–1990',format:'манга / кино',why:'Технологическая катастрофа, молодые герои и политическая сила соединены в одном визуальном мире.',mechanics:['youth','power escalation','urban dystopia']},
 ]},
 {id:'rights',label:'ПРОДАКШЕН / ПРАВА',summary:'Что можно использовать как механику, что требует проверки прав и где появляется стоимость производства.',sources:[
  {id:'wipo-film',title:'Making a Living in the Creative Industries',publisher:'WIPO',year:'2022+',url:'https://www.wipo.int/en/web/copyright/creative-industries/index',kind:'правовая / производственная база',signal:'Права сопровождают development, financing, marketing и distribution; их нужно учитывать до производства.',limit:'Общая рамка; конкретный проект требует отдельной проверки юрисдикции и цепочки прав.'},
 ],projects:[
  {title:'Классические сюжеты',year:'разные эпохи',format:'механики',why:'Используем не чужой текст и не конкретную экранизацию, а абстрактные драматургические механики.',mechanics:['pattern reuse','original expression','rights check']},
  {title:'Собственный Story DNA',year:'текущий проект',format:'оригинальная комбинация',why:'Уникальность появляется в правилах мира, причинности, персонажах и комбинации мотивов.',mechanics:['original rules','causal graph','project memory']},
 ]},
];

export const researchPrinciples=[
 'ФАКТ ≠ РЫНОЧНЫЙ СИГНАЛ ≠ ГИПОТЕЗА',
 'Ссылка и ограничение видны рядом с выводом',
 'Сопоставимый проект — не шаблон для копирования',
 'Никакой оценки “будет хит” без данных',
];
