import { getAdminVods } from "@/widgets/admin-vod-editor";

export async function loadAdminContent() {
	const vods = await getAdminVods();
	return { vods };
}
