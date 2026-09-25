import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import type { ImportDemoLessonInput } from "@/entities/lesson";
import { importDemoLesson } from "./demo-convert.functions";

export function useDemoConvertMutation(input: ImportDemoLessonInput) {
	const importDemoLessonWithContext = useServerFn(importDemoLesson);

	return useMutation({
		mutationFn: () => importDemoLessonWithContext({ data: input }),
	});
}
