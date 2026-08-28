import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'VitalFlow — Financial Intelligence for Small Businesses',
    template: '%s · VitalFlow',
  },
  description:
    'Turn your financial data into clear analysis, actionable insights, and funding opportunities.',
  icons: {
    icon: [{ url: '/brand/vitalflow-logo.png', type: 'image/png' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-canvas text-text-primary antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
