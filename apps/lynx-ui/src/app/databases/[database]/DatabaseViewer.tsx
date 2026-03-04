"use client";

import { useEffect, useState, useRef } from "react";
import {
  getDatabaseRows,
  deleteDatabaseRow,
  updateDatabaseRow,
} from "@/actions/database";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Label,
  Textarea,
  useAlert,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  cn,
} from "@runa/ui";
import { Loader2, Database, Trash2, Edit, MoreHorizontal } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dialog";

interface DatabaseViewerProps {
  modelName: string;
}

export function DatabaseViewer({ modelName }: DatabaseViewerProps) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const observerTarget = useRef<HTMLDivElement>(null);
  const { showAlert } = useAlert();

  // Edit State
  const [editingRow, setEditingRow] = useState<Record<string, unknown> | null>(
    null,
  );
  const [editFormData, setEditFormData] = useState<Record<string, unknown>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Helper to identify primary key
  const getPrimaryKey = (row: Record<string, unknown>) => {
    if ("id" in row) return "id";
    if ("guildId" in row) return "guildId";
    if ("keyHash" in row) return "keyHash";
    // Fallback to first key if nothing else matches (risky but better than nothing)
    return Object.keys(row)[0];
  };

  const fetchRows = async (pageNum: number, reset = false) => {
    if (loading) return;
    setLoading(true);
    setError(null);

    const result = await getDatabaseRows(modelName, pageNum);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setRows((prev) =>
      reset || pageNum === 1 ? result.data : [...prev, ...result.data],
    );
    setHasMore(result.hasMore ?? false);
    setLoading(false);
  };

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchRows(1, true);
    });
  }, [modelName]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage((prev) => {
            const nextPage = prev + 1;
            fetchRows(nextPage);
            return nextPage;
          });
        }
      },
      { threshold: 1.0 },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, loading]);

  const handleDelete = async (row: Record<string, unknown>) => {
    if (!confirm("Are you sure you want to delete this row?")) return;

    const keyField = getPrimaryKey(row);
    const value = row[keyField];

    const result = await deleteDatabaseRow(modelName, keyField, value);

    if (result.error) {
      showAlert({
        type: "error",
        title: "Delete Failed",
        message: result.error,
      });
    } else {
      showAlert({
        type: "info",
        title: "Success",
        message: "Row deleted successfully",
      });
      // Remove from local state
      setRows((prev) => prev.filter((r) => r[keyField] !== value));
    }
  };

  const handleEditClick = (row: Record<string, unknown>) => {
    setEditingRow(row);
    setEditFormData({ ...row });
  };

  const handleEditChange = (key: string, value: string) => {
    setEditFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    const keyField = getPrimaryKey(editingRow!);
    const idValue = editingRow![keyField];

    // Process data: coerce types to match original row types
    const processedData: Record<string, unknown> = {};
    const errors: string[] = [];

    Object.keys(editingRow!).forEach((key) => {
      const originalValue = editingRow![key];
      const newValue = editFormData[key];
      const originalType = typeof originalValue;

      // Skip null/undefined original values - just pass through the new value
      if (originalValue === null || originalValue === undefined) {
        processedData[key] = newValue;
        return;
      }

      // Handle object/JSON fields
      if (originalType === "object") {
        if (typeof newValue === "string") {
          try {
            processedData[key] = JSON.parse(newValue);
          } catch (e) {
            errors.push(`${key}: Invalid JSON format`);
            processedData[key] = newValue;
          }
        } else {
          processedData[key] = newValue;
        }
        return;
      }

      // Handle number fields
      if (originalType === "number") {
        const parsed = Number(newValue);
        if (isNaN(parsed)) {
          errors.push(`${key}: Expected a number`);
          processedData[key] = newValue;
        } else {
          processedData[key] = parsed;
        }
        return;
      }

      // Handle boolean fields
      if (originalType === "boolean") {
        if (newValue === "true" || newValue === true) {
          processedData[key] = true;
        } else if (newValue === "false" || newValue === false) {
          processedData[key] = false;
        } else {
          errors.push(`${key}: Expected true or false`);
          processedData[key] = newValue;
        }
        return;
      }

      // Default: keep as string
      processedData[key] = newValue;
    });

    if (errors.length > 0) {
      showAlert({
        type: "error",
        title: "Validation Error",
        message: errors.join(", "),
      });
      setIsSaving(false);
      return;
    }

    const result = await updateDatabaseRow(
      modelName,
      keyField,
      idValue,
      processedData,
    );

    if (result.error) {
      showAlert({
        type: "error",
        title: "Update Failed",
        message: result.error,
      });
    } else {
      showAlert({
        type: "info",
        title: "Success",
        message: "Row updated successfully",
      });
      setRows((prev) =>
        prev.map((r) => (r[keyField] === idValue ? { ...processedData } : r)),
      );
      setEditingRow(null);
    }
    setIsSaving(false);
  };

  if (error) {
    return <div className="text-destructive p-4">Error: {error}</div>;
  }

  if (rows.length === 0 && !loading) {
    return (
      <div className="text-muted-foreground p-4">
        No data found in {modelName}
      </div>
    );
  }

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-muted-foreground" />
            {modelName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left border-collapse">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  {Object.keys(rows[0] || {}).map((key) => (
                    <th
                      key={key}
                      className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                    >
                      {key}
                    </th>
                  ))}
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {rows.map((row, i) => (
                  <tr
                    key={i}
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    {Object.values(row).map((val, j) => (
                      <td
                        key={j}
                        className="px-6 py-4 whitespace-nowrap text-sm text-foreground/80"
                      >
                        {val === null
                          ? "null"
                          : typeof val === "object"
                            ? JSON.stringify(val)
                            : String(val)}
                      </td>
                    ))}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent hover:border-white/5 rounded-full transition-all"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-32">
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault();
                              handleEditClick(row);
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => handleDelete(row)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {loading && (
            <div className="flex justify-center p-4">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          <div ref={observerTarget} className="h-4" />
        </CardContent>
      </Card>

      <Dialog
        open={!!editingRow}
        onOpenChange={(open) => !open && setEditingRow(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-zinc-950/90 border border-white/5 shadow-2xl backdrop-blur-2xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-semibold tracking-tight">
              Edit Row
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-6 py-2">
            {editingRow &&
              Object.keys(editingRow).map((key) => {
                const isPrimaryKey = key === getPrimaryKey(editingRow);
                const originalValue = editingRow[key];
                const isObject =
                  originalValue !== null && typeof originalValue === "object";
                const value = editFormData[key];

                const displayValue =
                  value === null || value === undefined
                    ? ""
                    : typeof value === "object"
                      ? JSON.stringify(value, null, 2)
                      : String(value);

                const useTextarea =
                  isObject ||
                  (typeof originalValue === "string" &&
                    originalValue.length > 50);

                return (
                  <div key={key} className="flex flex-col gap-2.5">
                    <Label
                      htmlFor={key}
                      className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 ml-1"
                    >
                      {key}{" "}
                      {isPrimaryKey && (
                        <span className="text-[10px] lowercase font-normal opacity-50 ml-1">
                          (Primary Key)
                        </span>
                      )}
                    </Label>
                    {useTextarea ? (
                      <Textarea
                        id={key}
                        value={displayValue}
                        onChange={(e) => handleEditChange(key, e.target.value)}
                        disabled={isPrimaryKey}
                        className={cn(
                          "min-h-[120px] bg-zinc-900/50 border-white/5 focus:border-white/10 ring-0 focus-visible:ring-1 focus-visible:ring-white/10 transition-all resize-none font-mono text-sm leading-relaxed p-4 rounded-xl",
                          isPrimaryKey &&
                            "opacity-40 cursor-not-allowed bg-zinc-950",
                        )}
                      />
                    ) : (
                      <Input
                        id={key}
                        value={displayValue}
                        onChange={(e) => handleEditChange(key, e.target.value)}
                        disabled={isPrimaryKey}
                        className={cn(
                          "bg-zinc-900/50 border-white/5 h-12 px-4 focus:border-white/10 ring-0 focus-visible:ring-1 focus-visible:ring-white/10 transition-all font-sans rounded-xl",
                          isPrimaryKey &&
                            "opacity-40 cursor-not-allowed bg-zinc-950",
                        )}
                      />
                    )}
                  </div>
                );
              })}
          </div>

          <DialogFooter className="mt-8 gap-3 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setEditingRow(null)}
              disabled={isSaving}
              className="hover:bg-white/5 text-muted-foreground hover:text-white transition-colors"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={isSaving}
              className="bg-white text-zinc-950 hover:bg-zinc-200 font-medium transition-all shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_0_25px_-5px_rgba(255,255,255,0.4)]"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
