import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X } from 'lucide-react';
import { CookingCoachModal } from './FocusMode';

type ReadFocus = { title: string; items: string[] };
type CookingState = { steps: string[]; current: number; speaking: boolean };

function sameCooking(a: CookingState | null, b: CookingState | null) {
  if (!a || !b) return a === b;
  if (a.current !== b.current || a.speaking !== b.speaking || a.steps.length !== b.steps.length) return false;
  return a.steps.every((step, index) => step === b.steps[index]);
}

function findPreparationSteps() {
  const cards = Array.from(document.querySelectorAll<HTMLElement>('.result-card'));
  const card = cards.find(item => item.querySelector('h3')?.textContent?.toLocaleLowerCase('ru-RU').includes('как приготовить'));
  return card ? Array.from(card.querySelectorAll('li')).map(item => item.textContent?.trim() || '').filter(Boolean) : [];
}

function readCookingState(): CookingState | null {
  const coach = document.querySelector<HTMLElement>('.coach');
  if (!coach) return null;

  const steps = findPreparationSteps();
  const label = coach.querySelector('b')?.textContent || '';
  const match = label.match(/шаг\s+(\d+)\s*\/\s*(\d+)/i);
  const current = Math.max(0, (Number(match?.[1]) || 1) - 1);
  const buttons = Array.from(coach.querySelectorAll<HTMLButtonElement>('button'));
  const speaking = buttons.some(button => /стоп/i.test(button.textContent || ''));

  const fallbackCurrent = coach.querySelector('p')?.textContent?.trim();
  const resolvedSteps = steps.length ? steps : fallbackCurrent ? [fallbackCurrent] : [];
  return resolvedSteps.length ? { steps: resolvedSteps, current: Math.min(current, resolvedSteps.length - 1), speaking } : null;
}

function clickCoachButton(pattern: RegExp) {
  const coach = document.querySelector<HTMLElement>('.coach');
  if (!coach) return;
  const button = Array.from(coach.querySelectorAll<HTMLButtonElement>('button')).find(item => pattern.test(item.textContent || ''));
  button?.click();
}

function closeOriginalCoach() {
  const coach = document.querySelector<HTMLElement>('.coach');
  const close = coach?.querySelector<HTMLButtonElement>(':scope > div:first-child button');
  close?.click();
}

export default function FocusEnhancer() {
  const [readFocus, setReadFocus] = useState<ReadFocus | null>(null);
  const [cooking, setCooking] = useState<CookingState | null>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('.focus-backdrop') || target.closest('.admin-backdrop') || target.closest('.agent-trace')) return;
      const card = target.closest<HTMLElement>('.result-card');
      if (!card) return;
      const title = card.querySelector('h3')?.textContent?.trim() || 'Ответ Сони';
      const items = Array.from(card.querySelectorAll('li')).map(item => item.textContent?.trim() || '').filter(Boolean);
      setReadFocus({ title, items });
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  useEffect(() => {
    let scheduled = 0;
    const sync = () => {
      if (scheduled) cancelAnimationFrame(scheduled);
      scheduled = requestAnimationFrame(() => {
        const next = readCookingState();
        setCooking(prev => sameCooking(prev, next) ? prev : next);
      });
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => {
      observer.disconnect();
      if (scheduled) cancelAnimationFrame(scheduled);
    };
  }, []);

  useEffect(() => {
    if (!readFocus) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setReadFocus(null);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = oldOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [readFocus]);

  const readModal = useMemo(() => readFocus ? createPortal(
    <div className="focus-backdrop" onMouseDown={event => event.currentTarget === event.target && setReadFocus(null)}>
      <section className="focus-modal focus-modal-result" role="dialog" aria-modal="true" aria-label={readFocus.title}>
        <header className="focus-modal-head">
          <div><small>SONYA · FOCUS MODE</small><h2>{readFocus.title}</h2></div>
          <button className="focus-close" onClick={() => setReadFocus(null)} aria-label="Закрыть"><X/></button>
        </header>
        <div className="focus-reading">
          {readFocus.items.length ? <ol>{readFocus.items.map((item, index) => <li key={index}><span>{index + 1}</span><p>{item}</p></li>)}</ol> : <div className="focus-empty"><Sparkles/> В этом разделе пока нет пунктов.</div>}
        </div>
        <footer className="focus-footer-note">Клик по фону или Esc — закрыть</footer>
      </section>
    </div>,
    document.body,
  ) : null, [readFocus]);

  const cookingModal = cooking ? createPortal(
    <CookingCoachModal
      steps={cooking.steps}
      current={cooking.current}
      speaking={cooking.speaking}
      onPrev={() => clickCoachButton(/назад/i)}
      onNext={() => clickCoachButton(/дальше/i)}
      onRepeat={() => clickCoachButton(/повторить/i)}
      onStop={() => clickCoachButton(/стоп/i)}
      onClose={closeOriginalCoach}
    />,
    document.body,
  ) : null;

  return <>{readModal}{cookingModal}</>;
}
