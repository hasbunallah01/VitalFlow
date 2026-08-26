import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'VitalFlow — Caribbean MSME Financial Intelligence',
    template: '%s · VitalFlow',
  },
  description:
    'VitalFlow turns your financial data into clear analysis, actionable insights, and funding opportunities — powered by real financial intelligence.',
  icons: {
    icon: [{ url: '/brand/vitalflow-logo-icon.png', type: 'image/png' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-canvas font-sans text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
