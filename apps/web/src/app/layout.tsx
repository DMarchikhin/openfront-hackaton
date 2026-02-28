import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CondorFlow',
  description: 'Your money works while you sleep',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background">
        <header className="bg-card border-b">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <a href="/" className="text-xl font-bold tracking-tight">
              CondorFlow
            </a>
            <nav className="flex gap-6 text-sm text-muted-foreground">
              <a href="/" className="hover:text-foreground transition-colors">
                Home
              </a>
              <a href="/quiz" className="hover:text-foreground transition-colors">
                Quiz
              </a>
              <a href="/dashboard" className="hover:text-foreground transition-colors">
                Dashboard
              </a>
            </nav>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
