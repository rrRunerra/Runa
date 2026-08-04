"use client";

import { useState, useMemo } from "react";
import { Shield, RefreshCw, Save, Search, AlertCircle, HardDrive } from "lucide-react";
import { SafeUser } from "@/actions/permissionActions";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  PermissionGroup,
  isPermissionEnabled,
  getLegacyOrUnknownPermissions,
} from "../utils/permissionUtils";

interface RrSingleUserEditorProps {
  user: SafeUser;
  availableGroups: PermissionGroup[];
  editedPermissions: number[];
  onTogglePermission: (flag: bigint) => void;
  onSave: () => void;
  onReset: () => void;
  isSaving: boolean;
  hasChanges: boolean;
  editedMaxStorage: number;
  setEditedMaxStorage: (val: number) => void;
}


export default function RrSingleUserEditor({
  user,
  availableGroups,
  editedPermissions,
  onTogglePermission,
  onSave,
  onReset,
  isSaving,
  hasChanges,
  editedMaxStorage,
  setEditedMaxStorage,
}: RrSingleUserEditorProps): React.JSX.Element {

  const [filterQuery, setFilterQuery] = useState("");

  // Filter and compute legacy/unknown permissions
  const legacyPermissions = useMemo(() => {
    const allLegacy = getLegacyOrUnknownPermissions(user.permissions);
    if (!filterQuery) return allLegacy;
    return allLegacy.filter(
      (perm) =>
        `bit ${perm.bitIndex}`.includes(filterQuery.toLowerCase()) ||
        perm.flag.toString(16).includes(filterQuery.toLowerCase())
    );
  }, [user.permissions, filterQuery]);

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

  const activePermissionsCount = useMemo(() => {
    let count = 0;
    for (const group of availableGroups) {
      for (const perm of group.permissions) {
        if (isPermissionEnabled(editedPermissions, perm.flag)) {
          count++;
        }
      }
    }
    return count;
  }, [availableGroups, editedPermissions]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const userStorageLimitMb = Math.round(editedMaxStorage / (1024 * 1024));

  const handleStorageLimitChange = (val: string) => {
    const mb = parseInt(val, 10);
    if (!isNaN(mb) && mb >= 1) {
      setEditedMaxStorage(mb * 1024 * 1024);
    }
  };


  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      {/* User profile card */}
      <div className="p-4 border-b border-border bg-muted/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-12 rounded-xl border border-border shadow-sm">
            <AvatarImage src={user.avatarUrl || undefined} alt={user.username} />
            <AvatarFallback className="bg-background text-lg font-bold text-foreground uppercase">
              {user.username.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-foreground">
                {user.displayName || user.username}
              </h2>
              <span className="text-[10px] text-muted-foreground bg-muted border border-border px-1.5 py-0.5 rounded font-mono">
                {user.id}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              @{user.username} • {user.email}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            disabled={!hasChanges || isSaving}
            className="text-xs gap-1.5 h-8 px-3 rounded-lg border-border hover:bg-muted"
          >
            <RefreshCw className="size-3.5" />
            Reset
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onSave}
            disabled={!hasChanges || isSaving}
            className="text-xs gap-1.5 h-8 px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm shadow-primary/10"
          >
            <Save className="size-3.5" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Permission Search and Stats */}
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
          Active Flags: {activePermissionsCount}
        </div>
      </div>

      {/* Permissions Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
        {hasChanges && (
          <div className="p-3 border border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400 rounded-lg flex items-start gap-2.5 text-[11px] animate-pulse">
            <AlertCircle className="size-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Unsaved changes detected</p>
              <p className="opacity-90">Please click the Save button above to apply your changes to the user.</p>
            </div>
          </div>
        )}

        {filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <Shield className="size-8 opacity-30" />
            <span className="text-xs">No permissions found matching filters</span>
          </div>
        ) : (
          filteredGroups.map((group) => (
            <div key={group.name} className="space-y-3">
              <h3 className="text-xs font-bold text-foreground/80 tracking-wider uppercase pl-1 border-l-2 border-primary/50">
                {group.name}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {group.permissions.map((perm) => {
                  const isChecked = isPermissionEnabled(editedPermissions, perm.flag);

                  return (
                    <Card
                      key={perm.name}
                      onClick={() => onTogglePermission(perm.flag)}
                      className={`cursor-pointer transition-all duration-150 border rounded-xl overflow-hidden hover:border-primary/40 hover:bg-muted/10 ${
                        isChecked
                          ? "border-primary/20 bg-primary/5/10"
                          : "border-border bg-card"
                      }`}
                    >
                      <CardContent className="p-3 flex items-start gap-3">
                        <div className="mt-0.5" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => onTogglePermission(perm.flag)}
                            className="rounded"
                          />
                        </div>
                        <div className="select-none flex-1">
                          <p className={`text-xs font-semibold ${isChecked ? "text-foreground" : "text-foreground/80"}`}>
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

        {/* Legacy / Undefined Permissions */}
        {legacyPermissions.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-border/60">
            <div className="flex items-center gap-2 text-rose-500">
              <AlertCircle className="size-4" />
              <h3 className="text-xs font-bold tracking-wider uppercase">
                Legacy / Undefined Permissions
              </h3>
            </div>
            <p className="text-[10px] text-muted-foreground leading-normal">
              These permissions are currently set on this user in the database, but are no longer defined in the codebase. Uncheck them to clean up the user's permissions.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {legacyPermissions.map((perm) => {
                const isChecked = isPermissionEnabled(editedPermissions, perm.flag);

                return (
                  <Card
                    key={String(perm.flag)}
                    onClick={() => onTogglePermission(perm.flag)}
                    className={`cursor-pointer transition-all duration-150 border rounded-xl overflow-hidden hover:border-rose-500/40 hover:bg-rose-500/5 ${
                      isChecked
                        ? "border-rose-500/25 bg-rose-500/5"
                        : "border-border bg-card"
                    }`}
                  >
                    <CardContent className="p-3 flex items-start gap-3">
                      <div className="mt-0.5" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => onTogglePermission(perm.flag)}
                          className="rounded border-rose-500/35 data-[state=checked]:bg-rose-500 data-[state=checked]:border-rose-500"
                        />
                      </div>
                      <div className="space-y-1 select-none">
                        <p className={`text-xs font-semibold ${isChecked ? "text-foreground" : "text-foreground/80"}`}>
                          Legacy Permission (Bit {perm.bitIndex})
                        </p>
                        <p className="text-[10px] text-muted-foreground leading-normal">
                          Value: 0x{perm.flag.toString(16)} (Bitmask representation)
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
        {/* Cloud Storage Settings (Lacerta) */}
        <div className="space-y-3 pt-4 border-t border-border/60">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-foreground/80 tracking-wider uppercase pl-1 border-l-2 border-primary/50 flex items-center gap-1.5">
              <HardDrive className="size-3.5 text-primary" />
              Cloud Storage Settings (Lacerta)
            </h3>
            <span className="text-[10px] font-mono text-muted-foreground bg-muted/30 border border-border/50 px-2 py-0.5 rounded">
              Current DB Limit: {formatBytes(user.lacertaMaxStorage)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border border-border bg-card rounded-xl">
            {/* Max Storage Input & Presets */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground/80">
                  Storage Quota Limit
                </label>
                <span className="text-[11px] font-bold text-primary font-mono">
                  {formatBytes(editedMaxStorage)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  value={userStorageLimitMb || ""}
                  onChange={(e) => handleStorageLimitChange(e.target.value)}
                  className="h-8.5 bg-background/50 border-border text-xs rounded-md focus-visible:ring-primary/20 focus-visible:ring-1 font-mono"
                  placeholder="Storage in MB"
                />
                <span className="text-xs font-semibold text-muted-foreground shrink-0">
                  MB
                </span>
              </div>

              {/* Presets */}
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground font-medium">Quick Presets:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "100 MB", bytes: 100 * 1024 * 1024 },
                    { label: "500 MB", bytes: 500 * 1024 * 1024 },
                    { label: "1 GB", bytes: 1024 * 1024 * 1024 },
                    { label: "5 GB", bytes: 5 * 1024 * 1024 * 1024 },
                    { label: "10 GB", bytes: 10 * 1024 * 1024 * 1024 },
                    { label: "50 GB", bytes: 50 * 1024 * 1024 * 1024 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setEditedMaxStorage(preset.bytes)}
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border transition-all ${
                        editedMaxStorage === preset.bytes
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "bg-muted/30 border-border/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Storage Usage Info & Progress */}
            <div className="flex flex-col justify-between space-y-2 p-3 rounded-lg bg-muted/20 border border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground/80">
                  Current Storage Usage
                </span>
                <span className="text-xs font-bold text-foreground">
                  {formatBytes(user.lacertaStorageUsed)}
                </span>
              </div>

              {/* Progress bar */}
              {(() => {
                const limit = editedMaxStorage || user.lacertaMaxStorage || 1;
                const percentage = Math.min(100, Math.max(0, (user.lacertaStorageUsed / limit) * 100));
                const barColorClass =
                  percentage > 90
                    ? "bg-rose-500"
                    : percentage > 75
                    ? "bg-amber-500"
                    : "bg-emerald-500";

                return (
                  <div className="space-y-1.5">
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border/30">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${barColorClass}`}
                        style={{ width: `${percentage.toFixed(1)}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                      <span>{percentage.toFixed(1)}% of allocated limit used</span>
                      <span>{(limit - user.lacertaStorageUsed > 0 ? formatBytes(limit - user.lacertaStorageUsed) : "0 MB")} remaining</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
