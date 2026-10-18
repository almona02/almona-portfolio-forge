"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  PaginationState,
  RowSelectionState,
  TableOptions,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ChevronDown, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import type { CheckedState } from "@radix-ui/react-checkbox"

const EMPTY_SELECTION: RowSelectionState = {}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  onRowClick?: (row: TData) => void
  showPagination?: boolean
  showSelection?: boolean
  onSelectionChange?: (rows: TData[]) => void
  clearSelectionKey?: number | string
  getRowId?: TableOptions<TData>["getRowId"]
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Search...",
  onRowClick,
  showPagination = true,
  showSelection = false,
  onSelectionChange,
  clearSelectionKey,
  getRowId,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 })
  // A selection belongs to the exact records, filter and page the operator saw.
  // Invalidate during render so a new dataset can never inherit old checkboxes.
  const [selection, setSelection] = React.useState(() => ({
    data, filters: columnFilters, pageIndex: pagination.pageIndex, pageSize: pagination.pageSize,
    clearSelectionKey, enabled: showSelection, rows: EMPTY_SELECTION,
  }))
  const selectionIsCurrent = selection.data === data && selection.filters === columnFilters &&
    selection.pageIndex === pagination.pageIndex && selection.pageSize === pagination.pageSize &&
    selection.clearSelectionKey === clearSelectionKey && selection.enabled === showSelection
  const rowSelection = selectionIsCurrent ? selection.rows : EMPTY_SELECTION

  React.useEffect(() => {
    if (showSelection && !selectionIsCurrent) {
      setSelection({
        data, filters: columnFilters, pageIndex: pagination.pageIndex, pageSize: pagination.pageSize,
        clearSelectionKey, enabled: showSelection, rows: EMPTY_SELECTION,
      })
    }
  }, [selectionIsCurrent, data, columnFilters, pagination.pageIndex, pagination.pageSize, clearSelectionKey, showSelection])

  const resolveRowId = React.useCallback<NonNullable<TableOptions<TData>["getRowId"]>>((record, index) => {
    if (typeof record === "object" && record !== null && "id" in record &&
      (typeof record.id === "string" || typeof record.id === "number")) return String(record.id)
    return String(index)
  }, [])

  const selectionColumn = React.useMemo<ColumnDef<TData, unknown> | null>(() => {
    if (!showSelection) return null
    return {
      id: "select",
      header: ({ table }) => {
        const some = table.getIsSomePageRowsSelected()
        const all = table.getIsAllPageRowsSelected()
        const checked: CheckedState = all ? true : some ? 'indeterminate' : false
        return (
          <Checkbox
            checked={checked}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all rows on this page"
          />
        )
      },
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select row ${row.id}`}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 36,
    }
  }, [showSelection])

  const tableColumns = React.useMemo(() => (selectionColumn ? [selectionColumn, ...columns] : columns), [selectionColumn, columns])

  const table = useReactTable({
    data,
    columns: tableColumns,
    getRowId: getRowId ?? resolveRowId,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    onRowSelectionChange: updater => {
      setSelection(previous => {
        const current = previous.data === data && previous.filters === columnFilters &&
          previous.pageIndex === pagination.pageIndex && previous.pageSize === pagination.pageSize &&
          previous.clearSelectionKey === clearSelectionKey && previous.enabled === showSelection
          ? previous.rows : EMPTY_SELECTION
        return {
          data, filters: columnFilters, pageIndex: pagination.pageIndex, pageSize: pagination.pageSize,
          clearSelectionKey, enabled: showSelection,
          rows: typeof updater === "function" ? updater(current) : updater,
        }
      })
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
    },
  })

  React.useEffect(() => {
    if (!onSelectionChange) return
    const rows = showSelection ? table.getFilteredSelectedRowModel().rows.map((r) => r.original) : []
    onSelectionChange(rows)
  }, [rowSelection, data, columnFilters, pagination.pageIndex, pagination.pageSize, showSelection, onSelectionChange, table])

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        {searchKey && (
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn(searchKey)?.setFilterValue(event.target.value)
              }
              className="pl-8"
            />
          </div>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {showSelection && (
        <p role="status" className="pb-3 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} selected on this page.
        </p>
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={onRowClick ? "cursor-pointer" : ""}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {showPagination && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="flex-1 text-sm text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
