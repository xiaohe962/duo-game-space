import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PairAuthProvider } from '@/context/PairAuthContext';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'DUOSPACE · 双人极简互动空间',
  description: '专为双人打造的 4 位配对码即时互动平台，包含是非之间猜词、双人实时你画我猜与即时动态空间。',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  interactiveWidget: 'resizes-content',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased min-h-screen flex flex-col bg-[#EEF3FD] text-[#2C3345]">
        <PairAuthProvider>
          <Navbar />
          <main className="flex-1 min-h-0 flex flex-col">
            {children}
          </main>
        </PairAuthProvider>
      </body>
    </html>
  );
}
