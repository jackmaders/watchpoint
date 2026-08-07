import { getAuth } from "@/shared/lib/auth";

export async function GET(request: Request) {
	const auth = await getAuth();
	return auth.handler(request);
}

export async function POST(request: Request) {
	const auth = await getAuth();
	return auth.handler(request);
}
