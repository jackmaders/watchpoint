import { getPublishedVods } from "@/entities/vod";
import { isRegistrationOpen } from "@/shared/lib/auth";

export async function loadVodsPage() {
	const [vods, registrationEnabled] = await Promise.all([
		getPublishedVods(),
		isRegistrationOpen(),
	]);
	return { registrationEnabled, vods };
}
