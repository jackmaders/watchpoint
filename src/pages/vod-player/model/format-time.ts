const SECONDS_PER_MINUTE = 60;
const TIME_SEGMENT_PAD_LENGTH = 2;

function formatTime(timeSec: number): string {
  const safeSeconds = Number.isFinite(timeSec) ? Math.max(0, Math.floor(timeSec)) : 0;
  const minutes = Math.floor(safeSeconds / SECONDS_PER_MINUTE);
  const seconds = safeSeconds % SECONDS_PER_MINUTE;

  return `${String(minutes).padStart(TIME_SEGMENT_PAD_LENGTH, "0")}:${String(seconds).padStart(TIME_SEGMENT_PAD_LENGTH, "0")}`;
}

export { formatTime };
