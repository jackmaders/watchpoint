"use client";

import { useCallback } from "react";
import { Button } from "@/shared/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/shared/ui/dialog";

export interface DeleteConfirmationDialogProps {
	isDeleting: boolean;
	onConfirm: () => void;
	onOpenChange: (open: boolean) => void;
	open: boolean;
	scenarioCount: number;
	vodCount: number;
}

export function DeleteConfirmationDialog({
	isDeleting,
	onConfirm,
	onOpenChange,
	open,
	scenarioCount,
	vodCount,
}: DeleteConfirmationDialogProps) {
	const handleCancel = useCallback(() => {
		onOpenChange(false);
	}, [onOpenChange]);

	const vodText = vodCount === 1 ? "1 VOD" : `${vodCount} VODs`;
	const scenarioText =
		scenarioCount === 1
			? "1 associated scenario"
			: `${scenarioCount} associated scenarios`;

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Delete VOD Confirmation</DialogTitle>
					<DialogDescription>
						This will permanently delete {vodText} and {scenarioText}. This
						action cannot be undone.
					</DialogDescription>
				</DialogHeader>
				<div className="mt-4 flex items-center justify-end gap-3">
					<Button
						disabled={isDeleting}
						onClick={handleCancel}
						variant="outline"
					>
						Cancel
					</Button>
					<Button
						disabled={isDeleting}
						onClick={onConfirm}
						variant="destructive"
					>
						{isDeleting ? "Deleting…" : "Delete"}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
