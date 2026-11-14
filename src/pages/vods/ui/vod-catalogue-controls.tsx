import { useId, useState, type SubmitEvent } from "react";

import { competitiveTiers } from "@/shared/db";
import { Button } from "@/shared/ui/shadcn/button";
import { Input } from "@/shared/ui/shadcn/input";
import { Label } from "@/shared/ui/shadcn/label";
import { ROLES } from "@/shared/vod";

import {
  DEFAULT_VOD_SORT,
  parseVodCatalogueSearch,
  VOD_SORT_OPTIONS,
  type VodCatalogueFilters,
} from "../model/vod-catalogue";

const SEARCH_PARAM_KEY = "q";

interface VodCatalogueControlsProps {
  filters: VodCatalogueFilters;
  maps: readonly string[];
  onFiltersChange: (nextFilters: VodCatalogueFilters) => void;
}

function VodCatalogueControls({ filters, maps, onFiltersChange }: VodCatalogueControlsProps) {
  const urlQuery = filters.q ?? "";
  const [query, setQuery] = useState(urlQuery);
  const [syncedUrlQuery, setSyncedUrlQuery] = useState(urlQuery);

  if (urlQuery !== syncedUrlQuery) {
    setSyncedUrlQuery(urlQuery);
    setQuery(urlQuery);
  }

  function updateFilter(field: keyof VodCatalogueFilters, value: string) {
    onFiltersChange(
      parseVodCatalogueSearch({
        ...filters,
        [SEARCH_PARAM_KEY]: query,
        [field]: value,
      }),
    );
  }

  function handleSearchSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    updateFilter(SEARCH_PARAM_KEY, query);
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-4">
      <VodSearchForm onQueryChange={setQuery} onSubmit={handleSearchSubmit} query={query} />
      <VodFilterSelectGrid filters={filters} maps={maps} onUpdateFilter={updateFilter} />
    </div>
  );
}

function VodSearchForm({
  onQueryChange,
  onSubmit,
  query,
}: {
  onQueryChange: (value: string) => void;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
  query: string;
}) {
  const inputId = useId();

  return (
    <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={onSubmit}>
      <div className="flex flex-1 flex-col gap-1.5">
        <Label htmlFor={inputId}>Search</Label>
        <Input
          id={inputId}
          name={SEARCH_PARAM_KEY}
          onChange={(event) => {
            onQueryChange(event.target.value);
          }}
          placeholder="Search title, hero, or map..."
          type="search"
          value={query}
        />
      </div>
      <Button type="submit" variant="secondary">
        Search
      </Button>
    </form>
  );
}

function VodFilterSelectGrid({
  filters,
  maps,
  onUpdateFilter,
}: {
  filters: VodCatalogueFilters;
  maps: readonly string[];
  onUpdateFilter: (field: keyof VodCatalogueFilters, value: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <VodSelectField
        allLabel="All roles"
        label="Role"
        onValueChange={(value) => {
          onUpdateFilter("role", value);
        }}
        options={ROLES}
        value={filters.role ?? ""}
      />
      <VodSelectField
        allLabel="All tiers"
        label="Competitive Tier"
        onValueChange={(value) => {
          onUpdateFilter("tier", value);
        }}
        options={competitiveTiers}
        value={filters.tier ?? ""}
      />
      <VodSelectField
        allLabel="All maps"
        label="Map"
        onValueChange={(value) => {
          onUpdateFilter("map", value);
        }}
        options={maps}
        value={filters.map ?? ""}
      />
      <VodSelectField
        label="Sort"
        onValueChange={(value) => {
          onUpdateFilter("sort", value);
        }}
        options={VOD_SORT_OPTIONS}
        value={filters.sort ?? DEFAULT_VOD_SORT}
      />
    </div>
  );
}

function VodSelectField({
  allLabel,
  label,
  onValueChange,
  options,
  value,
}: {
  allLabel?: string | undefined;
  label: string;
  onValueChange: (value: string) => void;
  options: readonly string[];
  value: string;
}) {
  const selectId = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={selectId}>{label}</Label>
      <select
        className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        id={selectId}
        onChange={(event) => {
          onValueChange(event.target.value);
        }}
        value={value}
      >
        {allLabel === undefined ? null : <option value="">{allLabel}</option>}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

export { VodCatalogueControls };
