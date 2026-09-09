import type { Metadata } from 'next';
import './globals.css';
import './neural-hud.css';
export const metadata: Metadata = { title: 'BOOK·CRAFT Neural Studio — Дикие идеи', description: 'Живая AI-студия историй: Алина, голосовой диалог, миры, герои и визуальные концепты.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ru" className="dark"><body>{children}</body></html>; }
