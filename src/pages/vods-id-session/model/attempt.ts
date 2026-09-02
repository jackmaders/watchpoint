/**
 * Re-export adapter for attempt contracts and schemas within the session page slice.
 *
 * Exposes `AttemptOutcome`, `RecordAttemptInput`, `RecordAttemptInputSchema`, and `RecordAttemptResult`
 * from `src/entities/vod` for local slice use.
 */
export {
	type AttemptOutcome,
	type RecordAttemptInput,
	RecordAttemptInputSchema,
	type RecordAttemptResult,
} from "@/entities/vod";
