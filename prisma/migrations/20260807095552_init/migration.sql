-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expiresAt" DATETIME NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" DATETIME,
    "refreshTokenExpiresAt" DATETIME,
    "scope" TEXT,
    "password" TEXT,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME,
    "updatedAt" DATETIME
);

-- CreateTable
CREATE TABLE "vod" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "youtube_video_id" TEXT NOT NULL,
    "duration_seconds" INTEGER NOT NULL,
    "map_name" TEXT NOT NULL,
    "rank_tier" TEXT NOT NULL,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "scenario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vod_id" TEXT NOT NULL,
    "timestamp_seconds" REAL NOT NULL,
    "module_type" TEXT NOT NULL,
    "time_limit_seconds" INTEGER,
    "prompt_text" TEXT NOT NULL,
    "explanation_text" TEXT NOT NULL,
    "image_url" TEXT,
    "input_type" TEXT NOT NULL,
    "input_config" JSONB NOT NULL,
    CONSTRAINT "scenario_vod_id_fkey" FOREIGN KEY ("vod_id") REFERENCES "vod" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "attempt_record" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "scenario_id" TEXT NOT NULL,
    "selected_option_id" TEXT,
    "input_value" JSONB,
    "is_correct" BOOLEAN NOT NULL,
    "response_time_ms" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attempt_record_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "attempt_record_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "scenario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "vod_is_published_created_at_idx" ON "vod"("is_published", "created_at" DESC);

-- CreateIndex
CREATE INDEX "scenario_vod_id_module_type_idx" ON "scenario"("vod_id", "module_type");

-- CreateIndex
CREATE INDEX "scenario_vod_id_timestamp_seconds_idx" ON "scenario"("vod_id", "timestamp_seconds" ASC);

-- CreateIndex
CREATE INDEX "attempt_record_user_id_idx" ON "attempt_record"("user_id");

-- CreateIndex
CREATE INDEX "attempt_record_scenario_id_idx" ON "attempt_record"("scenario_id");
