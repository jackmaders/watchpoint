"use client";

import type { BulkOperationResult } from "@/shared/db";
import { Alert, AlertDescription, AlertTitle } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";

export interface BulkSummaryAlertProps {
	onDismiss: () => void;
	operationLabel: string;
	result: BulkOperationResult;
}

export function BulkSummaryAlert({
	onDismiss,
	operationLabel,
	result,
}: BulkSummaryAlertProps) {
	const hasFailures = result.failed.length > 0;
	const variant = hasFailures ? "destructive" : "default";

	return (
		<Alert aria-live="assertive" className="relative pr-12" variant={variant}>
			<AlertTitle className="font-semibold">
				{operationLabel} completed: {result.succeeded.length} succeeded,{" "}
				{result.failed.length} failed
			</AlertTitle>
			<AlertDescription className="mt-1 space-y-1">
				{hasFailures ? (
					<ul className="list-disc pl-5 text-xs space-y-0.5">
						{result.failed.map((fail) => (
							<li key={fail.id}>
								{fail.id}: {fail.error}
							</li>
						))}
					</ul>
				) : null}
			</AlertDescription>
			<div className="absolute right-2 top-2">
				<Button
					aria-label="Dismiss alert"
					className="h-7 px-2 text-xs"
					onClick={onDismiss}
					size="sm"
					variant="ghost"
				>
					Dismiss
				</Button>
			</div>
		</Alert>
	);
}
