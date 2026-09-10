import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'SafeRoute — Safer paths, informed by community',
  description:
    'Safety-aware navigation powered by geospatial risk intelligence.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
