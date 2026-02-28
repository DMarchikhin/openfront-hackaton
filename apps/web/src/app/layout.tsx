import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Autopilot Savings',
  description: 'Your money works while you sleep',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <a href="/" className="text-xl font-bold text-gray-900">
              Autopilot Savings
            </a>
            <nav className="flex gap-6 text-sm text-gray-600">
              <a href="/" className="hover:text-gray-900 transition-colors">
                Home
              </a>
              <a href="/quiz" className="hover:text-gray-900 transition-colors">
                Quiz
              </a>
              <a href="/dashboard" className="hover:text-gray-900 transition-colors">
                Dashboard
              </a>
            </nav>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
