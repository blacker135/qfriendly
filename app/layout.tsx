import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'QFriendly — 懂你每一种心情',
  description: '个人成长、恋爱关系、家庭沟通、职场人际、老年陪伴——四位 AI 专家，随时倾听，认真回应。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-soft antialiased">{children}</body>
    </html>
  );
}
