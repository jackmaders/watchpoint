import { useState, type ComponentProps } from "react";

import type { Todo } from "@/shared/db";
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
import { FieldError } from "@/shared/ui/shadcn/field";

import { useDeleteTodo } from "../api/use-delete-todo";

interface DeleteTodoDialogProps extends ComponentProps<typeof DialogTrigger> {
  todo: Todo;
}

function DeleteTodoDialog({ children = "Delete Item", todo, ...props }: DeleteTodoDialogProps) {
  const [open, setOpen] = useState(false);
  const {
    error,
    isPending,
    mutate: deleteTodo,
    reset,
  } = useDeleteTodo({
    onSuccess: () => {
      setOpen(false);
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          reset();
        }
      }}
    >
      <DialogTrigger {...props}>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Todo Item?</DialogTitle>
          <DialogDescription>Are you sure? This action is not reversible</DialogDescription>
        </DialogHeader>

        {error && <FieldError>{error.message}</FieldError>}

        <DialogFooter>
          <DialogClose render={cancelButton}>Cancel</DialogClose>
          <Button
            disabled={isPending}
            variant="destructive"
            onClick={() => {
              deleteTodo({ id: todo.id });
            }}
          >
            {isPending ? "Deleting..." : "Delete Todo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const cancelButton = <Button variant="ghost" />;

export { DeleteTodoDialog };
