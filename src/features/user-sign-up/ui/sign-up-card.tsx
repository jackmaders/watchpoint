import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/shadcn/card";

import { SignUpForm } from "./sign-up-form";

export function SignUpCard() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>
          <h2>Sign Up</h2>
        </CardTitle>
        <CardDescription>Create an account to start managing your todos</CardDescription>
      </CardHeader>
      <CardContent>
        <SignUpForm />
      </CardContent>
    </Card>
  );
}
