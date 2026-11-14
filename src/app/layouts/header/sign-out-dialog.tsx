import type { ComponentProps } from "react";

import { useAuth } from "@/shared/auth";
import { Button } from "@/shared/ui/shadcn/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/shadcn/dialog";

export function SignOutDialog({ ...props }: ComponentProps<typeof DialogTrigger>) {
  const { signOut } = useAuth();

  return (
    <Dialog>
      <DialogTrigger render={<Button />} {...props}>
        Sign Out
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sign out?</DialogTitle>
          <DialogDescription>Are you sure you want to sign out?</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
          <Button
            onClick={() => {
              void signOut();
            }}
          >
            Sign Out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
