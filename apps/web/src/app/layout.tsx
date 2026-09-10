import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'SafeRoute — Compare safer routes',
  description:
    'Compare fastest, balanced, and safest routes using live community risk signals.',
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
