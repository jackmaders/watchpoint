import { getRouteApi, Link } from "@tanstack/react-router";
import { cn } from "cn";
import { Crosshair } from "lucide-react";
import type { ComponentProps } from "react";

import { SignInDialog } from "@/features/user-sign-in";
import { SignUpDialog } from "@/features/user-sign-up";
import { hasPermission, type Session } from "@/shared/auth";

import { MobileDrawer } from "./mobile-drawer";
import { SignOutDialog } from "./sign-out-dialog";

const rootRouteApi = getRouteApi("__root__");

export function Header({ className, ...props }: ComponentProps<"header">) {
  const { session } = rootRouteApi.useRouteContext();
  const canReadVods = hasPermission(session?.user.role, "vods:read");

  const links: ComponentProps<typeof Link>[] = [
    { children: "Home", to: "/" },
    { children: "About", to: "/about" },
    ...(canReadVods ? [{ children: "VODs", to: "/vods" }] : []),
  ];

  return (
    <header
      className={cn("sticky top-0 z-50 flex h-14 items-center border-b bg-background", className)}
      {...props}
    >
      <div className="container mx-auto flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-6">
          <Link to="/">
            <Logo />
          </Link>

          <NavLinks className="max-md:hidden" links={links} />
        </div>

        <div className="flex items-center gap-2">
          <AuthActions className="max-md:hidden" session={session} />
          <MobileDrawer
            className="md:hidden"
            links={links}
            authActions={<AuthActions session={session} />}
          />
        </div>
      </div>
    </header>
  );
}

function Logo({ className, ...props }: ComponentProps<"div">) {
  return (
    <div className={cn("flex items-center gap-2", className)} {...props}>
      <Crosshair className="size-5" />
      <span>Watchpoint</span>
    </div>
  );
}

function NavLinks({
  className,
  links,
  ...props
}: ComponentProps<"nav"> & { links: ComponentProps<typeof Link>[] }) {
  return (
    <nav className={cn("flex items-center gap-3", className)} {...props}>
      {links.map((link) => (
        <Link key={link.to} {...link} />
      ))}
    </nav>
  );
}

interface AuthActionsProps extends ComponentProps<"div"> {
  session?: Session | null;
}

function AuthActions({ className, session, ...props }: AuthActionsProps) {
  return (
    <div className={cn("flex items-center gap-2", className)} {...props}>
      {session ? (
        <SignOutDialog />
      ) : (
        <>
          <SignInDialog />
          <SignUpDialog />
        </>
      )}
    </div>
  );
}
