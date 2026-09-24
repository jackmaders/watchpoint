import { lazy, type ReactNode, Suspense } from "react";
import { PostCreateFormFallback } from "./post-create-form-fallback";

const LazyPostCreateForm = lazy(() =>
	import("./post-create-form").then((module) => ({
		default: module.PostCreateForm,
	})),
);

export interface PostCreateFormProps {
	fallback?: ReactNode;
}

export function PostCreateForm({
	fallback = <PostCreateFormFallback />,
}: PostCreateFormProps = {}) {
	return (
		<Suspense fallback={fallback}>
			<LazyPostCreateForm />
		</Suspense>
	);
}
