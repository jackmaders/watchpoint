import { CircleHelp, Clock3 } from "lucide-react";
import { useId } from "react";
import type { VodCatalog as VodCatalogData } from "@/entities/vod";
import { Badge } from "@/shared/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/shared/ui/card";

export function VodCatalog({ vods }: { vods: VodCatalogData }) {
	const titleId = useId();

	return (
		<section aria-labelledby={titleId}>
			<div className="flex items-end justify-between gap-4">
				<div>
					<p className="font-mono text-primary text-xs uppercase tracking-eyebrow">
						Learning library
					</p>
					<h2 className="mt-2 font-heading text-3xl" id={titleId}>
						Published VODs
					</h2>
				</div>
				<p className="text-muted-foreground text-sm">
					{vods.length} {vods.length === 1 ? "VOD" : "VODs"}
				</p>
			</div>

			{vods.length === 0 ? (
				<p className="mt-6 rounded-xl border border-border/70 border-dashed p-8 text-center text-muted-foreground text-sm">
					No published VODs are available yet.
				</p>
			) : (
				<ul className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
					{vods.map((vod) => (
						<li key={vod.id}>
							<Card className="h-full">
								<CardHeader>
									<CardTitle className="text-xl leading-tight">
										{vod.title}
									</CardTitle>
									<CardDescription className="flex flex-wrap gap-x-4 gap-y-2">
										<span className="inline-flex items-center gap-1.5">
											<Clock3 aria-hidden="true" className="size-3.5" />
											{formatDuration(vod.durationSeconds)}
										</span>
										<span className="inline-flex items-center gap-1.5">
											<CircleHelp aria-hidden="true" className="size-3.5" />
											{vod.questionCount}{" "}
											{vod.questionCount === 1 ? "Question" : "Questions"}
										</span>
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="flex flex-wrap gap-2">
										{vod.skills.map((skill) => (
											<Badge key={skill.id} variant="secondary">
												{skill.name}
											</Badge>
										))}
									</div>
								</CardContent>
							</Card>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}

function formatDuration(durationSeconds: number) {
	const minutes = Math.floor(durationSeconds / 60);
	const seconds = durationSeconds % 60;
	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
