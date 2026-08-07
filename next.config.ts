import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

initOpenNextCloudflareForDev();

const nextConfig = {
	serverExternalPackages: ["@prisma/client", ".prisma/client"],
} satisfies NextConfig;

export default withSentryConfig(nextConfig, {
	authToken: process.env.SENTRY_AUTH_TOKEN,
	org: process.env.SENTRY_ORG,
	project: process.env.SENTRY_PROJECT,
	silent: !process.env.CI,
	widenClientFileUpload: true,
});
