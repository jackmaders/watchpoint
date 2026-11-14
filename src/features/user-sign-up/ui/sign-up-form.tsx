import { cn } from "cn";
import { z } from "zod";

import { useAuth } from "@/shared/auth";
import { useAppForm, type AppFormProps } from "@/shared/ui/form";

const signUpSchema = z.object({
  email: z.email("Enter a valid email address"),
  name: z.string().min(1, "Name is required"),
  password: z.string().min(1, "Password is required"),
});

export function SignUpForm({ className, ...props }: AppFormProps) {
  const { signUpEmail } = useAuth();

  const form = useAppForm({
    defaultValues: { email: "", name: "", password: "" },
    onSubmit: async ({ value }) => {
      await signUpEmail(value);
    },
    validators: { onChange: signUpSchema },
  });

  return (
    <form.AppForm>
      <form.Form className={cn("flex flex-col gap-4", className)} {...props}>
        <form.AppField name="name">
          {(field) => (
            <field.TextField label="Name" autoComplete="name" required placeholder="Your name" />
          )}
        </form.AppField>
        <form.AppField name="email">
          {(field) => (
            <field.TextField
              label="Email"
              type="email"
              autoComplete="email"
              required
              placeholder="name@example.com"
            />
          )}
        </form.AppField>
        <form.AppField name="password">
          {(field) => (
            <field.TextField
              label="Password"
              type="password"
              autoComplete="new-password"
              required
            />
          )}
        </form.AppField>
        <form.FormError />
        <form.SubmitButton className="w-full">Create account</form.SubmitButton>
      </form.Form>
    </form.AppForm>
  );
}
