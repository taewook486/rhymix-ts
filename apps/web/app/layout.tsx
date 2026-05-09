import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Rhymix-TS',
    template: '%s | Rhymix-TS',
  },
  description: 'TypeScript + Next.js 16 redesign of Rhymix CMS',
  generator: 'Rhymix-TS',
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
