"use client";

import { useState, useMemo } from "react";
import {
  Users,
  Shield,
  PlusCircle,
  MinusCircle,
  RefreshCw,
  Search,
  AlertTriangle,
} from "lucide-react";
import { SafeUser } from "@/actions/permissionActions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  isPermissionEnabled,
  PermissionGroup,
  togglePermissionInArray,
} from "../utils/permissionUtils";

interface RrBatchUserEditorProps {
  selectedUsers: SafeUser[];
  availableGroups: PermissionGroup[];
  onApplyBatchAction: (
    action: "grant" | "revoke" | "replace",
    flags: number[],
  ) => void;
  isSaving: boolean;
}

type BatchActionType = "grant" | "revoke" | "replace";

export default function RrBatchUserEditor({
  selectedUsers,
  availableGroups,
  onApplyBatchAction,
  isSaving,
}: RrBatchUserEditorProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<BatchActionType>("grant");
  const [filterQuery, setFilterQuery] = useState("");
  const [selectedFlags, setSelectedFlags] = useState<number[]>([]); // Serialized bitfield words

  // Filter permission groups and items within groups
  const filteredGroups = useMemo(() => {
    if (!filterQuery) return availableGroups;

    return availableGroups
      .map((group) => {
        const matchingPermissions = group.permissions.filter(
          (p) =>
            p.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
            p.label.toLowerCase().includes(filterQuery.toLowerCase())
        );

        return {
          ...group,
          permissions: matchingPermissions,
        };
      })
      .filter((group) => group.permissions.length > 0);
  }, [availableGroups, filterQuery]);

  const handleToggleFlag = (flag: bigint) => {
    setSelectedFlags((prev) => togglePermissionInArray(prev, flag));
  };

  const handleResetFlags = () => {
    setSelectedFlags([]);
  };

  const handleApply = () => {
    onApplyBatchAction(activeTab, selectedFlags);
  };

  const getActionColorClass = () => {
    if (activeTab === "grant")
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    if (activeTab === "revoke")
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
    return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
  };

  const getActionButtonLabel = () => {
    if (isSaving) return "Processing...";
    const count = selectedUsers.length;
    if (activeTab === "grant") return `Grant Permissions to ${count} Users`;
    if (activeTab === "revoke") return `Revoke Permissions from ${count} Users`;
    return `Replace Permissions for ${count} Users`;
  };

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      {/* Batch header details */}
      <div className="p-4 border-b border-border bg-muted/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Users className="size-5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">
              Batch Editing ({selectedUsers.length} Users Selected)
            </h2>
            <div className="flex flex-wrap gap-1 mt-1 max-h-16 overflow-y-auto no-scrollbar">
              {selectedUsers.slice(0, 5).map((user) => (
                <div
                  key={user.id}
                  className="inline-flex items-center gap-1 bg-muted border border-border rounded px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground"
                >
                  <Avatar className="size-3.5 rounded-sm">
                    <AvatarImage src={user.avatarUrl || undefined} />
                    <AvatarFallback className="text-[7px] font-bold">
                      {user.username.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  @{user.username}
                </div>
              ))}
              {selectedUsers.length > 5 && (
                <div className="inline-flex items-center bg-muted border border-border rounded px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                  +{selectedUsers.length - 5} more
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetFlags}
            disabled={selectedFlags.length === 0 || isSaving}
            className="text-xs gap-1.5 h-8 px-3 rounded-lg border-border hover:bg-muted"
          >
            <RefreshCw className="size-3.5" />
            Clear Selection
          </Button>
          <Button
            variant={activeTab === "revoke" ? "destructive" : "default"}
            size="sm"
            onClick={handleApply}
            disabled={selectedFlags.length === 0 || isSaving}
            className={`text-xs gap-1.5 h-8 px-3 rounded-lg font-semibold shadow-sm`}
          >
            {activeTab === "grant" && <PlusCircle className="size-3.5" />}
            {activeTab === "revoke" && <MinusCircle className="size-3.5" />}
            {activeTab === "replace" && <RefreshCw className="size-3.5" />}
            {getActionButtonLabel()}
          </Button>
        </div>
      </div>

      {/* Tab Control */}
      <div className="px-4 py-2 border-b border-border bg-muted/20 flex gap-2">
        <button
          onClick={() => setActiveTab("grant")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
            activeTab === "grant"
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
              : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          Grant Flags
        </button>
        <button
          onClick={() => setActiveTab("revoke")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
            activeTab === "revoke"
              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
              : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          Revoke Flags
        </button>
        <button
          onClick={() => setActiveTab("replace")}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border ${
            activeTab === "replace"
              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
              : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          Replace / Set Flags
        </button>
      </div>

      {/* Filter and stats */}
      <div className="px-4 py-3 border-b border-border bg-muted/5 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2 size-3.5 text-muted-foreground/70" />
          <Input
            placeholder="Filter permission flags..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="pl-8 h-7.5 bg-background/50 border-border text-[11px] placeholder:text-muted-foreground/60 rounded-md focus-visible:ring-primary/20 focus-visible:ring-1"
          />
        </div>
        <div className="text-[10px] font-medium text-muted-foreground bg-muted/40 border border-border/50 px-2 py-0.5 rounded-full">
          Selected Flags: {selectedFlags.length > 0 ? "active" : "none"}
        </div>
      </div>

      {/* Scrollable list of permissions */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
        {activeTab === "replace" && (
          <div className="p-3 border border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400 rounded-lg flex items-start gap-2.5 text-[11px]">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold uppercase tracking-wider text-[10px]">
                Warning: Direct Replacement
              </p>
              <p className="opacity-95 mt-0.5">
                The "Replace" action will overwrite the entire permissions list
                of the {selectedUsers.length} selected users with exactly the
                flags you select below. Any of their current permissions not
                checked below will be deleted!
              </p>
            </div>
          </div>
        )}

        {filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <Shield className="size-8 opacity-30" />
            <span className="text-xs">
              No permissions found matching filters
            </span>
          </div>
        ) : (
          filteredGroups.map((group) => (
            <div key={group.name} className="space-y-3">
              <h3 className="text-xs font-bold text-foreground/80 tracking-wider uppercase pl-1 border-l-2 border-primary/50">
                {group.name}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {group.permissions.map((perm) => {
                  const isSelected = isPermissionEnabled(
                    selectedFlags,
                    perm.flag,
                  );

                  return (
                    <Card
                      key={perm.name}
                      onClick={() => handleToggleFlag(perm.flag)}
                      className={`cursor-pointer transition-all duration-150 border rounded-xl overflow-hidden hover:border-primary/40 hover:bg-muted/10 ${
                        isSelected
                          ? getActionColorClass()
                          : "border-border bg-card"
                      }`}
                    >
                      <CardContent className="p-3 flex items-start gap-3">
                        <div
                          className="mt-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleFlag(perm.flag)}
                            className="rounded"
                          />
                        </div>
                        <div className="select-none flex-1">
                          <p
                            className={`text-xs font-semibold ${isSelected ? "text-foreground" : "text-foreground/80"}`}
                          >
                            {perm.label}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
