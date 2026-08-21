"use client";

import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, FileText, History, Layers, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import type { HeroRole, scenarios, vods } from "@/shared/db";
import type { AuthenticatedUser } from "@/shared/lib/permissions";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { type AuditEntryItem, AuditHistoryPanel } from "./audit-history-panel";
import { PublicationStatusControl } from "./publication-status-control";
import { ScenarioEditorForm } from "./scenario-editor-form";
import { ScenarioTimeline } from "./scenario-timeline";
import { useScenarioMutations, useVodMutations } from "./use-admin-vod-editor";
import { VodMetadataForm } from "./vod-metadata-form";

export interface AdminVodEditorPageProps {
	auditEntries?: AuditEntryItem[];
	currentUser: AuthenticatedUser;
	initialScenarios?: Array<typeof scenarios.$inferSelect>;
	initialVod?: typeof vods.$inferSelect | null;
	isCreate?: boolean;
}

type TabKey = "scenarios" | "details" | "audit";

interface AdminVodEditorHeaderProps {
	heroName: string;
	isSubmitting: boolean;
	onDeleteVod: () => void;
	role: string;
	title: string;
}

function AdminVodEditorHeader({
	heroName,
	isSubmitting,
	onDeleteVod,
	role,
	title,
}: AdminVodEditorHeaderProps) {
	return (
		<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
			<div className="flex items-center gap-3">
				<Link
					className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
					to="/admin/content"
				>
					<ArrowLeft className="mr-1 h-3.5 w-3.5" />
					Catalog
				</Link>
				<span className="text-muted-foreground">/</span>
				<div className="flex items-center gap-2">
					<h1 className="text-xl font-bold tracking-tight text-foreground truncate max-w-md">
						{title}
					</h1>
					<span className="rounded bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground border border-border">
						{heroName} ({role})
					</span>
				</div>
			</div>

			<div className="flex items-center gap-2">
				<Button
					aria-label="Delete VOD"
					disabled={isSubmitting}
					onClick={onDeleteVod}
					size="sm"
					variant="outline"
				>
					<Trash2 className="mr-1.5 h-3.5 w-3.5 text-destructive" />
					Delete VOD
				</Button>
			</div>
		</div>
	);
}

interface AdminVodEditorTabsNavProps {
	activeTab: TabKey;
	auditCount: number;
	onTabSelect: (tab: TabKey) => void;
	scenariosCount: number;
}

