"use client";

import { useCallback } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import type {
	ContentHeroRoleFilter,
	ContentPublicationStatus,
} from "../model/search-params";

export interface AdminContentFiltersProps {
	onRoleChange: (role: ContentHeroRoleFilter) => void;
	onSearchChange: (search: string) => void;
	onStatusChange: (status: ContentPublicationStatus) => void;
	roleFilter: ContentHeroRoleFilter;
	searchQuery: string;
	statusFilter: ContentPublicationStatus;
}

export function AdminContentFilters({
	onRoleChange,
	onSearchChange,
	onStatusChange,
	roleFilter,
	searchQuery,
	statusFilter,
}: AdminContentFiltersProps) {
	const handleSearchInput = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			onSearchChange(e.target.value);
		},
		[onSearchChange],
	);

	const handleStatusAll = useCallback(
		() => onStatusChange("ALL"),
		[onStatusChange],
	);
	const handleStatusPublished = useCallback(
		() => onStatusChange("PUBLISHED"),
		[onStatusChange],
	);
	const handleStatusDraft = useCallback(
		() => onStatusChange("DRAFT"),
		[onStatusChange],
	);

	const handleRoleAll = useCallback(() => onRoleChange("ALL"), [onRoleChange]);
	const handleRoleTank = useCallback(
		() => onRoleChange("TANK"),
		[onRoleChange],
	);
	const handleRoleDamage = useCallback(
		() => onRoleChange("DAMAGE"),
		[onRoleChange],
	);
	const handleRoleSupport = useCallback(
		() => onRoleChange("SUPPORT"),
		[onRoleChange],
	);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div className="w-full md:max-w-xs">
					<Input
						onChange={handleSearchInput}
						placeholder="Search title, hero, or map…"
						value={searchQuery}
					/>
				</div>

				<div className="flex flex-wrap items-center gap-3">
					{/* Status filters */}
					<div className="flex items-center gap-1">
						<Button
							aria-label="All Status"
							onClick={handleStatusAll}
							size="sm"
							variant={statusFilter === "ALL" ? "default" : "outline"}
						>
							All Status
						</Button>
						<Button
							aria-label="Published"
							onClick={handleStatusPublished}
							size="sm"
							variant={statusFilter === "PUBLISHED" ? "default" : "outline"}
						>
							Published
						</Button>
						<Button
							aria-label="Draft"
							onClick={handleStatusDraft}
							size="sm"
							variant={statusFilter === "DRAFT" ? "default" : "outline"}
						>
							Draft
						</Button>
					</div>

					<div className="h-5 w-px bg-border hidden md:block" />

					{/* Role filters */}
					<div className="flex items-center gap-1">
						<Button
							aria-label="All Roles"
							onClick={handleRoleAll}
							size="sm"
							variant={roleFilter === "ALL" ? "default" : "outline"}
						>
							All Roles
						</Button>
						<Button
							aria-label="Tank"
							onClick={handleRoleTank}
							size="sm"
							variant={roleFilter === "TANK" ? "default" : "outline"}
						>
							Tank
						</Button>
						<Button
							aria-label="Damage"
							onClick={handleRoleDamage}
							size="sm"
							variant={roleFilter === "DAMAGE" ? "default" : "outline"}
						>
							Damage
						</Button>
						<Button
							aria-label="Support"
							onClick={handleRoleSupport}
							size="sm"
							variant={roleFilter === "SUPPORT" ? "default" : "outline"}
						>
							Support
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
