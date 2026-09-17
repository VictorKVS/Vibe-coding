import type { Metadata } from 'next';
import './globals.css';
import './modes.css';

export const metadata: Metadata = {
  title: 'СОНЯ — домовой управляющий',
  description: 'Мультимодальный AI-помощник для дома, семьи, покупок, счетов и праздников.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
