import type { Metadata } from 'next';
import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth';

// Self-hosted at build time via next/font — no runtime external font request,
// no extra dependency (charter §13).
const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-plex-sans',
  display: 'swap',
});
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Last-Mile Delivery Tracker',
  description:
    'Configurable rate engine, explainable auto-assignment, immutable tracking history.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${plexSans.variable} ${plexMono.variable}`}>
      <body className="font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
