import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Дикие идеи — студия ваших историй', description: 'От замысла до комикса и короткого кино. Пересечение трёх лун — первая история студии.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ru" className="dark"><body>{children}</body></html>; }
