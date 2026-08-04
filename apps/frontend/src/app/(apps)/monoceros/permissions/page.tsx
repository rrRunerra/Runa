"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import useSWR from "swr";
import { Shield, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { hasPermission, RunaFlags } from "@runa/permissions";

import {
  getAllUsers,
  updateUserPermissions,
  batchUpdateUserPermissions,
  batchUpdateUserStorageLimit,
  SafeUser,
} from "@/actions/permissionActions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import RrUserList from "./components/rrUserList";
import RrSingleUserEditor from "./components/rrSingleUserEditor";
import RrBatchUserEditor from "./components/rrBatchUserEditor";
import {
  getDynamicPermissionGroups,
  togglePermissionInArray,
} from "./utils/permissionUtils";

export default function MonocerosPermissionsPage(): React.JSX.Element {
  const { data: session, status } = useSession();
  const [isPending, startTransition] = useTransition();

  // Local State
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);
  const [editedPermissions, setEditedPermissions] = useState<number[]>([]);
  const [editedMaxStorage, setEditedMaxStorage] = useState<number>(100 * 1024 * 1024);
  const [searchQuery, setSearchQuery] = useState("");


  // Dynamically resolved permission groups from permissions package
  const availableGroups = useMemo(() => getDynamicPermissionGroups(), []);

  // SWR for user data querying
  const {
    data: users = [],
    error,
    isLoading: isSWRClassLoading,
    mutate,
  } = useSWR<SafeUser[]>(
    status === "authenticated" ? "monoceros-users-list" : null,
    async () => {
      const res = await getAllUsers();
      if (!res.success) {
        throw new Error(res.error || "Failed to fetch users");
      }
      return res.users || [];
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  // Derived state: find active user from loaded users array
  const activeUser = useMemo(
    () => users.find((u) => u.id === activeUserId) || null,
    [users, activeUserId]
  );

  // Sync edited permissions when database permissions change or active user switches
  const dbPermissionsString = activeUser?.permissions.join(",") || "";
  useEffect(() => {
    if (activeUser) {
      setEditedPermissions([...activeUser.permissions]);
      setEditedMaxStorage(activeUser.lacertaMaxStorage);
    } else {
      setEditedPermissions([]);
      setEditedMaxStorage(100 * 1024 * 1024);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUserId, dbPermissionsString, activeUser?.lacertaMaxStorage]);


  // Auth checking and redirects
  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/monoceros/unauthorized");
    }
    if (
      status === "authenticated" &&
      session?.user?.permissions &&
      !hasPermission(session.user.permissions, RunaFlags.ADMINISTRATOR)
    ) {
      redirect("/monoceros/unauthorized");
    }
  }, [status, session]);

  // Handlers
  const handleSelectUser = (user: SafeUser) => {
    setActiveUserId(user.id);
    setEditedPermissions([...user.permissions]);
    setEditedMaxStorage(user.lacertaMaxStorage);
  };


  const handleTogglePermission = (flag: bigint) => {
    setEditedPermissions((prev) => togglePermissionInArray(prev, flag));
  };

  const handleToggleSelectBatchUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleToggleSelectAll = (checked: boolean, filteredUserIds: string[]) => {
    if (checked) {
      setSelectedUserIds((prev) => {
        const union = new Set([...prev, ...filteredUserIds]);
        return Array.from(union);
      });
    } else {
      setSelectedUserIds((prev) => prev.filter((id) => !filteredUserIds.includes(id)));
    }
  };

  const handleSaveIndividualPermissions = () => {
    if (!activeUser) return;

    startTransition(async () => {
      const result = await updateUserPermissions(
        activeUser.id,
        editedPermissions,
        editedMaxStorage
      );
      if (result.success && result.user) {
        toast.success(`User settings updated for ${activeUser.username}`);
        await mutate();
      } else {
        toast.error(result.error || "Failed to update user settings");
      }
    });
  };


  const handleResetIndividualPermissions = () => {
    if (activeUser) {
      setEditedPermissions([...activeUser.permissions]);
      setEditedMaxStorage(activeUser.lacertaMaxStorage);
      toast.info("User settings reset to database state");
    }
  };


  const handleApplyBatchAction = (
    action: "grant" | "revoke" | "replace",
    flags: number[]
  ) => {
    if (selectedUserIds.length === 0) return;

    startTransition(async () => {
      const result = await batchUpdateUserPermissions(selectedUserIds, action, flags);
      if (result.success) {
        toast.success(`Successfully applied batch updates to ${selectedUserIds.length} users`);
        setSelectedUserIds([]);
        await mutate();
      } else {
        toast.error(result.error || "Failed to process batch update");
      }
    });
  };

  const handleApplyBatchStorageLimit = (maxStorageBytes: number) => {
    if (selectedUserIds.length === 0) return;

    startTransition(async () => {
      const result = await batchUpdateUserStorageLimit(selectedUserIds, maxStorageBytes);
      if (result.success) {
        toast.success(`Successfully updated storage quota for ${selectedUserIds.length} users`);
        setSelectedUserIds([]);
        await mutate();
      } else {
        toast.error(result.error || "Failed to process batch storage update");
      }
    });
  };

  const hasIndividualChanges = useMemo(() => {
    if (!activeUser) return false;
    if (activeUser.permissions.length !== editedPermissions.length) return true;
    if (activeUser.lacertaMaxStorage !== editedMaxStorage) return true;
    return activeUser.permissions.some((val, i) => val !== editedPermissions[i]);
  }, [activeUser, editedPermissions, editedMaxStorage]);


  const selectedUsers = useMemo(() => {
    return users.filter((u) => selectedUserIds.includes(u.id));
  }, [users, selectedUserIds]);

  // Loading screens
  if (status === "loading" || isSWRClassLoading) {
    return (
      <div className="w-full h-[calc(100vh-2rem)] flex flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="size-8 animate-spin text-primary" />
        <span className="text-xs tracking-wider uppercase opacity-75">
          Loading Access Panel...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-[calc(100vh-2rem)] flex flex-col items-center justify-center gap-3 text-muted-foreground p-6">
        <AlertCircle className="size-10 text-destructive" />
        <span className="text-sm font-semibold">Failed to load permissions workspace</span>
        <p className="text-xs max-w-md text-center opacity-85">{error.message || String(error)}</p>
        <Button variant="outline" size="sm" onClick={() => mutate()} className="mt-2 text-xs">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full h-full max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-0 antialiased">
      {/* Left Pane - Search & User List (2/5 span) */}
      <div className="lg:col-span-2 min-h-[400px] lg:min-h-0 h-full">
        <RrUserList
          users={users}
          selectedUserIds={selectedUserIds}
          activeUserId={activeUserId}
          onSelectUser={handleSelectUser}
          onToggleSelectBatchUser={handleToggleSelectBatchUser}
          onToggleSelectAll={handleToggleSelectAll}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      </div>

      {/* Right Pane - Detail Editor / Batch Panel (3/5 span) */}
      <div className="lg:col-span-3 h-full">
        {selectedUserIds.length > 1 ? (
          <RrBatchUserEditor
            selectedUsers={selectedUsers}
            availableGroups={availableGroups}
            onApplyBatchAction={handleApplyBatchAction}
            onApplyBatchStorageLimit={handleApplyBatchStorageLimit}
            isSaving={isPending}
          />
        ) : activeUser ? (
          <RrSingleUserEditor
            user={activeUser}
            availableGroups={availableGroups}
            editedPermissions={editedPermissions}
            onTogglePermission={handleTogglePermission}
            onSave={handleSaveIndividualPermissions}
            onReset={handleResetIndividualPermissions}
            isSaving={isPending}
            hasChanges={hasIndividualChanges}
            editedMaxStorage={editedMaxStorage}
            setEditedMaxStorage={setEditedMaxStorage}
          />

        ) : (
          <div className="flex flex-col items-center justify-center h-full bg-card border border-border/80 border-dashed rounded-xl p-8 text-center gap-3">
            <Shield className="size-10 text-muted-foreground/30 animate-pulse" />
            <h3 className="text-xs font-bold text-foreground">No Selection</h3>
            <p className="text-[11px] text-muted-foreground max-w-xs leading-normal">
              Select a user from the list on the left to edit their permissions, or select multiple users for batch editing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
