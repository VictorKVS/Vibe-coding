import type { Metadata } from 'next';
import './globals.css';
import './neural-hud.css';
import './brand-landing.css';
import './format-cascades.css';
import './research-lab.css';
import './narrative-lab.css';
import './model-switcher.css';
import './multimodal.css';
import './kb-analyst.css';
export const metadata: Metadata = {
  title: 'ALINA Multimodal + KB Analyst — ДЗ-17 · Дикие идеи → в деньги',
  description: 'Мультимодальный AI-продюсер и аналитик: текст + изображение → анализ, а идея → структурированный черновик базы знаний.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ru" className="dark"><body>{children}</body></html>; }
