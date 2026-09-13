import { useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
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
import {
	type HeroRole,
	type ScenarioItem,
	swapScenarios,
	type VodItem,
} from "../model";

export { swapScenarios };

export interface MutationStateHandlers {
	clearAlerts: () => void;
	setError: (err: string | null) => void;
	setIsSubmitting: (sub: boolean) => void;
}

export async function runMutation<
	T extends { reason?: string; status: "rejected" | "success" },
>(
	fn: () => Promise<T>,
	onSuccess: (res: T) => void,
	state: MutationStateHandlers,
	fallbackError = "Operation failed",
) {
	state.clearAlerts();
	state.setIsSubmitting(true);
	const res = await fn();
	if (res.status === "success") {
		onSuccess(res);
	} else {
		state.setError(res.reason ?? fallbackError);
	}
	state.setIsSubmitting(false);
}

function useVodUpdatePublish(
	vod: VodItem | null,
	setVod: (vod: VodItem | null) => void,
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
					if (res.status === "success") {
						setVod(res.vod);
						setSuccess("VOD metadata saved successfully!");
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
					if (res.status === "success") {
						setVod(res.vod);
						setSuccess(isPublished ? "VOD published!" : "VOD set to draft.");
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

export function useVodMutations(initialVod: VodItem | null) {
	const navigate = useNavigate();
	const [vod, setVod] = useState<VodItem | null>(initialVod);
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
					if (res.status === "success") {
						setSuccess("VOD created successfully!");
						setVod(res.vod);
						navigate({
							params: { id: res.vod.id },
							to: "/admin/content/$id",
						});
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
				if (res.status === "success") {
					navigate({ to: "/admin/content" });
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
		reason?: string;
		scenario?: ScenarioItem;
		status: "rejected" | "success";
	},
	isUpdate: boolean,
	scenariosList: ScenarioItem[],
	setScenariosList: React.Dispatch<React.SetStateAction<ScenarioItem[]>>,
	setSelectedScenario: (s: ScenarioItem | null) => void,
	state: ScenarioMutationsState,
) {
	if (res.status === "success" && res.scenario) {
		const saved = res.scenario;
		const updated = isUpdate
			? scenariosList.map((s) => (s.id === saved.id ? saved : s))
			: [...scenariosList, saved];
		setScenariosList(updated);
		setSelectedScenario(saved);
		state.setSuccess(isUpdate ? "Scenario updated!" : "Scenario created!");
	} else {
		state.setError(res.reason ?? "Unable to save scenario.");
	}
}

export function useScenarioMutations(
	initialScenarios: ScenarioItem[],
	vodId: string | undefined,
	state: ScenarioMutationsState,
) {
	const [scenariosList, setScenariosList] =
		useState<ScenarioItem[]>(initialScenarios);
	const [selectedScenario, setSelectedScenario] = useState<ScenarioItem | null>(
		null,
	);

	const handleSaveScenario = useCallback(
		async (payload: {
			explanationText: string;
			id?: string;
			imageUrl?: string | null;
			inputConfig: Record<string, unknown>;
			inputType: ScenarioItem["inputType"];
			moduleType: ScenarioItem["moduleType"];
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
					if (res.status === "success") {
						setScenariosList((prev) => prev.filter((s) => s.id !== scenarioId));
						if (selectedScenario?.id === scenarioId) {
							setSelectedScenario(null);
						}
						state.setSuccess("Scenario deleted.");
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
			if (res.status !== "success") {
				state.setError(res.reason ?? "Failed to reorder scenarios");
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
