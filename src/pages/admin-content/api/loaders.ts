/**
 * Data loader for the administrative VOD content management catalog.
 *
 * Implements `loadAdminContent` to fetch all VODs via `getAdminVods` using incoming `ContentSearchParams` dependencies.
 */
import { getAdminVods } from "@/widgets/admin-vod-editor";

export async function loadAdminContent() {
	const vods = await getAdminVods();
	return { vods };
}
