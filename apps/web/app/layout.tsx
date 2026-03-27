import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { AuthProvider } from '@/components/providers/auth-provider';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'readXlater',
  description: 'Your Twitter likes and bookmarks, organized and searchable with AI. Never lose a tweet again.',
  openGraph: {
    title: 'readXlater',
    description: 'Your Twitter likes and bookmarks, organized and searchable with AI.',
    type: 'website',
    siteName: 'readXlater',
  },
  twitter: {
    card: 'summary',
    title: 'readXlater',
    description: 'Your Twitter likes and bookmarks, organized and searchable with AI.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
