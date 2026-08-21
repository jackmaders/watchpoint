"use client";

import { useId } from "react";
import { type HeroRole, heroRoleEnum, type vods } from "@/shared/db";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { FieldDescription, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { useVodMetadataFormState } from "./use-vod-metadata-form";

export interface VodMetadataFormProps {
	disabled?: boolean;
	isCreate?: boolean;
	isSubmitting?: boolean;
	onCancel?: () => void;
	onSave: (values: {
		durationSeconds: number;
		heroName: string;
		mapName: string;
		rankTier: string;
		role: HeroRole;
		title: string;
		youtubeVideoId: string;
	}) => void;
	vod?: typeof vods.$inferSelect | null;
}

export function validateVodMetadata(values: {
	durationSeconds: number | string;
	heroName: string;
	mapName: string;
	rankTier: string;
	title: string;
	youtubeVideoId: string;
}): string | null {
	if (!values.title.trim()) return "Title is required";
	if (!values.youtubeVideoId.trim()) return "YouTube video ID is required";
	if (!values.heroName.trim()) return "Hero name is required";
	if (!values.mapName.trim()) return "Map name is required";
	if (!values.rankTier.trim()) return "Rank tier is required";
	const duration = Number(values.durationSeconds);
	if (Number.isNaN(duration) || duration <= 0) {
		return "Duration must be a positive number of seconds";
	}
	return null;
}

interface VodMetadataFieldsProps {
	disabled: boolean;
	durationId: string;
	durationSeconds: number | string;
	heroId: string;
	heroName: string;
	isSubmitting: boolean;
	mapId: string;
	mapName: string;
	onDurationChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onHeroChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onMapChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onRankChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onRoleChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
	onTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onYoutubeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	rankId: string;
	rankTier: string;
	role: HeroRole;
	roleId: string;
	title: string;
	titleId: string;
	youtubeId: string;
	youtubeVideoId: string;
}

function VodMetadataFields({
	disabled,
	durationId,
	durationSeconds,
	heroId,
	heroName,
	isSubmitting,
	mapId,
	mapName,
	onDurationChange,
	onHeroChange,
	onMapChange,
	onRankChange,
	onRoleChange,
	onTitleChange,
	onYoutubeChange,
	rankId,
	rankTier,
	role,
	roleId,
	title,
	titleId,
	youtubeId,
	youtubeVideoId,
}: VodMetadataFieldsProps) {
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
			<div className="sm:col-span-2">
				<FieldLabel htmlFor={titleId}>VOD Title</FieldLabel>
				<Input
					aria-label="VOD Title"
					className="mt-1"
					disabled={disabled || isSubmitting}
					id={titleId}
					onChange={onTitleChange}
					placeholder="e.g. GM Kiriko Match Review - Circuit Royal"
					value={title}
				/>
			</div>

			<div>
				<FieldLabel htmlFor={youtubeId}>YouTube Video ID</FieldLabel>
				<Input
					aria-label="YouTube Video ID"
					className="mt-1 font-mono"
					disabled={disabled || isSubmitting}
					id={youtubeId}
					onChange={onYoutubeChange}
					placeholder="e.g. dQw4w9WgXcQ"
					value={youtubeVideoId}
				/>
				<FieldDescription className="text-[11px] mt-0.5">
					The 11-character video ID from YouTube.
				</FieldDescription>
			</div>

			<div>
				<FieldLabel htmlFor={durationId}>Duration (Seconds)</FieldLabel>
				<Input
					aria-label="Duration (Seconds)"
					className="mt-1 font-mono"
					disabled={disabled || isSubmitting}
					id={durationId}
					min={1}
					onChange={onDurationChange}
					placeholder="600"
					type="number"
					value={durationSeconds}
				/>
				<FieldDescription className="text-[11px] mt-0.5">
					Total video length in seconds.
				</FieldDescription>
			</div>

			<div>
				<FieldLabel htmlFor={heroId}>Hero Name</FieldLabel>
				<Input
					aria-label="Hero Name"
					className="mt-1"
					disabled={disabled || isSubmitting}
					id={heroId}
					onChange={onHeroChange}
					placeholder="e.g. Ana, Winston, Tracer"
					value={heroName}
				/>
			</div>

			<div>
				<FieldLabel htmlFor={roleId}>Role</FieldLabel>
				<select
					aria-label="Role"
					className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50 text-foreground"
					disabled={disabled || isSubmitting}
					id={roleId}
					onChange={onRoleChange}
					value={role}
				>
					{heroRoleEnum.map((r) => (
						<option
							className="bg-popover text-popover-foreground"
							key={r}
							value={r}
						>
							{r}
						</option>
					))}
				</select>
			</div>

			<div>
				<FieldLabel htmlFor={mapId}>Map Name</FieldLabel>
				<Input
					aria-label="Map Name"
					className="mt-1"
					disabled={disabled || isSubmitting}
					id={mapId}
					onChange={onMapChange}
					placeholder="e.g. King's Row, Dorado"
					value={mapName}
				/>
			</div>

			<div>
				<FieldLabel htmlFor={rankId}>Rank Tier</FieldLabel>
				<Input
					aria-label="Rank Tier"
					className="mt-1"
					disabled={disabled || isSubmitting}
					id={rankId}
					onChange={onRankChange}
					placeholder="e.g. Grandmaster, Top 500, Diamond"
					value={rankTier}
				/>
			</div>
		</div>
	);
}

