"use client";

import React, { useEffect, useState, useTransition } from "react";
import { Plus, Edit2, Trash2, ArrowLeft, ArrowRight, Loader2, Search, Eye } from "lucide-react";
import { toast } from "sonner";

import {
  getDatabaseSchema,
  getDatabaseRecords,
  createDatabaseRecord,
  updateDatabaseRecord,
  deleteDatabaseRecord,
  FieldConfig,
} from "@/actions/databaseActions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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

interface DatabaseTableProps {
  database: string;
}

export default function DatabaseTable({ database }: DatabaseTableProps) {
  const [schema, setSchema] = useState<FieldConfig[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isViewJsonOpen, setIsViewJsonOpen] = useState(false);

  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [jsonViewerContent, setJsonViewerContent] = useState<any>(null);

  const [isPending, startTransition] = useTransition();

  const pkField = schema.find((f) => f.isPk) || { name: "id", type: "string" };

  // Load schema and records
  const loadData = async () => {
    setIsLoading(true);
    try {
      const sch = await getDatabaseSchema(database);
      setSchema(sch);
      
      const { records: recs, total: tot } = await getDatabaseRecords(database, page, pageSize);
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
  }, [database, page, pageSize]);

  // Handle local searching across all string/number columns
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
      if (field.type === "json" && typeof formData[field.name] === "string") {
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
        await createDatabaseRecord(database, formData);
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
      if (field.type === "json" && typeof formData[field.name] === "string") {
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
        await updateDatabaseRecord(database, recordId, formData);
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
        await deleteDatabaseRecord(database, recordId);
        toast.success("Record deleted successfully!");
        setIsDeleteOpen(false);
        loadData();
      } catch (err: any) {
        toast.error(err.message || "Failed to delete record.");
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

  // Render safe content value for table row
  const renderCellContent = (value: any, type: string) => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground/40 italic">null</span>;
    }

    if (type === "boolean") {
      return (
        <Badge variant={value ? "default" : "secondary"} className="text-[10px] font-semibold uppercase">
          {String(value)}
        </Badge>
      );
    }

    if (type === "datetime") {
      return <span className="font-mono text-xs">{new Date(value).toLocaleString()}</span>;
    }

    if (type === "json") {
      const stringified = JSON.stringify(value);
      const displayString = stringified.length > 25 ? `${stringified.slice(0, 25)}...` : stringified;
      return (
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
          <span>{displayString}</span>
          <Button
            size="icon"
            variant="ghost"
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
        <Badge variant="outline" className="text-[10px] border-indigo-500/30 text-indigo-400 bg-indigo-500/5 font-semibold">
          {String(value)}
        </Badge>
      );
    }

    return <span className="max-w-[200px] truncate block text-xs">{String(value)}</span>;
  };

  if (isLoading && schema.length === 0) {
    return (
      <div className="h-64 flex flex-col gap-3 items-center justify-center bg-card border border-border/50 rounded-2xl">
        <Loader2 className="size-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Loading database schema...</p>
      </div>
    );
  }

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card/40 border border-border/50 p-4 rounded-xl backdrop-blur-sm">
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
      </div>

      {/* Main Table view */}
      <div className="bg-card border border-border/50 rounded-2xl shadow-xl overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center z-20">
            <Loader2 className="size-8 text-primary animate-spin" />
          </div>
        )}

        <div className="overflow-x-auto min-h-[300px]">
          <Table>
            <TableHeader className="bg-muted/30 border-b border-border/50">
              <TableRow>
                {schema.map((field) => (
                  <TableHead key={field.name} className="py-3.5 px-4 font-bold text-foreground">
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
                filteredRecords.map((record, idx) => (
                  <TableRow key={record[pkField.name] || idx} className="hover:bg-muted/10 transition-colors">
                    {schema.map((field) => (
                      <TableCell key={field.name} className="py-3 px-4 font-mono">
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
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={schema.length + 1} className="h-48 text-center text-muted-foreground">
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
            Showing <span className="font-semibold text-foreground">{filteredRecords.length}</span> of{" "}
            <span className="font-semibold text-foreground">{total}</span> records
          </span>

          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">
              Page <span className="font-semibold text-foreground">{page}</span> of{" "}
              <span className="font-semibold text-foreground">{totalPages}</span>
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

      {/* Add Record Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-xl bg-card border border-border shadow-2xl rounded-2xl overflow-y-auto max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Add New Record</DialogTitle>
            <DialogDescription>
              Create a new record in the model <span className="font-semibold">{database}</span>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="space-y-4 py-4">
            {schema.map((field) => {
              if (field.isAuto) return null;

              return (
                <div key={field.name} className="space-y-1.5">
                  <div className="flex justify-between items-baseline">
                    <Label htmlFor={`add-${field.name}`} className="font-semibold">
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
                        setFormData({ ...formData, [field.name]: e.target.value })
                      }
                      required={!field.isNullable}
                    />
                  ) : field.type === "enum" ? (
                    <select
                      id={`add-${field.name}`}
                      className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      value={formData[field.name] || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, [field.name]: e.target.value })
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
                        setFormData({ ...formData, [field.name]: e.target.value })
                      }
                      required={!field.isNullable}
                    />
                  ) : (
                    <Input
                      id={`add-${field.name}`}
                      type={field.type === "number" ? "number" : "text"}
                      className="h-9 px-3"
                      value={formData[field.name] || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, [field.name]: e.target.value })
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
                variant="ghost"
                onClick={() => setIsAddOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  "Create Record"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Record Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-xl bg-card border border-border shadow-2xl rounded-2xl overflow-y-auto max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Edit Record</DialogTitle>
            <DialogDescription>
              Modify values for record{" "}
              <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">
                {selectedRecord ? selectedRecord[pkField.name] : ""}
              </span>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4 py-4">
            {schema.map((field) => {
              if (field.isPk || field.isAuto) return null;

              return (
                <div key={field.name} className="space-y-1.5">
                  <div className="flex justify-between items-baseline">
                    <Label htmlFor={`edit-${field.name}`} className="font-semibold">
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
                        setFormData({ ...formData, [field.name]: e.target.value })
                      }
                      required={!field.isNullable}
                    />
                  ) : field.type === "enum" ? (
                    <select
                      id={`edit-${field.name}`}
                      className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-xs transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                      value={formData[field.name] || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, [field.name]: e.target.value })
                      }
                      required={!field.isNullable}
                    >
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
                        setFormData({ ...formData, [field.name]: e.target.value })
                      }
                      required={!field.isNullable}
                    />
                  ) : (
                    <Input
                      id={`edit-${field.name}`}
                      type={field.type === "number" ? "number" : "text"}
                      className="h-9 px-3"
                      value={formData[field.name] || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, [field.name]: e.target.value })
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
                variant="ghost"
                onClick={() => setIsEditOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Record Confirmation Modal */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md bg-card border border-border shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete Record</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete record{" "}
              <span className="font-mono bg-red-500/5 text-red-500 border border-red-500/20 px-1.5 py-0.5 rounded font-bold">
                {selectedRecord ? selectedRecord[pkField.name] : ""}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4 gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsDeleteOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSubmit}
              disabled={isPending}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold rounded-lg shadow"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete Record"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* JSON Viewer Dialog */}
      <Dialog open={isViewJsonOpen} onOpenChange={setIsViewJsonOpen}>
        <DialogContent className="max-w-xl bg-card border border-border shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle>JSON Inspector</DialogTitle>
            <DialogDescription>Full document detail structure</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <pre className="p-4 rounded-xl bg-muted/60 border border-border/50 text-[11px] font-mono overflow-auto max-h-[50vh] text-foreground leading-relaxed whitespace-pre-wrap select-text">
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
