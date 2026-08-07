import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

initOpenNextCloudflareForDev();

export default {
	serverExternalPackages: ["@prisma/client", ".prisma/client"],
} satisfies NextConfig;
