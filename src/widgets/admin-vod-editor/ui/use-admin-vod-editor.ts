"use client";

import { useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import type { HeroRole, scenarios, vods } from "@/shared/db";
import {
	createScenario,
	createVod,
	deleteScenario,
	deleteVod,
	reorderScenarios,
	setVodPublicationStatus,
	updateScenario,
	updateVod,
} from "../api/server-fns";

export function swapScenarios(
	list: Array<typeof scenarios.$inferSelect>,
	scenarioId: string,
	direction: "up" | "down",
) {
	const sorted = [...list].sort(
		(a, b) => a.timestampSeconds - b.timestampSeconds,
	);
	const idx = sorted.findIndex((s) => s.id === scenarioId);
	if (idx === -1) return null;
	const targetIdx = direction === "up" ? idx - 1 : idx + 1;
	const current = sorted[idx];
	const target = sorted[targetIdx];
	if (!current || !target) return null;

	return sorted.map((s) => {
		if (s.id === current.id)
			return { ...s, timestampSeconds: target.timestampSeconds };
		if (s.id === target.id)
			return { ...s, timestampSeconds: current.timestampSeconds };
		return s;
	});
}

export interface MutationStateHandlers {
	clearAlerts: () => void;
	setError: (err: string | null) => void;
	setIsSubmitting: (sub: boolean) => void;
}

export async function runMutation<T>(
	runner: () => Promise<T>,
	onSuccess: (data: T) => void,
	state: MutationStateHandlers,
	fallbackError: string,
) {
	state.clearAlerts();
	state.setIsSubmitting(true);
	try {
		const result = await runner();
		onSuccess(result);
	} catch (err: unknown) {
		state.setError(err instanceof Error ? err.message : fallbackError);
	} finally {
		state.setIsSubmitting(false);
	}
}

function useVodUpdatePublish(
	vod: typeof vods.$inferSelect | null,
	setVod: (v: typeof vods.$inferSelect | null) => void,
	state: MutationStateHandlers,
	setSuccess: (s: string | null) => void,
) {
	const handleUpdateVodMetadata = useCallback(
		async (values: {
			durationSeconds: number;
			heroName: string;
			mapName: string;
			rankTier: string;
			role: HeroRole;
			title: string;
			youtubeVideoId: string;
		}) => {
			if (!vod) return;
			await runMutation(
				() => updateVod({ data: { id: vod.id, ...values } }),
				(res) => {
					if (res.success && res.vod) {
						setVod(res.vod);
						setSuccess("VOD metadata saved successfully!");
					} else {
						state.setError(res.error ?? "Failed to update VOD metadata");
					}
				},
				state,
				"Unable to save VOD.",
			);
		},
		[setSuccess, setVod, state, vod],
	);

	const handleTogglePublish = useCallback(
		async (isPublished: boolean) => {
			if (!vod) return;
			await runMutation(
				() => setVodPublicationStatus({ data: { id: vod.id, isPublished } }),
				(res) => {
					if (res.success && res.vod) {
						setVod(res.vod);
						setSuccess(isPublished ? "VOD published!" : "VOD set to draft.");
					} else {
						state.setError(res.error ?? "Failed to update publication status");
					}
				},
				state,
				"Unable to update status.",
			);
		},
		[setSuccess, setVod, state, vod],
	);

	return { handleTogglePublish, handleUpdateVodMetadata };
}

export function useVodMutations(initialVod: typeof vods.$inferSelect | null) {
	const navigate = useNavigate();
	const [vod, setVod] = useState<typeof vods.$inferSelect | null>(initialVod);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const clearAlerts = useCallback(() => {
		setError(null);
		setSuccess(null);
	}, []);

	const state = useMemo(
		() => ({ clearAlerts, setError, setIsSubmitting }),
		[clearAlerts],
	);

	const { handleTogglePublish, handleUpdateVodMetadata } = useVodUpdatePublish(
		vod,
		setVod,
		state,
		setSuccess,
	);

	const handleCreateVod = useCallback(
		async (values: {
			durationSeconds: number;
			heroName: string;
			mapName: string;
			rankTier: string;
			role: HeroRole;
			title: string;
			youtubeVideoId: string;
		}) => {
			await runMutation(
				() => createVod({ data: values }),
				(res) => {
					if (res.success && res.vod) {
						setSuccess("VOD created successfully!");
						setVod(res.vod);
						navigate({
							params: { id: res.vod.id },
							to: "/admin/content/$id",
						});
					} else {
						setError(res.error ?? "Failed to create VOD");
					}
				},
				state,
				"Unable to create VOD.",
			);
		},
		[navigate, state],
	);

	const handleDeleteVod = useCallback(async () => {
		if (!vod) return;
		await runMutation(
			() => deleteVod({ data: { id: vod.id } }),
			(res) => {
				if (res.success) {
					navigate({ to: "/admin/content" });
				} else {
					setError(res.error ?? "Failed to delete VOD");
				}
			},
			state,
			"Unable to delete VOD.",
		);
	}, [navigate, state, vod]);

	return {
		clearAlerts,
		error,
		handleCreateVod,
		handleDeleteVod,
		handleTogglePublish,
		handleUpdateVodMetadata,
		isSubmitting,
		setError,
		setIsSubmitting,
		setSuccess,
		success,
		vod,
	};
}

export interface ScenarioMutationsState extends MutationStateHandlers {
	setSuccess: (succ: string | null) => void;
}

function applyScenarioSaveResult(
	res: {
		error?: string;
		scenario?: typeof scenarios.$inferSelect;
		success: boolean;
	},
	isUpdate: boolean,
	scenariosList: Array<typeof scenarios.$inferSelect>,
	setScenariosList: React.Dispatch<
		React.SetStateAction<Array<typeof scenarios.$inferSelect>>
	>,
	setSelectedScenario: (s: typeof scenarios.$inferSelect | null) => void,
	state: ScenarioMutationsState,
) {
	if (res.success && res.scenario) {
		const saved = res.scenario;
		const updated = isUpdate
			? scenariosList.map((s) => (s.id === saved.id ? saved : s))
			: [...scenariosList, saved];
		setScenariosList(updated);
		setSelectedScenario(saved);
		state.setSuccess(isUpdate ? "Scenario updated!" : "Scenario created!");
	} else {
		state.setError(res.error ?? "Failed to save scenario");
	}
}

export function useScenarioMutations(
	initialScenarios: Array<typeof scenarios.$inferSelect>,
	vodId: string | undefined,
	state: ScenarioMutationsState,
) {
	const [scenariosList, setScenariosList] =
		useState<Array<typeof scenarios.$inferSelect>>(initialScenarios);
	const [selectedScenario, setSelectedScenario] = useState<
		typeof scenarios.$inferSelect | null
	>(null);

	const handleSaveScenario = useCallback(
		async (payload: {
			explanationText: string;
			id?: string;
			imageUrl?: string | null;
			inputConfig: Record<string, unknown>;
			inputType: (typeof scenarios.$inferSelect)["inputType"];
			moduleType: (typeof scenarios.$inferSelect)["moduleType"];
			promptText: string;
			timeLimitSeconds?: number | null;
			timestampSeconds: number;
			vodId: string;
		}) => {
			await runMutation(
				() =>
					payload.id
						? updateScenario({ data: payload as never })
						: createScenario({ data: payload as never }),
				(res) =>
					applyScenarioSaveResult(
						res,
						Boolean(payload.id),
						scenariosList,
						setScenariosList,
						setSelectedScenario,
						state,
					),
				state,
				"Unable to save scenario.",
			);
		},
		[scenariosList, state],
	);

	const handleDeleteScenario = useCallback(
		async (scenarioId: string) => {
			await runMutation(
				() => deleteScenario({ data: { id: scenarioId } }),
				(res) => {
					if (res.success) {
						setScenariosList((prev) => prev.filter((s) => s.id !== scenarioId));
						if (selectedScenario?.id === scenarioId) {
							setSelectedScenario(null);
						}
						state.setSuccess("Scenario deleted.");
					} else {
						state.setError(res.error ?? "Failed to delete scenario");
					}
				},
				state,
				"Unable to delete scenario.",
			);
		},
		[selectedScenario?.id, state],
	);

	const handleMoveScenario = useCallback(
		async (scenarioId: string, direction: "up" | "down") => {
			if (!vodId) return;
			const updated = swapScenarios(scenariosList, scenarioId, direction);
			if (!updated) return;
			setScenariosList(updated);
			const orders = updated.map((s) => ({
				id: s.id,
				timestampSeconds: s.timestampSeconds,
			}));
			const res = await reorderScenarios({
				data: { scenarioOrders: orders, vodId },
			});
			if (!res.success) {
				state.setError(res.error ?? "Failed to reorder scenarios");
			}
		},
		[scenariosList, state, vodId],
	);

	return {
		handleDeleteScenario,
		handleMoveScenario,
		handleSaveScenario,
		scenariosList,
		selectedScenario,
		setSelectedScenario,
	};
}
