"use client";

import { AlertCircle, CheckCircle2, Globe, Lock } from "lucide-react";
import { useCallback, useMemo } from "react";
import { type scenarios, validateVodForPublishing } from "@/shared/db";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";

export interface PublicationStatusControlProps {
	disabled?: boolean;
	isSubmitting?: boolean;
	onTogglePublish: (isPublished: boolean) => void;
	scenarios: ReadonlyArray<typeof scenarios.$inferSelect>;
	vod: {
		durationSeconds: number;
		id: string;
		isPublished: boolean;
		title: string;
	};
}

function PublicationStatusBadge({ isPublished }: { isPublished: boolean }) {
	if (isPublished) {
		return (
			<span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
				<CheckCircle2 className="h-3 w-3" /> Published
			</span>
		);
	}
	return (
		<span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold border border-amber-500/30 bg-amber-500/10 text-amber-400">
			<AlertCircle className="h-3 w-3" /> Draft (Unpublished)
		</span>
	);
}

function getValidationErrorMessage(
	isPublished: boolean,
	valid: boolean,
	error?: string,
): string | null {
	if (isPublished || valid || !error) return null;
	if (error === "Cannot publish a VOD with zero scenarios") {
		return "Cannot publish: VOD must have at least one valid scenario.";
	}
	return `Cannot publish: ${error}`;
}

interface PublicationActionButtonProps {
	canPublish: boolean;
	disabled: boolean;
	isPublished: boolean;
	isSubmitting: boolean;
	onPublish: () => void;
	onUnpublish: () => void;
}

function PublicationActionButton({
	canPublish,
	disabled,
	isPublished,
	isSubmitting,
	onPublish,
	onUnpublish,
}: PublicationActionButtonProps) {
	if (isPublished) {
		return (
			<Button
				aria-label="Unpublish VOD"
				disabled={disabled || isSubmitting}
				onClick={onUnpublish}
				size="sm"
				variant="outline"
			>
				<Lock className="mr-1.5 h-3.5 w-3.5" />
				{isSubmitting ? "Updating…" : "Unpublish VOD"}
			</Button>
		);
	}
	return (
		<Button
			aria-label="Publish VOD"
			disabled={disabled || isSubmitting || !canPublish}
			onClick={onPublish}
			size="sm"
			variant="default"
		>
			<Globe className="mr-1.5 h-3.5 w-3.5" />
			{isSubmitting ? "Publishing…" : "Publish VOD"}
		</Button>
	);
}

export function PublicationStatusControl({
	disabled = false,
	isSubmitting = false,
	onTogglePublish,
	scenarios: scenarioList,
	vod,
}: PublicationStatusControlProps) {
	const validation = useMemo(() => {
		return validateVodForPublishing(
			{ durationSeconds: vod.durationSeconds },
			scenarioList,
		);
	}, [scenarioList, vod.durationSeconds]);

	const handlePublish = useCallback(() => {
		onTogglePublish(true);
	}, [onTogglePublish]);

	const handleUnpublish = useCallback(() => {
		onTogglePublish(false);
	}, [onTogglePublish]);

	const errorMessage = getValidationErrorMessage(
		vod.isPublished,
		validation.valid,
		validation.error,
	);

	return (
		<div className="rounded-lg border border-border bg-card p-4 space-y-3 shadow-sm">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
				<div className="flex items-center gap-3">
					<div
						className={`flex h-9 w-9 items-center justify-center rounded-full border ${
							vod.isPublished
								? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
								: "border-amber-500/30 bg-amber-500/10 text-amber-400"
						}`}
					>
						{vod.isPublished ? (
							<Globe className="h-5 w-5" />
						) : (
							<Lock className="h-5 w-5" />
						)}
					</div>
					<div>
						<div className="flex items-center gap-2">
							<span className="text-sm font-semibold text-foreground">
								Publication Status:
							</span>
							<PublicationStatusBadge isPublished={vod.isPublished} />
						</div>
						<p className="text-xs text-muted-foreground mt-0.5">
							{vod.isPublished
								? "This VOD and its interactive scenarios are visible and playable by all users."
								: "Only administrators can view and edit this VOD while in draft mode."}
						</p>
					</div>
				</div>

				<PublicationActionButton
					canPublish={validation.valid}
					disabled={disabled}
					isPublished={vod.isPublished}
					isSubmitting={isSubmitting}
					onPublish={handlePublish}
					onUnpublish={handleUnpublish}
				/>
			</div>

			{errorMessage ? (
				<Alert variant="destructive">
					<AlertDescription className="text-xs">
						{errorMessage}
					</AlertDescription>
				</Alert>
			) : null}
		</div>
	);
}
