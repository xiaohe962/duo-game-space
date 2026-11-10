import type { Metadata } from 'next';
import './globals.css';
import { PairAuthProvider } from '@/context/PairAuthContext';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'DUOSPACE · 双人极简互动空间',
  description: '专为双人打造的 4 位配对码即时互动平台，包含是非之间猜词、双人实时你画我猜与即时动态空间。',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased min-h-screen flex flex-col bg-slate-50 text-slate-900">
        <PairAuthProvider>
          <Navbar />
          <main className="flex-1 pb-20 md:pb-8">
            {children}
          </main>
        </PairAuthProvider>
      </body>
    </html>
  );
}
