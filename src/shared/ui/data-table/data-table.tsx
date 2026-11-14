import { useTable, type ColumnDef, type ReactTable, type RowData } from "@tanstack/react-table";
import { cn } from "cn";
import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";

import { Button } from "@/shared/ui/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/shared/ui/shadcn/dropdown-menu";
import { Input } from "@/shared/ui/shadcn/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/shadcn/table";

import { dataTableFeatures, type DataTableFeatures } from "./data-table-features";

interface DataTableProps<TData extends RowData> extends Omit<ComponentProps<"div">, "children"> {
  columns: ColumnDef<DataTableFeatures, TData>[];
  data: TData[];
  emptyMessage?: string;
  filterColumn?: string;
  filterPlaceholder?: string;
  getRowId?: (row: TData) => string;
}

interface DataTableSectionProps<TData extends RowData> {
  table: ReactTable<DataTableFeatures, TData>;
}

function DataTable<TData extends RowData>({
  className,
  columns,
  data,
  emptyMessage = "No results.",
  filterColumn,
  filterPlaceholder = "Filter...",
  getRowId,
  ...props
}: DataTableProps<TData>) {
  const table = useTable({
    columns,
    data,
    features: dataTableFeatures,
    ...(getRowId ? { getRowId } : {}),
  });
  const column = table.getAllColumns().find((item) => item.id === filterColumn);
  const filterValue = column?.getFilterValue();

  return (
    <div className={cn("flex flex-col gap-4", className)} {...props}>
      <div className="flex items-center gap-2">
        {column && (
          <Input
            aria-label={filterPlaceholder}
            className="max-w-sm"
            placeholder={filterPlaceholder}
            value={typeof filterValue === "string" ? filterValue : ""}
            onChange={(event) => {
              column.setFilterValue(event.target.value);
            }}
          />
        )}
        <DataTableColumns table={table} />
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <DataTableHeader table={table} />
          <DataTableBody table={table} emptyMessage={emptyMessage} />
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  );
}

function DataTableHeader<TData extends RowData>({ table }: DataTableSectionProps<TData>) {
  return (
    <TableHeader>
      {table.getHeaderGroups().map((group) => (
        <TableRow key={group.id}>
          {group.headers.map((header) => (
            <TableHead key={header.id}>
              {!header.isPlaceholder && <table.FlexRender header={header} />}
            </TableHead>
          ))}
        </TableRow>
      ))}
    </TableHeader>
  );
}

function DataTableBody<TData extends RowData>({
  table,
  emptyMessage,
}: DataTableSectionProps<TData> & { emptyMessage: string }) {
  const { rows } = table.getRowModel();

  return (
    <TableBody>
      {rows.length > 0 ? (
        rows.map((row) => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <TableCell key={cell.id}>
                <table.FlexRender cell={cell} />
              </TableCell>
            ))}
          </TableRow>
        ))
      ) : (
        <TableRow>
          <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-24 text-center">
            {emptyMessage}
          </TableCell>
        </TableRow>
      )}
    </TableBody>
  );
}

function DataTableColumns<TData extends RowData>({ table }: DataTableSectionProps<TData>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="ml-auto" render={columnsButton}>
        Columns
        <ChevronDown data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          {table
            .getAllColumns()
            .filter((column) => column.getCanHide())
            .map((column) => (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize"
                checked={column.getIsVisible()}
                onCheckedChange={(checked) => {
                  column.toggleVisibility(checked);
                }}
              >
                {typeof column.columnDef.header === "string" ? column.columnDef.header : column.id}
              </DropdownMenuCheckboxItem>
            ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DataTablePagination<TData extends RowData>({ table }: DataTableSectionProps<TData>) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          table.previousPage();
        }}
        disabled={!table.getCanPreviousPage()}
      >
        Previous
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          table.nextPage();
        }}
        disabled={!table.getCanNextPage()}
      >
        Next
      </Button>
    </div>
  );
}

const columnsButton = <Button variant="outline" />;

export { DataTable };
