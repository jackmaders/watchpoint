"use client";

import { useCallback, useEffect, useState } from "react";
import type { HeroRole, vods } from "@/shared/db";
import {
	type VodMetadataFormProps,
	validateVodMetadata,
} from "./vod-metadata-form";

function useVodFormState(vod: typeof vods.$inferSelect | null | undefined) {
	const [title, setTitle] = useState(vod ? vod.title : "");
	const [youtubeVideoId, setYoutubeVideoId] = useState(
		vod ? vod.youtubeVideoId : "",
	);
	const [heroName, setHeroName] = useState(vod ? vod.heroName : "");
	const [role, setRole] = useState<HeroRole>(vod ? vod.role : "SUPPORT");
	const [mapName, setMapName] = useState(vod ? vod.mapName : "");
	const [durationSeconds, setDurationSeconds] = useState<number | string>(
		vod ? vod.durationSeconds : 600,
	);
	const [rankTier, setRankTier] = useState(vod ? vod.rankTier : "Grandmaster");

	useEffect(() => {
		if (vod) {
			setTitle(vod.title);
			setYoutubeVideoId(vod.youtubeVideoId);
			setHeroName(vod.heroName);
			setRole(vod.role);
			setMapName(vod.mapName);
			setDurationSeconds(vod.durationSeconds);
			setRankTier(vod.rankTier);
		}
	}, [vod]);

	return {
		durationSeconds,
		heroName,
		mapName,
		rankTier,
		role,
		setDurationSeconds,
		setHeroName,
		setMapName,
		setRankTier,
		setRole,
		setTitle,
		setYoutubeVideoId,
		title,
		youtubeVideoId,
	};
}

export function useVodMetadataFormState(
	vod: typeof vods.$inferSelect | null | undefined,
	onSave: VodMetadataFormProps["onSave"],
) {
	const state = useVodFormState(vod);
	const [error, setError] = useState<string | null>(null);

	const handleTitleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => state.setTitle(e.target.value),
		[state],
	);
	const handleYoutubeChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) =>
			state.setYoutubeVideoId(e.target.value),
		[state],
	);
	const handleDurationChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) =>
			state.setDurationSeconds(e.target.value),
		[state],
	);
	const handleHeroChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) =>
			state.setHeroName(e.target.value),
		[state],
	);
	const handleRoleChange = useCallback(
		(e: React.ChangeEvent<HTMLSelectElement>) =>
			state.setRole(e.target.value as HeroRole),
		[state],
	);
	const handleMapChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) =>
			state.setMapName(e.target.value),
		[state],
	);
	const handleRankChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) =>
			state.setRankTier(e.target.value),
		[state],
	);

	const handleSubmit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();
			const validationErr = validateVodMetadata({
				durationSeconds: state.durationSeconds,
				heroName: state.heroName,
				mapName: state.mapName,
				rankTier: state.rankTier,
				title: state.title,
				youtubeVideoId: state.youtubeVideoId,
			});
			if (validationErr) {
				setError(validationErr);
				return;
			}
			setError(null);
			onSave({
				durationSeconds: Number(state.durationSeconds),
				heroName: state.heroName.trim(),
				mapName: state.mapName.trim(),
				rankTier: state.rankTier.trim(),
				role: state.role,
				title: state.title.trim(),
				youtubeVideoId: state.youtubeVideoId.trim(),
			});
		},
		[onSave, state],
	);

	return {
		durationSeconds: state.durationSeconds,
		error,
		handleDurationChange,
		handleHeroChange,
		handleMapChange,
		handleRankChange,
		handleRoleChange,
		handleSubmit,
		handleTitleChange,
		handleYoutubeChange,
		heroName: state.heroName,
		mapName: state.mapName,
		rankTier: state.rankTier,
		role: state.role,
		title: state.title,
		youtubeVideoId: state.youtubeVideoId,
	};
}
