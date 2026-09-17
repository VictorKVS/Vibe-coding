import { useEffect, useMemo, useState } from 'react';
import {
  Check, ChefHat, Circle, SkipBack, SkipForward, Sparkles,
  Volume2, VolumeX, X,
} from 'lucide-react';
import './focus-mode.css';

function useModal(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);
}

export function FocusResult({ title, items }: { title: string; items: string[] }) {
  const [open, setOpen] = useState(false);
  useModal(open, () => setOpen(false));

  return <>
    <article
      className="result-card focus-trigger"
      role="button"
      tabIndex={0}
      aria-label={`Открыть крупно: ${title}`}
      onClick={() => setOpen(true)}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          setOpen(true);
        }
      }}
    >
      <div className="focus-trigger-hint"><Sparkles size={13}/> нажмите, чтобы увеличить</div>
      <h3>{title}</h3>
      <ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul>
    </article>

    {open && <div className="focus-backdrop" onMouseDown={event => event.currentTarget === event.target && setOpen(false)}>
      <section className="focus-modal focus-modal-result" role="dialog" aria-modal="true" aria-label={title}>
        <header className="focus-modal-head">
          <div><small>SONYA · FOCUS MODE</small><h2>{title}</h2></div>
          <button className="focus-close" onClick={() => setOpen(false)} aria-label="Закрыть"><X/></button>
        </header>
        <div className="focus-reading">
          {items.length ? <ol>{items.map((item, index) => <li key={index}><span>{index + 1}</span><p>{item}</p></li>)}</ol> : <p className="focus-empty">В этом разделе пока нет пунктов.</p>}
        </div>
        <footer className="focus-footer-note">Клик по фону или Esc — закрыть</footer>
      </section>
    </div>}
  </>;
}

const childIcons = ['🍝', '🥕', '🔪', '🌿', '🍽️', '🧩', '☀️', '✨', '🎉', '✅'];

export function CookingCoachModal({
  steps, current, speaking, onPrev, onNext, onRepeat, onStop, onClose,
}: {
  steps: string[];
  current: number;
  speaking: boolean;
  onPrev: () => void;
  onNext: () => void;
  onRepeat: () => void;
  onStop: () => void;
  onClose: () => void;
}) {
  const close = () => {
    if (speaking) onStop();
    onClose();
  };
  useModal(true, close);

  const progress = Math.round(((current + 1) / Math.max(steps.length, 1)) * 100);
  const currentText = steps[current] || '';
  const helper = useMemo(() => {
    const lower = currentText.toLocaleLowerCase('ru-RU');
    if (/отвар|вар/.test(lower)) return 'Готовим основу блюда. Попроси взрослого помочь с горячей водой и плитой.';
    if (/нареж|нож/.test(lower)) return 'Нарезку выполняет взрослый. Твоя задача — посмотреть, какие формы нужны для картинки.';
    if (/морков|оранжев/.test(lower)) return 'Подготавливаем яркие оранжевые детали — они помогут собрать декоративное «солнце».';
    if (/зелень|укроп/.test(lower)) return 'Зелень добавляем аккуратно и обычно ближе к подаче, чтобы она выглядела свежей.';
    if (/вылож|разлож|располож/.test(lower)) return 'Теперь собираем картинку на тарелке. Сравнивай расположение элементов с фотографией.';
    return 'Выполни только этот шаг, затем нажми «Дальше». СОНЯ будет вести по алгоритму по одному действию.';
  }, [currentText]);

  return <div className="focus-backdrop cooking-backdrop" onMouseDown={event => event.currentTarget === event.target && close()}>
    <section className="focus-modal cooking-modal" role="dialog" aria-modal="true" aria-label="Голосовой режим готовки">
      <header className="focus-modal-head cooking-head">
        <div>
          <small>СОНЯ · ДЕТСКИЙ АЛГОРИТМ</small>
          <h2><ChefHat/> Голосовой режим · шаг {current + 1}/{steps.length}</h2>
        </div>
        <button className="focus-close" onClick={close} aria-label="Закрыть"><X/></button>
      </header>

      <div className="cooking-progress" aria-label={`Прогресс ${progress}%`}><i style={{ width: `${progress}%` }}/><b>{progress}%</b></div>

      <div className="cooking-layout">
        <aside className="cooking-algorithm">
          <div className="algorithm-title"><Sparkles/> Алгоритм</div>
          <div className="algorithm-steps">
            {steps.map((step, index) => {
              const state = index < current ? 'done' : index === current ? 'active' : 'next';
              return <div className={`algorithm-step ${state}`} key={index}>
                <div className="algorithm-node">
                  {state === 'done' ? <Check/> : <span>{childIcons[index % childIcons.length]}</span>}
                </div>
                <div className="algorithm-copy">
                  <b>Шаг {index + 1}</b>
                  <p>{step}</p>
                </div>
                {index < steps.length - 1 && <div className="algorithm-line"/>}
              </div>;
            })}
          </div>
        </aside>

        <article className="cooking-current">
          <div className="current-badge"><span>{childIcons[current % childIcons.length]}</span> Сейчас делаем</div>
          <h3>Шаг {current + 1}</h3>
          <p className="current-instruction">{currentText}</p>
          <div className="child-helper"><Circle size={14}/><span>{helper}</span></div>

          <div className="cooking-controls">
            <button onClick={onPrev} disabled={current === 0}><SkipBack/> Назад</button>
            <button className="speak-control" onClick={speaking ? onStop : onRepeat}>{speaking ? <VolumeX/> : <Volume2/>}{speaking ? 'Стоп' : 'Повторить'}</button>
            <button className="next-control" onClick={onNext} disabled={current === steps.length - 1}>Дальше <SkipForward/></button>
          </div>
          <div className="child-tip">Один шаг за раз · не спешим · горячее и нож — только со взрослым</div>
        </article>
      </div>
    </section>
  </div>;
}
