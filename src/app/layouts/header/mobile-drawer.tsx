import { Link } from "@tanstack/react-router";
import { Menu } from "lucide-react";
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
