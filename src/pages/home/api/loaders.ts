/**
 * Data loader for the landing and home page view.
 *
 * Implements `loadHomePage` by concurrently fetching published training VODs and registration status.
 */
import { getPublishedVods } from "@/entities/vod";
import { isRegistrationOpen } from "@/shared/lib/auth";

export async function loadHomePage() {
	const [vods, registrationEnabled] = await Promise.all([
		getPublishedVods(),
		isRegistrationOpen(),
	]);
	return {
		registrationEnabled,
		vods,
	};
}
