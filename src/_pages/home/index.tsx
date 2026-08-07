import { getPublishedVods } from "@/shared/db";
import { HomePage as HomePageUI } from "./ui/home-page";

export async function HomePage() {
	const vods = await getPublishedVods();
	return <HomePageUI vods={vods} />;
}
