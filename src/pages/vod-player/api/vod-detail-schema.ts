import * as z from "zod";

const VOD_ID_MIN_LENGTH = 1;

const getVodDetailInputSchema = z.object({
  vodId: z.string().trim().min(VOD_ID_MIN_LENGTH, "VOD id is required"),
});

export { getVodDetailInputSchema };
