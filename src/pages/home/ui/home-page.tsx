import { SignInCard } from "@/features/user-sign-in";
import { SignUpCard } from "@/features/user-sign-up";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/shadcn/tabs";

export function HomePage() {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Tabs defaultValue="signin">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          <TabsContent value="signin" className="mt-4">
            <SignInCard />
          </TabsContent>
          <TabsContent value="signup" className="mt-4">
            <SignUpCard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
