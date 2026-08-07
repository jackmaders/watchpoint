import { getPublishedVods } from "@/shared/db";
import { VodsPage as VodsPageUI } from "./ui/vods-page";

export async function VodsPage() {
	const vods = await getPublishedVods();
	return <VodsPageUI vods={vods} />;
}

export type { GetVodByIdOptions, PublishedVodItem } from "@/shared/db";
