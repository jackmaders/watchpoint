import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";

import { SignInForm } from "./sign-in-form";

export function SignInCard() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>
          <h2>Sign In</h2>
        </CardTitle>
        <CardDescription>Enter your credentials to access your todos</CardDescription>
      </CardHeader>
      <CardContent>
        <SignInForm />
      </CardContent>
    </Card>
  );
}
