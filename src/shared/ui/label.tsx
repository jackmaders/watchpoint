"use client";
import { Label as LabelPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "@/shared/lib/utils";

function Label({
	className,
	...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
	return (
		<LabelPrimitive.Root
			className={cn(
				"flex items-center gap-2 text-sm leading-none font-medium select-none",
				className,
			)}
			data-slot="label"
			{...props}
		/>
	);
}

export { Label };
