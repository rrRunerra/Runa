"use client";

import React, { useEffect, useState, useTransition } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Search,
  Eye,
  CornerUpLeft,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

import {
  getMonocerosDbSchema,
  getMonocerosDbRecords,
  createMonocerosDbRecord,
  updateMonocerosDbRecord,
  deleteMonocerosDbRecord,
  deleteManyMonocerosDbRecords,
} from "@/actions/monocerosDbActions";
import { FieldConfig } from "@/actions/databaseActions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface MonocerosDatabaseTableProps {
  db: string;
}

export default function MonocerosDatabaseTable({
  db,
}: MonocerosDatabaseTableProps) {
  const [schema, setSchema] = useState<FieldConfig[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isViewJsonOpen, setIsViewJsonOpen] = useState(false);

  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [selectedIds, setSelectedIds] = useState<unknown[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [jsonViewerContent, setJsonViewerContent] = useState<any>(null);

  const [isPending, startTransition] = useTransition();

  const pkField = schema.find((f) => f.isPk) || { name: "id", type: "string" };

  // Load schema and records
  const loadData = async () => {
    setIsLoading(true);
    setSelectedIds([]);
    try {
      const sch = await getMonocerosDbSchema(db);
      setSchema(sch);

      const { records: recs, total: tot } = await getMonocerosDbRecords(
        db,
        page,
        pageSize,
      );
      setRecords(recs);
      setFilteredRecords(recs);
      setTotal(tot);
    } catch (err: any) {
      toast.error(err.message || "Failed to load database details.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [db, page, pageSize]);

  // Handle local searching across all fields
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredRecords(records);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = records.filter((rec) => {
      return Object.values(rec).some((val) => {
        if (val === null || val === undefined) return false;
        if (typeof val === "object") {
          return JSON.stringify(val).toLowerCase().includes(query);
        }
        return String(val).toLowerCase().includes(query);
      });
    });
    setFilteredRecords(filtered);
  }, [searchQuery, records]);

  // Prepare form data for adding
  const handleOpenAdd = () => {
    const initialForm: Record<string, any> = {};
    schema.forEach((field) => {
      if (field.isAuto) return;
      if (field.type === "boolean") {
        initialForm[field.name] = false;
      } else if (field.type === "json") {
        initialForm[field.name] = "{}";
      } else {
        initialForm[field.name] = "";
      }
    });
    setFormData(initialForm);
    setIsAddOpen(true);
  };

  // Prepare form data for editing
  const handleOpenEdit = (record: any) => {
    setSelectedRecord(record);
    const editForm: Record<string, any> = {};
    schema.forEach((field) => {
      const value = record[field.name];
      if (field.type === "json") {
        editForm[field.name] = JSON.stringify(value || {}, null, 2);
      } else if (field.type === "datetime" && value) {
        // Format date to local datetime-local input string: YYYY-MM-DDTHH:mm
        const dateObj = new Date(value);
        const pad = (num: number) => String(num).padStart(2, "0");
        const formatted = `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}T${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`;
        editForm[field.name] = formatted;
      } else {
        editForm[field.name] = value ?? "";
      }
    });
    setFormData(editForm);
    setIsEditOpen(true);
  };

  // Submit adding
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate JSON fields
    for (const field of schema) {
      if (
        field.type === "json" &&
        typeof formData[field.name] === "string" &&
        formData[field.name]
      ) {
        try {
          JSON.parse(formData[field.name]);
        } catch {
          toast.error(`Invalid JSON in field: ${field.name}`);
          return;
        }
      }
    }

    startTransition(async () => {
      try {
        await createMonocerosDbRecord(db, formData);
        toast.success("Record created successfully!");
        setIsAddOpen(false);
        loadData();
      } catch (err: any) {
        toast.error(err.message || "Failed to create record.");
      }
    });
  };

  // Submit editing
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate JSON fields
    for (const field of schema) {
      if (
        field.type === "json" &&
        typeof formData[field.name] === "string" &&
        formData[field.name]
      ) {
        try {
          JSON.parse(formData[field.name]);
        } catch {
          toast.error(`Invalid JSON in field: ${field.name}`);
          return;
        }
      }
    }

    const recordId = selectedRecord[pkField.name];

    startTransition(async () => {
      try {
        await updateMonocerosDbRecord(db, recordId, formData);
        toast.success("Record updated successfully!");
        setIsEditOpen(false);
        loadData();
      } catch (err: any) {
        toast.error(err.message || "Failed to update record.");
      }
    });
  };

  // Submit deleting
  const handleDeleteSubmit = () => {
    if (!selectedRecord) return;
    const recordId = selectedRecord[pkField.name];

    startTransition(async () => {
      try {
        await deleteMonocerosDbRecord(db, recordId);
        toast.success("Record deleted successfully!");
        setIsDeleteOpen(false);
        loadData();
      } catch (err: any) {
        toast.error(err.message || "Failed to delete record.");
      }
    });
  };

  // Submit bulk deleting
  const handleBulkDeleteSubmit = () => {
    if (selectedIds.length === 0) return;

    startTransition(async () => {
      try {
        await deleteManyMonocerosDbRecords(db, selectedIds);
        toast.success(
          `Successfully deleted ${selectedIds.length} ${
            selectedIds.length === 1 ? "record" : "records"
          }!`
        );
        setSelectedIds([]);
        setIsBulkDeleteOpen(false);
        loadData();
      } catch (err: any) {
        toast.error(err.message || "Failed to delete records.");
      }
    });
  };

  const handleOpenDelete = (record: any) => {
    setSelectedRecord(record);
    setIsDeleteOpen(true);
  };

  const handleOpenJsonViewer = (content: any) => {
    setJsonViewerContent(content);
    setIsViewJsonOpen(true);
  };

  // Render cell helper
  const renderCellContent = (value: any, type: string) => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground/40 italic">null</span>;
    }

    if (type === "boolean") {
      return (
        <Badge
          variant={value ? "default" : "secondary"}
          className="text-[10px] font-semibold uppercase"
        >
          {String(value)}
        </Badge>
      );
    }

    if (type === "datetime") {
      return (
        <span className="font-mono text-xs">
          {new Date(value).toLocaleString()}
        </span>
      );
    }

    if (type === "json") {
      const stringified = JSON.stringify(value);
      const displayString =
        stringified.length > 25
          ? `${stringified.slice(0, 25)}...`
          : stringified;
      return (
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
          <span>{displayString}</span>
          <Button
            size="icon"
            variant="ghost"
            type="button"
            className="size-5 rounded-md text-muted-foreground hover:text-foreground"
            onClick={() => handleOpenJsonViewer(value)}
          >
            <Eye className="size-3" />
          </Button>
        </div>
      );
    }

    if (type === "enum") {
      return (
        <Badge
          variant="outline"
          className="text-[10px] border-indigo-500/30 text-indigo-400 bg-indigo-500/5 font-semibold"
        >
          {String(value)}
        </Badge>
      );
    }

    return (
      <span className="max-w-[200px] truncate block text-xs">
        {String(value)}
      </span>
    );
  };

  if (isLoading && schema.length === 0) {
    return (
      <div className="h-64 flex flex-col gap-3 items-center justify-center bg-card border border-border/50 rounded-2xl">
        <Loader2 className="size-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">
          Loading database schema...
        </p>
      </div>
    );
  }

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Back button and page title */}
      <div className="flex flex-col gap-3">
        <Link href="/monoceros/databases">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 h-8 text-muted-foreground hover:text-foreground"
          >
            <CornerUpLeft className="size-4" />
            Back to Databases
          </Button>
        </Link>
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {db}
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage records, fields, and indexes for table:{" "}
            <span className="font-semibold">{db}</span>
          </p>
        </div>
      </div>

      {/* Top action bar / Selection banner */}
      <div className="relative overflow-hidden flex flex-col sm:flex-row gap-4 items-center justify-between bg-card/40 border border-border/50 p-4 rounded-xl backdrop-blur-sm min-h-[66px]">
        {selectedIds.length > 0 ? (
          <div className="flex items-center justify-between w-full animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-foreground">
                <span className="font-semibold text-primary">{selectedIds.length}</span>{" "}
                {selectedIds.length === 1 ? "record" : "records"} selected
              </span>
              <Button
                variant="link"
                size="sm"
                className="h-8 px-2 text-muted-foreground hover:text-foreground text-xs"
                onClick={() => setSelectedIds([])}
              >
                Clear Selection
              </Button>
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="gap-2 shadow-md h-9 px-4 font-semibold"
              onClick={() => setIsBulkDeleteOpen(true)}
            >
              <Trash2 className="size-4" />
              Delete Selected
            </Button>
          </div>
        ) : (
          <>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search records..."
                className="pl-9 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <Button
              onClick={handleOpenAdd}
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg shadow-md hover:scale-[1.02] transition-all flex items-center justify-center gap-2 h-9 px-4 text-sm"
            >
              <Plus className="size-4" />
              Add Record
            </Button>
          </>
        )}
      </div>

      {/* Main Table view */}
      <div className="bg-card border border-border/50 rounded-2xl shadow-xl overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center z-20">
            <Loader2 className="size-8 text-primary animate-spin" />
          </div>
        )}

        <div className="overflow-x-scroll min-h-[300px]">
          <Table>
            <TableHeader className="bg-muted/30 border-b border-border/50">
              <TableRow>
                <TableHead className="w-[48px] py-3.5 px-4">
                  <Checkbox
                    checked={
                      filteredRecords.length > 0 &&
                      (filteredRecords.every((rec) => selectedIds.includes(rec[pkField.name]))
                        ? true
                        : filteredRecords.some((rec) => selectedIds.includes(rec[pkField.name]))
                        ? "indeterminate"
                        : false)
                    }
                    onCheckedChange={(checked) => {
                      if (checked) {
                        const newIds = [...selectedIds];
                        filteredRecords.forEach((rec) => {
                          const id = rec[pkField.name];
                          if (!newIds.includes(id)) {
                            newIds.push(id);
                          }
                        });
                        setSelectedIds(newIds);
                      } else {
                        const filteredIds = filteredRecords.map((rec) => rec[pkField.name]);
                        setSelectedIds(selectedIds.filter((id) => !filteredIds.includes(id)));
                      }
                    }}
                    aria-label="Select all"
                  />
                </TableHead>
                {schema.map((field) => (
                  <TableHead
                    key={field.name}
                    className="py-3.5 px-4 font-bold text-foreground"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span>{field.name}</span>
                      <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wider">
                        {field.type}
                        {field.isPk && " • PK"}
                      </span>
                    </div>
                  </TableHead>
                ))}
                <TableHead className="w-[100px] text-right py-3.5 px-4 font-bold text-foreground">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.length > 0 ? (
                filteredRecords.map((record, idx) => {
                  const isRowSelected = selectedIds.includes(record[pkField.name]);
                  return (
                    <TableRow
                      key={record[pkField.name] || idx}
                      className={`hover:bg-muted/10 transition-colors ${
                        isRowSelected ? "bg-primary/[0.04] hover:bg-primary/[0.06]" : ""
                      }`}
                    >
                      <TableCell className="py-3 px-4">
                        <Checkbox
                          checked={isRowSelected}
                          onCheckedChange={(checked) => {
                            const id = record[pkField.name];
                            if (checked) {
                              setSelectedIds([...selectedIds, id]);
                            } else {
                              setSelectedIds(selectedIds.filter((item) => item !== id));
                            }
                          }}
                          aria-label={`Select row ${record[pkField.name]}`}
                        />
                      </TableCell>
                      {schema.map((field) => (
                        <TableCell
                          key={field.name}
                          className="py-3 px-4 font-mono"
                        >
                          {renderCellContent(record[field.name], field.type)}
                        </TableCell>
                      ))}
                      <TableCell className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            onClick={() => handleOpenEdit(record)}
                          >
                            <Edit2 className="size-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-500/5"
                            onClick={() => handleOpenDelete(record)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={schema.length + 2}
                    className="h-48 text-center text-muted-foreground"
                  >
                    No records found in this table.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination bar */}
        <div className="flex items-center justify-between border-t border-border/50 px-6 py-4 bg-muted/20">
          <span className="text-xs text-muted-foreground font-medium">
            Showing{" "}
            <span className="font-semibold text-foreground">
              {filteredRecords.length}
            </span>{" "}
            of <span className="font-semibold text-foreground">{total}</span>{" "}
            records
          </span>

          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">
              Page <span className="font-semibold text-foreground">{page}</span>{" "}
              of{" "}
              <span className="font-semibold text-foreground">
                {totalPages}
              </span>
            </span>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg px-3 h-8 text-xs font-semibold gap-1.5"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ArrowLeft className="size-3.5" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg px-3 h-8 text-xs font-semibold gap-1.5"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
                <ArrowRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-[60vw] w-[60vw] bg-card border border-border shadow-2xl rounded-2xl overflow-y-auto max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Add New Record</DialogTitle>
            <DialogDescription>
              Create a new record in the model{" "}
              <span className="font-semibold">{db}</span>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="space-y-4 py-4">
            {schema.map((field) => {
              if (field.isAuto) return null;

              return (
                <div key={field.name} className="space-y-1.5">
                  <div className="flex justify-between items-baseline">
                    <Label
                      htmlFor={`add-${field.name}`}
                      className="font-semibold"
                    >
                      {field.name}
                    </Label>
                    <span className="text-[10px] text-muted-foreground uppercase">
                      {field.type}
                      {field.isNullable && " • Optional"}
                    </span>
                  </div>

                  {field.type === "boolean" ? (
                    <div className="flex items-center h-9">
                      <Switch
                        checked={formData[field.name] || false}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, [field.name]: checked })
                        }
                      />
                    </div>
                  ) : field.type === "json" ? (
                    <Textarea
                      id={`add-${field.name}`}
                      rows={3}
                      className="font-mono text-xs"
                      placeholder='{ "key": "value" }'
                      value={formData[field.name] || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          [field.name]: e.target.value,
                        })
                      }
                      required={!field.isNullable}
                    />
                  ) : field.type === "enum" ? (
                    <select
                      id={`add-${field.name}`}
                      className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      value={formData[field.name] || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          [field.name]: e.target.value,
                        })
                      }
                      required={!field.isNullable}
                    >
                      <option value="">Select option...</option>
                      {field.enumValues?.map((val) => (
                        <option key={val} value={val}>
                          {val}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "datetime" ? (
                    <Input
                      id={`add-${field.name}`}
                      type="datetime-local"
                      className="h-9 px-3"
                      value={formData[field.name] || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          [field.name]: e.target.value,
                        })
                      }
                      required={!field.isNullable}
                    />
                  ) : (
                    <Input
                      id={`add-${field.name}`}
                      type="text"
                      className="h-9 px-3"
                      value={formData[field.name] || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          [field.name]: e.target.value,
                        })
                      }
                      required={!field.isNullable}
                    />
                  )}
                </div>
              );
            })}

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && (
                  <Loader2 className="size-4 animate-spin mr-1.5" />
                )}
                Add Record
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Record Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-[60vw] w-[60vw] bg-card border border-border shadow-2xl rounded-2xl overflow-y-auto max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Edit Record</DialogTitle>
            <DialogDescription>
              Update record values for{" "}
              <span className="font-semibold">{db}</span>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 py-4">
            {schema.map((field) => {
              if (field.isPk || field.isAuto) return null;

              return (
                <div key={field.name} className="space-y-1.5">
                  <div className="flex justify-between items-baseline">
                    <Label
                      htmlFor={`edit-${field.name}`}
                      className="font-semibold"
                    >
                      {field.name}
                    </Label>
                    <span className="text-[10px] text-muted-foreground uppercase">
                      {field.type}
                      {field.isNullable && " • Optional"}
                    </span>
                  </div>

                  {field.type === "boolean" ? (
                    <div className="flex items-center h-9">
                      <Switch
                        checked={formData[field.name] || false}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, [field.name]: checked })
                        }
                      />
                    </div>
                  ) : field.type === "json" ? (
                    <Textarea
                      id={`edit-${field.name}`}
                      rows={4}
                      className="font-mono text-xs"
                      value={formData[field.name] || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          [field.name]: e.target.value,
                        })
                      }
                      required={!field.isNullable}
                    />
                  ) : field.type === "enum" ? (
                    <select
                      id={`edit-${field.name}`}
                      className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      value={formData[field.name] || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          [field.name]: e.target.value,
                        })
                      }
                      required={!field.isNullable}
                    >
                      <option value="">Select option...</option>
                      {field.enumValues?.map((val) => (
                        <option key={val} value={val}>
                          {val}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "datetime" ? (
                    <Input
                      id={`edit-${field.name}`}
                      type="datetime-local"
                      className="h-9 px-3"
                      value={formData[field.name] || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          [field.name]: e.target.value,
                        })
                      }
                      required={!field.isNullable}
                    />
                  ) : (
                    <Input
                      id={`edit-${field.name}`}
                      type="text"
                      className="h-9 px-3"
                      value={formData[field.name] || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          [field.name]: e.target.value,
                        })
                      }
                      required={!field.isNullable}
                    />
                  )}
                </div>
              );
            })}

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && (
                  <Loader2 className="size-4 animate-spin mr-1.5" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Record Confirmation Modal */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md bg-card border border-border shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-red-500">Delete Record?</DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to delete this record? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSubmit}
              disabled={isPending}
            >
              {isPending && <Loader2 className="size-4 animate-spin mr-1.5" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Records Confirmation Modal */}
      <Dialog open={isBulkDeleteOpen} onOpenChange={setIsBulkDeleteOpen}>
        <DialogContent className="max-w-md bg-card border border-border shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-red-500">Delete Selected Records?</DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to delete <span className="font-semibold text-foreground">{selectedIds.length}</span> selected {selectedIds.length === 1 ? "record" : "records"}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsBulkDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDeleteSubmit}
              disabled={isPending}
            >
              {isPending && <Loader2 className="size-4 animate-spin mr-1.5" />}
              Delete Selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* JSON Value Viewer Modal */}
      <Dialog open={isViewJsonOpen} onOpenChange={setIsViewJsonOpen}>
        <DialogContent className="max-w-xl bg-card border border-border shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle>JSON Content</DialogTitle>
            <DialogDescription>
              Pretty-printed JSON value stored in field.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <pre className="bg-zinc-950 p-4 rounded-xl text-xs font-mono text-zinc-300 overflow-x-auto whitespace-pre-wrap max-h-[350px]">
              {JSON.stringify(jsonViewerContent, null, 2)}
            </pre>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewJsonOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
