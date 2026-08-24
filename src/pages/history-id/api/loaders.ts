import { getPlaythroughHistoryDetail } from "./server-fns";

export async function loadHistoryIdPage({
	params,
}: {
	params: { id: string };
}) {
	try {
		const playthrough = await getPlaythroughHistoryDetail({
			data: { id: params.id },
		});
		return {
			error: null,
			playthrough,
		};
	} catch (error) {
		return {
			error:
				error instanceof Error
					? error.message
					: "Failed to load session details",
			playthrough: null,
		};
	}
}
