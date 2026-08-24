import { useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import type { DbResult, HeroRole, scenarios, vods } from "@/shared/db";
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

export interface MutationStateHandlers {
	clearAlerts: () => void;
	setError: (err: string | null) => void;
	setIsSubmitting: (sub: boolean) => void;
}

export function swapScenarios(
	scenariosList: Array<typeof scenarios.$inferSelect>,
	scenarioId: string,
	direction: "up" | "down",
) {
	const index = scenariosList.findIndex((s) => s.id === scenarioId);
	if (index === -1) return null;
	if (direction === "up" && index === 0) return null;
	if (direction === "down" && index === scenariosList.length - 1) return null;

	const targetIndex = direction === "up" ? index - 1 : index + 1;
	const updated = [...scenariosList];
	const current = updated[index];
	const target = updated[targetIndex];
	/* v8 ignore next */
	if (!current || !target) return null;

	const tempTimestamp = current.timestampSeconds;
	updated[index] = { ...target, timestampSeconds: tempTimestamp };
	updated[targetIndex] = {
		...current,
		timestampSeconds: target.timestampSeconds,
	};
	return updated;
}

export async function runMutation<T>(
	fn: () => Promise<T>,
	onSuccess: (res: T) => void,
	state: MutationStateHandlers,
	fallbackError: string,
) {
	state.clearAlerts();
	state.setIsSubmitting(true);
	try {
		const res = await fn();
		onSuccess(res);
	} catch (error) {
		state.setError(error instanceof Error ? error.message : fallbackError);
	} finally {
		state.setIsSubmitting(false);
	}
}

function useVodUpdatePublish(
	vod: typeof vods.$inferSelect | null,
	setVod: (vod: typeof vods.$inferSelect | null) => void,
	state: MutationStateHandlers,
	setSuccess: (msg: string | null) => void,
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
					if (res.success) {
						setVod(res.data);
						setSuccess("VOD metadata saved successfully!");
					} else {
						state.setError(res.error);
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
					if (res.success) {
						setVod(res.data);
						setSuccess(isPublished ? "VOD published!" : "VOD set to draft.");
					} else {
						state.setError(res.error);
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
					if (res.success) {
						setSuccess("VOD created successfully!");
						setVod(res.data);
						navigate({
							params: { id: res.data.id },
							to: "/admin/content/$id",
						});
					} else {
						setError(res.error);
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
					setError(res.error);
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
	res: DbResult<typeof scenarios.$inferSelect>,
	isUpdate: boolean,
	scenariosList: Array<typeof scenarios.$inferSelect>,
	setScenariosList: React.Dispatch<
		React.SetStateAction<Array<typeof scenarios.$inferSelect>>
	>,
	setSelectedScenario: (s: typeof scenarios.$inferSelect | null) => void,
	state: ScenarioMutationsState,
) {
	if (res.success) {
		const saved = res.data;
		const updated = isUpdate
			? scenariosList.map((s) => (s.id === saved.id ? saved : s))
			: [...scenariosList, saved];
		setScenariosList(updated);
		setSelectedScenario(saved);
		state.setSuccess(isUpdate ? "Scenario updated!" : "Scenario created!");
	} else {
		state.setError(res.error);
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
						state.setError(res.error);
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
				state.setError(res.error);
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
