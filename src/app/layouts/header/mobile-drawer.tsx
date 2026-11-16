import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

import { Button } from "@/shared/ui/shadcn/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/shared/ui/shadcn/drawer";

interface MobileDrawerProps extends ComponentProps<typeof DrawerTrigger> {
  authActions: ReactNode;
  links: ComponentProps<typeof Link>[];
}

function MobileDrawer({ authActions, links, ...props }: MobileDrawerProps) {
  return (
    <Drawer swipeDirection="left">
      <DrawerTrigger
        render={<Button variant="ghost" size="sm" />}
        aria-label="Open menu"
        {...props}
      >
        <Menu data-icon="inline-start" />
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Navigation</DrawerTitle>
          <DrawerDescription>Menu and links</DrawerDescription>
          <DrawerClose
            className="mt-3 inline-flex h-8 items-center justify-center gap-1.5 self-start rounded-lg border px-2.5 text-sm font-medium transition-colors hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            aria-label="Close menu"
          >
            <X aria-hidden="true" className="size-4" />
            Close menu
          </DrawerClose>
        </DrawerHeader>
        <div className="flex flex-col gap-4 p-4">
          {links.map((link) => (
            <DrawerClose
              nativeButton={false}
              key={link.to}
              render={
                // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- Link renders an anchor; override DrawerClose's button role.
                <Link {...link} role="link" />
              }
            />
          ))}
          {authActions}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export { MobileDrawer };
