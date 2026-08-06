import { VodsPage } from "@/pages/vods";
import { getPublishedVods } from "@/shared/db";

export default async function Page() {
	const vods = await getPublishedVods();
	return <VodsPage vods={vods} />;
}
