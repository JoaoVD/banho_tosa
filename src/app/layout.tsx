import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Banho e Tosa',
  description: 'Gestão de banho e tosa',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
