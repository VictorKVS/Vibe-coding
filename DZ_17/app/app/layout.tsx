import type { Metadata } from 'next';
import './globals.css';
import './neural-hud.css';
import './brand-landing.css';
import './format-cascades.css';
import './research-lab.css';
import './narrative-lab.css';
import './model-switcher.css';
import './multimodal.css';
export const metadata: Metadata = {
  title: 'ALINA Multimodal — ДЗ-17 · Дикие идеи → в деньги',
  description: 'Мультимодальный AI-продюсер: текст + изображение → анализ → творческие варианты с подтверждением пользователя.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ru" className="dark"><body>{children}</body></html>; }
