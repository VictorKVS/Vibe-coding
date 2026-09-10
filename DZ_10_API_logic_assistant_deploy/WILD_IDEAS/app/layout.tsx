import type { Metadata } from 'next';
import './globals.css';
import './neural-hud.css';
import './brand-landing.css';
import './format-cascades.css';
import './narrative-lab.css';
export const metadata: Metadata = {
  title: 'Дикие идеи → в деньги — BOOK·CRAFT Neural Studio',
  description: 'От мысли к книге, визуальной истории и цифровому продукту. Алина помогает превратить идею в форму.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ru" className="dark"><body>{children}</body></html>; }
