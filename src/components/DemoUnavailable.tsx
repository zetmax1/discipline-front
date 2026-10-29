import { Card, CardContent } from '@/components/ui/card';

/** Shown instead of pages that need the server when the app runs in local demo mode. */
export function DemoUnavailable({ feature }: { feature: string }) {
  return (
    <Card className="max-w-lg">
      <CardContent className="p-6 space-y-2">
        <p className="font-semibold">Not available in demo mode</p>
        <p className="text-sm text-muted-foreground">
          {feature} runs on the server. Create an account or sign in to use it; demo data stays in this browser.
        </p>
      </CardContent>
    </Card>
  );
}
