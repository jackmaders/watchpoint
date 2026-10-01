import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod/v4";
import { postListQueryOptions } from "@/entities/post";
import { publishedVodListQueryOptions } from "@/entities/vod";
import { HomePage } from "@/pages/home";

export const Route = createFileRoute("/")({
	validateSearch: z.object({
		returnTo: z
			.string()
			.optional()
			.transform((returnTo) => getInternalReturnTo(returnTo)),
	}),
	loader: async ({ context }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(postListQueryOptions),
			context.queryClient.ensureQueryData(publishedVodListQueryOptions),
		]);
	},
	component: IndexPage,
});

function IndexPage() {
	const { returnTo } = Route.useSearch();
	return <HomePage returnTo={returnTo} />;
}

function getInternalReturnTo(returnTo: string | undefined) {
	if (!returnTo) {
		return "/";
	}

	try {
		const destination = new URL(returnTo, "https://watchpoint.invalid");
		if (
			destination.origin !== "https://watchpoint.invalid" ||
			destination.pathname.startsWith("//")
		) {
			return "/";
		}

		return `${destination.pathname}${destination.search}${destination.hash}`;
	} catch {
		return "/";
	}
}
