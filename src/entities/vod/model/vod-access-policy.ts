export type VodLessonAccessMode = "demo" | "standard";

export interface VodLessonAccessTarget {
	readonly id: string;
	readonly isDemo: boolean;
	readonly isPublished: boolean;
}

export interface UserSessionLike {
	readonly user: {
		readonly id: string;
		readonly role?: string | null;
	};
}

export type VodLessonAccessResult =
	| {
			readonly status: "allow";
			readonly mode: VodLessonAccessMode;
	  }
	| {
			readonly status: "redirect";
			readonly to: string;
			readonly returnTo: string;
	  }
	| {
			readonly status: "not-found";
	  };

export interface EvaluateVodLessonAccessParams {
	readonly returnTo?: string;
	readonly session: UserSessionLike | null;
	readonly vod: VodLessonAccessTarget | null;
}

export function evaluateVodLessonAccess({
	vod,
	session,
	returnTo = "/",
}: EvaluateVodLessonAccessParams): VodLessonAccessResult {
	if (!vod) {
		return { status: "not-found" };
	}

	if (vod.isDemo) {
		return { status: "allow", mode: "demo" };
	}

	if (!vod.isPublished) {
		return { status: "not-found" };
	}

	if (!session?.user) {
		return {
			status: "redirect",
			to: "/",
			returnTo,
		};
	}

	return {
		status: "allow",
		mode: "standard",
	};
}