function AdminVodEditorTabsNav({
	activeTab,
	auditCount,
	onTabSelect,
	scenariosCount,
}: AdminVodEditorTabsNavProps) {
	const handleScenariosClick = useCallback(
		() => onTabSelect("scenarios"),
		[onTabSelect],
	);
	const handleDetailsClick = useCallback(
		() => onTabSelect("details"),
		[onTabSelect],
	);
	const handleAuditClick = useCallback(
		() => onTabSelect("audit"),
		[onTabSelect],
	);

	return (
		<div className="flex border-b border-border gap-2">
			<button
				aria-label="Scenarios & Timeline"
				className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
					activeTab === "scenarios"
						? "border-primary text-primary"
						: "border-transparent text-muted-foreground hover:text-foreground"
				}`}
				onClick={handleScenariosClick}
				type="button"
			>
				<Layers className="h-4 w-4" />
				Scenarios & Timeline ({scenariosCount})
			</button>
			<button
				aria-label="VOD Details"
				className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
					activeTab === "details"
						? "border-primary text-primary"
						: "border-transparent text-muted-foreground hover:text-foreground"
				}`}
				onClick={handleDetailsClick}
				type="button"
			>
				<FileText className="h-4 w-4" />
				VOD Details
			</button>
			<button
				aria-label="Audit History"
				className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
					activeTab === "audit"
						? "border-primary text-primary"
						: "border-transparent text-muted-foreground hover:text-foreground"
				}`}
				onClick={handleAuditClick}
				type="button"
			>
				<History className="h-4 w-4" />
				Audit History ({auditCount})
			</button>
		</div>
	);
}

interface VodCreateViewProps {
	error: string | null;
	isSubmitting: boolean;
	onCancel: () => void;
	onCreate: (values: {
		durationSeconds: number;
		heroName: string;
		mapName: string;
		rankTier: string;
		role: HeroRole;
		title: string;
		youtubeVideoId: string;
	}) => void;
}

function VodCreateView({
	error,
	isSubmitting,
	onCancel,
	onCreate,
}: VodCreateViewProps) {
	return (
		<div className="space-y-6 max-w-4xl mx-auto">
			<Link
				className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
				to="/admin/content"
			>
				<ArrowLeft className="mr-1 h-3.5 w-3.5" />
				Back to Content Catalog
			</Link>
			{error ? (
				<Alert aria-live="assertive" variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			) : null}
			<VodMetadataForm
				isCreate
				isSubmitting={isSubmitting}
				onCancel={onCancel}
				onSave={onCreate}
			/>
		</div>
	);
}

interface VodEditorScenariosTabProps {
	isSubmitting: boolean;
	onAddScenario: () => void;
	onCancelEdit: () => void;
	onDeleteScenario: (id: string) => void;
	onMoveScenario: (id: string, direction: "up" | "down") => void;
	onSaveScenario: (payload: {
		explanationText: string;
		id?: string;
		imageUrl?: string | null;
		inputConfig: Record<string, unknown>;
		inputType: (typeof scenarios.$inferSelect)["inputType"];
		moduleType: (typeof scenarios.$inferSelect)["moduleType"];
		promptText: string;
		timeLimitSeconds?: number | null;
		timestampSeconds: number;
		vodId: string;
	}) => void;
	onSelectScenario: (scenario: typeof scenarios.$inferSelect) => void;
	scenariosList: Array<typeof scenarios.$inferSelect>;
	selectedScenario: typeof scenarios.$inferSelect | null;
	vod: typeof vods.$inferSelect;
}

function VodEditorScenariosTab({
	isSubmitting,
	onAddScenario,
	onCancelEdit,
	onDeleteScenario,
	onMoveScenario,
	onSaveScenario,
	onSelectScenario,
	scenariosList,
	selectedScenario,
	vod,
}: VodEditorScenariosTabProps) {
	return (
		<div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
			<div className="lg:col-span-5 space-y-4">
				<ScenarioTimeline
					disabled={isSubmitting}
					onAddScenario={onAddScenario}
					onDeleteScenario={onDeleteScenario}
					onMoveScenario={onMoveScenario}
					onSelectScenario={onSelectScenario}
					scenarios={scenariosList}
					selectedScenarioId={selectedScenario?.id ?? null}
				/>
			</div>
			<div className="lg:col-span-7">
				<ScenarioEditorForm
					disabled={isSubmitting}
					isSubmitting={isSubmitting}
					onCancel={onCancelEdit}
					onSave={onSaveScenario}
					scenario={selectedScenario}
					vod={vod}
				/>
			</div>
		</div>
	);
}

interface VodEditorBodyProps {
	activeTab: TabKey;
	auditEntries: AuditEntryItem[];
	isSubmitting: boolean;
	onAddScenario: () => void;
	onCancelEdit: () => void;
	onDeleteScenario: (id: string) => void;
	onMoveScenario: (id: string, direction: "up" | "down") => void;
	onSaveScenario: VodEditorScenariosTabProps["onSaveScenario"];
	onSelectScenario: (s: typeof scenarios.$inferSelect) => void;
	onUpdateMetadata: (values: {
		durationSeconds: number;
		heroName: string;
		mapName: string;
		rankTier: string;
		role: HeroRole;
		title: string;
		youtubeVideoId: string;
	}) => void;
	scenariosList: Array<typeof scenarios.$inferSelect>;
	selectedScenario: typeof scenarios.$inferSelect | null;
	vod: typeof vods.$inferSelect;
}

function VodEditorBody({
	activeTab,
	auditEntries,
	isSubmitting,
	onAddScenario,
	onCancelEdit,
	onDeleteScenario,
	onMoveScenario,
	onSaveScenario,
	onSelectScenario,
	onUpdateMetadata,
	scenariosList,
	selectedScenario,
	vod,
}: VodEditorBodyProps) {
	if (activeTab === "scenarios") {
		return (
			<VodEditorScenariosTab
				isSubmitting={isSubmitting}
				onAddScenario={onAddScenario}
				onCancelEdit={onCancelEdit}
				onDeleteScenario={onDeleteScenario}
				onMoveScenario={onMoveScenario}
				onSaveScenario={onSaveScenario}
				onSelectScenario={onSelectScenario}
				scenariosList={scenariosList}
				selectedScenario={selectedScenario}
				vod={vod}
			/>
		);
	}
	if (activeTab === "details") {
		return (
			<div className="max-w-3xl">
				<VodMetadataForm
					disabled={isSubmitting}
					isCreate={false}
					isSubmitting={isSubmitting}
					onSave={onUpdateMetadata}
					vod={vod}
				/>
			</div>
		);
	}
	return (
		<div className="max-w-4xl">
			<AuditHistoryPanel auditEntries={auditEntries} />
		</div>
	);
}

interface VodEditorLayoutProps {
	activeTab: TabKey;
	auditEntries: AuditEntryItem[];
	error: string | null;
	isSubmitting: boolean;
	onAddScenario: () => void;
	onCancelEdit: () => void;
	onDeleteScenario: (id: string) => void;
	onDeleteVod: () => void;
	onMoveScenario: (id: string, direction: "up" | "down") => void;
	onSaveScenario: VodEditorScenariosTabProps["onSaveScenario"];
	onSelectScenario: (s: typeof scenarios.$inferSelect) => void;
	onTabSelect: (tab: TabKey) => void;
	onTogglePublish: (pub: boolean) => void;
	onUpdateMetadata: (
		v: Parameters<VodEditorBodyProps["onUpdateMetadata"]>[0],
	) => void;
	scenariosList: Array<typeof scenarios.$inferSelect>;
	selectedScenario: typeof scenarios.$inferSelect | null;
	success: string | null;
	vod: typeof vods.$inferSelect;
}

function VodEditorLayout({
	activeTab,
	auditEntries,
	error,
	isSubmitting,
	onAddScenario,
	onCancelEdit,
	onDeleteScenario,
	onDeleteVod,
	onMoveScenario,
	onSaveScenario,
	onSelectScenario,
	onTabSelect,
	onTogglePublish,
	onUpdateMetadata,
	scenariosList,
	selectedScenario,
	success,
	vod,
}: VodEditorLayoutProps) {
	return (
		<div className="space-y-6">
			<AdminVodEditorHeader
				heroName={vod.heroName}
				isSubmitting={isSubmitting}
				onDeleteVod={onDeleteVod}
				role={vod.role}
				title={vod.title}
			/>

			{error ? (
				<Alert aria-live="assertive" variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			) : null}

			{success ? (
				<Alert className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
					<AlertDescription>{success}</AlertDescription>
				</Alert>
			) : null}

			<PublicationStatusControl
				disabled={isSubmitting}
				isSubmitting={isSubmitting}
				onTogglePublish={onTogglePublish}
				scenarios={scenariosList}
				vod={vod}
			/>

			<AdminVodEditorTabsNav
				activeTab={activeTab}
				auditCount={auditEntries.length}
				onTabSelect={onTabSelect}
				scenariosCount={scenariosList.length}
			/>

			<VodEditorBody
				activeTab={activeTab}
				auditEntries={auditEntries}
				isSubmitting={isSubmitting}
				onAddScenario={onAddScenario}
				onCancelEdit={onCancelEdit}
				onDeleteScenario={onDeleteScenario}
				onMoveScenario={onMoveScenario}
				onSaveScenario={onSaveScenario}
				onSelectScenario={onSelectScenario}
				onUpdateMetadata={onUpdateMetadata}
				scenariosList={scenariosList}
				selectedScenario={selectedScenario}
				vod={vod}
			/>
		</div>
	);
}

export function AdminVodEditorPage({
	auditEntries: initialAudit = [],
	initialScenarios = [],
	initialVod = null,
	isCreate = false,
}: AdminVodEditorPageProps) {
	const navigate = useNavigate();
	const [activeTab, setActiveTab] = useState<TabKey>("scenarios");

	const {
		clearAlerts,
		error,
		handleCreateVod,
		handleDeleteVod,
		handleTogglePublish,
		handleUpdateVodMetadata,
		isSubmitting,
		setError,
		setIsSubmitting,
		setSuccess,
		success,
		vod,
	} = useVodMutations(initialVod);

	const {
		handleDeleteScenario,
		handleMoveScenario,
		handleSaveScenario,
		scenariosList,
		selectedScenario,
		setSelectedScenario,
	} = useScenarioMutations(initialScenarios, vod?.id, {
		clearAlerts,
		setError,
		setIsSubmitting,
		setSuccess,
	});

	const handleCancelScenarioEdit = useCallback(
		() => setSelectedScenario(null),
		[setSelectedScenario],
	);
	const handleAddScenarioClick = useCallback(
		() => setSelectedScenario(null),
		[setSelectedScenario],
	);
	const handleCancelCreateVod = useCallback(
		() => navigate({ to: "/admin/content" }),
		[navigate],
	);

	if (isCreate || !vod) {
		return (
			<VodCreateView
				error={error}
				isSubmitting={isSubmitting}
				onCancel={handleCancelCreateVod}
				onCreate={handleCreateVod}
			/>
		);
	}

	return (
		<VodEditorLayout
			activeTab={activeTab}
			auditEntries={initialAudit}
			error={error}
			isSubmitting={isSubmitting}
			onAddScenario={handleAddScenarioClick}
			onCancelEdit={handleCancelScenarioEdit}
			onDeleteScenario={handleDeleteScenario}
			onDeleteVod={handleDeleteVod}
			onMoveScenario={handleMoveScenario}
			onSaveScenario={handleSaveScenario}
			onSelectScenario={setSelectedScenario}
			onTabSelect={setActiveTab}
			onTogglePublish={handleTogglePublish}
			onUpdateMetadata={handleUpdateVodMetadata}
			scenariosList={scenariosList}
			selectedScenario={selectedScenario}
			success={success}
			vod={vod}
		/>
	);
}
