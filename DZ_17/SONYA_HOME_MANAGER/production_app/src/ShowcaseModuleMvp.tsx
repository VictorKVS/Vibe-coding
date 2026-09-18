import { useEffect, useMemo, useState } from 'react';
import type { ShowcaseModuleId } from './showcase-data';
import { getShowcaseModule } from './showcase-data';
import './showcase.css';

type Props = {
  id: ShowcaseModuleId;
  onBack: () => void;
};

export default function ShowcaseModuleMvp({ id, onBack }: Props) {
  const module = getShowcaseModule(id);
  const storageKey = `sonya-showcase-${id}`;
  const [note, setNote] = useState(() => localStorage.getItem(storageKey) || '');
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => localStorage.setItem(storageKey, note), [note, storageKey]);
  const bullets = useMemo(() => module?.bullets ?? [], [module]);

  if (!module) return null;

  return <section className="panel glass showcase-mvp">
    <div className="showcase-mvp-head">
      <button onClick={onBack}>← Витрина</button>
      <div><span>{module.emoji}</span><div><small>SONYA · MVP MODULE</small><h2>{module.title}</h2><p>{module.subtitle}</p></div></div>
    </div>

    <div className="showcase-mvp-grid">
      <article>
        <h3>Рабочий MVP</h3>
        <p>Этот раздел уже имеет самостоятельную точку входа и локальное состояние. Дальше сюда подключается профильный AI/данные без изменения общей навигации.</p>
        <div className="mvp-checklist">{bullets.map(item => <label key={item}><input type="checkbox" checked={Boolean(checked[item])} onChange={e => setChecked(v => ({...v,[item]:e.target.checked}))}/><span>{item}</span></label>)}</div>
      </article>

      <article>
        <h3>Быстрая заметка</h3>
        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder={`Заметка для раздела «${module.title}»...`}/>
        <small>Сохраняется локально в браузере как MVP пользовательского состояния.</small>
      </article>

      <article className="mvp-status">
        <h3>Статус витрины</h3>
        <div><b>UI</b><span>готов к расширению</span></div>
        <div><b>State</b><span>localStorage MVP</span></div>
        <div><b>AI</b><span>{['menu','kids','dessert','drinks','tips','fridge'].includes(id) ? 'есть точка подключения к SONYA Vision/Prompt' : 'следующий слой'}</span></div>
        <div><b>Human</b><span>подтверждает действия</span></div>
      </article>
    </div>
  </section>;
}