export function VodMetadataForm({
	disabled = false,
	isCreate = false,
	isSubmitting = false,
	onCancel,
	onSave,
	vod,
}: VodMetadataFormProps) {
	const baseId = useId();
	const titleId = `${baseId}-title`;
	const youtubeId = `${baseId}-youtube`;
	const durationId = `${baseId}-duration`;
	const heroId = `${baseId}-hero`;
	const roleId = `${baseId}-role`;
	const mapId = `${baseId}-map`;
	const rankId = `${baseId}-rank`;

	const {
		durationSeconds,
		error,
		handleDurationChange,
		handleHeroChange,
		handleMapChange,
		handleRankChange,
		handleRoleChange,
		handleSubmit,
		handleTitleChange,
		handleYoutubeChange,
		heroName,
		mapName,
		rankTier,
		role,
		title,
		youtubeVideoId,
	} = useVodMetadataFormState(vod, onSave);

	return (
		<form
			className="rounded-lg border border-border bg-card p-5 space-y-5 shadow-sm"
			onSubmit={handleSubmit}
		>
			<div className="border-b border-border pb-3">
				<h3 className="text-base font-semibold text-foreground">
					{isCreate ? "Create New VOD" : "VOD Identity & Metadata"}
				</h3>
				<p className="text-xs text-muted-foreground">
					Set video playback source, attribution hero, role, and duration.
				</p>
			</div>

			{error ? (
				<Alert aria-live="assertive" variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			) : null}

			<VodMetadataFields
				disabled={disabled}
				durationId={durationId}
				durationSeconds={durationSeconds}
				heroId={heroId}
				heroName={heroName}
				isSubmitting={isSubmitting}
				mapId={mapId}
				mapName={mapName}
				onDurationChange={handleDurationChange}
				onHeroChange={handleHeroChange}
				onMapChange={handleMapChange}
				onRankChange={handleRankChange}
				onRoleChange={handleRoleChange}
				onTitleChange={handleTitleChange}
				onYoutubeChange={handleYoutubeChange}
				rankId={rankId}
				rankTier={rankTier}
				role={role}
				roleId={roleId}
				title={title}
				titleId={titleId}
				youtubeId={youtubeId}
				youtubeVideoId={youtubeVideoId}
			/>

			<div className="flex items-center justify-end gap-3 border-t border-border pt-4">
				{onCancel ? (
					<Button
						disabled={disabled || isSubmitting}
						onClick={onCancel}
						type="button"
						variant="outline"
					>
						Cancel
					</Button>
				) : null}
				<Button
					disabled={disabled || isSubmitting}
					type="submit"
					variant="default"
				>
					{isSubmitting
						? "Saving…"
						: isCreate
							? "Create VOD"
							: "Save VOD Metadata"}
				</Button>
			</div>
		</form>
	);
}
