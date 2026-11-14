import { SignInCard } from "@/features/user-sign-in";
import { SignUpCard } from "@/features/user-sign-up";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/shadcn/tabs";

export function HomePage() {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <HomeIntro />
        <HomeAuthTabs />
      </div>
    </div>
  );
}

function HomeIntro() {
  return (
    <div className="flex flex-col gap-2 text-center">
      <h1 className="text-3xl font-bold tracking-tight">Watchpoint</h1>
      <p className="text-sm text-muted-foreground">
        Structured Overwatch VOD review with auto-paused decision Checkpoints.
      </p>
    </div>
  );
}

function HomeAuthTabs() {
  return (
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
  );
}
