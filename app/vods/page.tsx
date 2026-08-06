import { VodsPage } from "@/_pages/vods";
import { getPublishedVods } from "@/shared/db";

export const dynamic = "force-dynamic";

export default async function Page() {
	const vods = await getPublishedVods();
	return <VodsPage vods={vods} />;
}
