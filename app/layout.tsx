import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'QFriendly — AI Emotional Guidance',
  description: 'AI emotional guidance for modern relationships. Talk with experts who understand.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-soft antialiased">{children}</body>
    </html>
  );
}
