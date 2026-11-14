import { createColumnHelper } from "@tanstack/react-table";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vite-plus/test";

import { Button } from "@/shared/ui/shadcn/button";

import { DataTable } from "../data-table";
import type { DataTableFeatures } from "../data-table-features";

interface TableRecord {
  id: string;
  title: string;
  description: string;
}

const columnHelper = createColumnHelper<DataTableFeatures, TableRecord>();
const columns = columnHelper.columns([
  columnHelper.accessor("title", {
    header: ({ column }) => (
      <Button
        onClick={() => {
          column.toggleSorting(column.getIsSorted() === "asc");
        }}
      >
        Title
      </Button>
    ),
  }),
  columnHelper.accessor("description", { header: "Description" }),
]);
const records: TableRecord[] = [
  { description: "Second description", id: "beta", title: "Beta" },
  { description: "First description", id: "alpha", title: "Alpha" },
];

describe("data table", () => {
  it("renders its empty state inside the table", () => {
    expect.assertions(1);

    // Arrange & Act
    render(<DataTable columns={columns} data={[]} />);

    // Assert
    expect(screen.getByRole("cell", { name: "No results." }).getAttribute("colspan")).toBe("2");
  });

  it("sorts rows in ascending order", async () => {
    expect.assertions(1);

    // Arrange
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={records} />);

    // Act
    await user.click(screen.getByRole("button", { name: "Title" }));
    const rows = screen.getAllByRole("row").slice(1);

    // Assert
    expect(rows.map((row) => row.textContent)).toStrictEqual([
      "AlphaFirst description",
      "BetaSecond description",
    ]);
  });

  it("sorts rows in descending order", async () => {
    expect.assertions(1);

    // Arrange
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={records} />);

    // Act
    await user.dblClick(screen.getByRole("button", { name: "Title" }));
    const rows = screen.getAllByRole("row").slice(1);

    // Assert
    expect(rows.map((row) => row.textContent)).toStrictEqual([
      "BetaSecond description",
      "AlphaFirst description",
    ]);
  });

  it("filters rows by the configured column", async () => {
    expect.assertions(1);

    // Arrange
    const user = userEvent.setup();
    render(
      <DataTable
        columns={columns}
        data={records}
        filterColumn="title"
        filterPlaceholder="Filter titles"
      />,
    );

    // Act
    await user.type(screen.getByRole("textbox", { name: "Filter titles" }), "alpha");
    const rows = screen.getAllByRole("row").slice(1);

    // Assert
    expect(rows.map((row) => row.textContent)).toStrictEqual(["AlphaFirst description"]);
  });

  it("shows the empty state when no rows match the filter", async () => {
    expect.assertions(1);

    // Arrange
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={records} filterColumn="title" />);

    // Act
    await user.type(screen.getByRole("textbox", { name: "Filter..." }), "missing");

    // Assert
    expect(screen.getByRole("cell", { name: "No results." })).toBeDefined();
  });

  it("hides a column through the columns menu", async () => {
    expect.assertions(2);

    // Arrange
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={records} />);

    // Act
    await user.click(screen.getByRole("button", { name: "Columns" }));
    await user.click(await screen.findByRole("menuitemcheckbox", { name: "Description" }));

    // Assert
    expect(screen.queryByRole("columnheader", { name: "Description" })).toBeNull();
    expect(screen.queryByText("First description")).toBeNull();
  });

  it("moves between pages", async () => {
    expect.assertions(2);

    // Arrange
    const user = userEvent.setup();
    const data = Array.from({ length: 12 }, (_value, index) => ({
      description: "",
      id: String(index),
      title: `Item ${index + 1}`,
    }));
    render(<DataTable columns={columns} data={data} />);

    // Act
    await user.click(screen.getByRole("button", { name: "Next" }));
    const nextPage = screen
      .getAllByRole("row")
      .slice(1)
      .map((row) => row.textContent);
    await user.click(screen.getByRole("button", { name: "Previous" }));
    const previousPage = screen.getAllByRole("row").slice(1);

    // Assert
    expect(nextPage).toStrictEqual(["Item 11", "Item 12"]);
    expect(previousPage).toHaveLength(10);
  });
});
