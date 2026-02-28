import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-8">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          Your money works while you sleep
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl">
          Take a 60-second quiz to discover your investment personality.
          We&apos;ll match you with the right strategy and let an AI agent
          handle the rest — automatically earning you the best yield on your USDC.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Button asChild size="lg">
          <Link href="/quiz">Take the Quiz →</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/strategies">Browse Strategies</Link>
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-6 mt-8 w-full max-w-2xl">
        {[
          { label: 'Conservative', apy: '3–5% APY', badgeClass: 'bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-100' },
          { label: 'Balanced', apy: '5–8% APY', badgeClass: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-100' },
          { label: 'Growth', apy: '7–12% APY', badgeClass: 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <Badge className={s.badgeClass}>{s.label}</Badge>
              <p className="mt-2 text-lg font-bold">{s.apy}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
