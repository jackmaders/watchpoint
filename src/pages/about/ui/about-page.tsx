import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";

export function AboutPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>
            <h1 className="text-xl font-semibold">About</h1>
          </CardTitle>
          <CardDescription>A simple starter with room to grow.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This application is built with TanStack Start, Better Auth, and shadcn/ui. It provides
            type-safe routing, server functions, and clean composable primitives.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
