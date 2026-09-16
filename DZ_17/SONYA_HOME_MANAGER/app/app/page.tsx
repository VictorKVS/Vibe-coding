'use client';

import { ChangeEvent, useMemo, useState } from 'react';

type Result = {
  provider?: string;
  model?: string;
  latencyMs?: number;
  text?: string;
  error?: string;
};

const DEFAULT_PROMPT = 'Проанализируй фото в контексте детского праздника. Отдели то, что реально видно, от предположений. Предложи 3 варианта меню, укажи что уже есть, что нужно докупить, и составь краткий план подготовки.';

export default function Home() {
  const [image, setImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [childAge, setChildAge] = useState(8);
  const [guests, setGuests] = useState(10);
  const [budget, setBudget] = useState(15000);
  const [lifestyle, setLifestyle] = useState('ЗОЖ + детское меню');
  const [allergies, setAllergies] = useState('нет данных');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const progress = useMemo(() => 6, []);

  function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setResult({ error: 'Поддерживаются JPG, PNG и WEBP.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setResult({ error: 'Файл больше 5 МБ.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function analyze() {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          imageDataUrl: image,
          profile: { childAge, guests, budget, lifestyle, allergies }
        })
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : 'Ошибка запроса' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <header className="topbar glass">
        <div className="brand"><span className="homeMark">⌂</span><div><strong>СОНЯ</strong><small>домовой управляющий</small></div></div>
        <nav>{['Главная','Дом','Покупки','Счета','Праздники','Кулинария'].map((item, i) => <button className={i === 0 ? 'active' : ''} key={item}>{item}</button>)}</nav>
        <div className="profile">● <span>Семья</span></div>
      </header>

      <section className="hero glass">
        <div className="sonyaWrap" aria-label="Анимированная Соня">
          <div className={loading ? 'sonya thinking' : 'sonya'}>
            <div className="antenna" />
            <div className="face"><span className="eye left" /><span className="eye right" /><span className="smile">⌣</span></div>
            <div className="body">♡</div>
          </div>
          <div className="statusDot">{loading ? 'Соня думает…' : 'Соня готова помочь'}</div>
        </div>
        <div className="heroCopy">
          <p className="eyebrow">AI-помощник по дому и семье</p>
          <h1>Один управляющий для быта, покупок, счетов и семейных событий.</h1>
          <p>Первый рабочий сценарий — детский праздник: фото + текст → меню → покупки → задачи → тайминг.</p>
          <div className="chips"><span>Vision</span><span>Family profile</span><span>Budget</span><span>Shopping</span><span>Event plan</span></div>
        </div>
        <div className="scenarioCard">
          <span>СЦЕНАРИЙ</span>
          <h2>🎂 Детский праздник</h2>
          <p>{childAge} лет · {guests} гостей · бюджет {budget.toLocaleString('ru-RU')} ₽</p>
          <div className="meter"><i style={{ width: `${progress * 10}%` }} /></div>
          <small>{progress}/10 задач подготовлено</small>
        </div>
      </section>

      <section className="grid2">
        <article className="glass panel">
          <div className="panelHead"><div><p className="eyebrow">Мультимодальный тест</p><h2>Фото + текстовый запрос</h2></div><span className="badge">ДЗ-17</span></div>
          <label className="uploadBox">
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={onFile} />
            {image ? <img src={image} alt="Загруженный визуальный референс" /> : <div><b>＋ Добавить фото</b><span>JPG / PNG / WEBP · до 5 МБ</span></div>}
          </label>
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={6} aria-label="Текстовый запрос" />
          <button className="primary" onClick={analyze} disabled={loading || !prompt.trim()}>{loading ? 'Анализирую…' : 'Анализировать вместе с фото'}</button>
        </article>

        <article className="glass panel">
          <div className="panelHead"><div><p className="eyebrow">Профиль события</p><h2>Что Соня учитывает</h2></div></div>
          <div className="formGrid">
            <label>Возраст ребёнка<input type="number" min="1" max="17" value={childAge} onChange={e => setChildAge(Number(e.target.value))} /></label>
            <label>Гостей<input type="number" min="1" max="60" value={guests} onChange={e => setGuests(Number(e.target.value))} /></label>
            <label>Бюджет, ₽<input type="number" min="0" step="1000" value={budget} onChange={e => setBudget(Number(e.target.value))} /></label>
            <label>Образ жизни<input value={lifestyle} onChange={e => setLifestyle(e.target.value)} /></label>
            <label className="wide">Аллергии / ограничения<input value={allergies} onChange={e => setAllergies(e.target.value)} /></label>
          </div>
          <div className="taskList">
            {['Уборка и подготовка дома','Список гостей','Торт и десерты','Украшения и декор','Меню и напитки','Подарки','Тайминг праздника','Бюджет план/факт'].map((t, i) => <div key={t}><span>{i < 3 ? '✓' : '○'}</span><b>{t}</b><small>{i < 3 ? 'готово' : i < 6 ? 'в работе' : 'не начато'}</small></div>)}
          </div>
        </article>
      </section>

      <section className="glass resultPanel">
        <div className="panelHead"><div><p className="eyebrow">Результат</p><h2>Ответ Сони</h2></div>{result?.model && <span className="badge">{result.model}{result.latencyMs ? ` · ${result.latencyMs} ms` : ''}</span>}</div>
        {!result && <p className="placeholder">Загрузите фото, уточните задачу и запустите анализ. Для сдачи здесь должен быть виден реальный совместный ответ image + text.</p>}
        {result?.error && <p className="error">{result.error}</p>}
        {result?.text && <pre>{result.text}</pre>}
      </section>

      <section className="quickGrid">
        {[
          ['🧹','Дом','Уборка, порядок, обслуживание'],
          ['🛒','Покупки','Списки и недостающие товары'],
          ['💳','Счета','Напоминания и контроль оплат'],
          ['🎁','Праздники','Сценарии, гости, бюджет'],
          ['🍽️','Кулинария','Меню, ЗОЖ и холодильник'],
          ['👨‍👩‍👦','Семья','Предпочтения и важные даты']
        ].map(([icon,title,text]) => <article className="glass quick" key={title}><span>{icon}</span><h3>{title}</h3><p>{text}</p></article>)}
      </section>
    </main>
  );
}
