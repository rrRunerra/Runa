"use client";

import { useMemo } from "react";
import { Search, User, Shield } from "lucide-react";
import { SafeUser } from "@/actions/permissionActions";
import { RunaFlags } from "@runa/permissions";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { isPermissionEnabled } from "../utils/permissionUtils";

interface RrUserListProps {
  users: SafeUser[];
  selectedUserIds: string[];
  activeUserId: string | null;
  onSelectUser: (user: SafeUser) => void;
  onToggleSelectBatchUser: (userId: string) => void;
  onToggleSelectAll: (checked: boolean, filteredUserIds: string[]) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function RrUserList({
  users,
  selectedUserIds,
  activeUserId,
  onSelectUser,
  onToggleSelectBatchUser,
  onToggleSelectAll,
  searchQuery,
  setSearchQuery,
}: RrUserListProps): React.JSX.Element {
  // Filter users based on query
  const filteredUsers = useMemo(() => {
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.displayName && u.displayName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [users, searchQuery]);

  const filteredUserIds = useMemo(() => filteredUsers.map((u) => u.id), [filteredUsers]);

  const allFilteredSelected = useMemo(() => {
    if (filteredUserIds.length === 0) return false;
    return filteredUserIds.every((id) => selectedUserIds.includes(id));
  }, [filteredUserIds, selectedUserIds]);

  const someFilteredSelected = useMemo(() => {
    if (filteredUserIds.length === 0) return false;
    return filteredUserIds.some((id) => selectedUserIds.includes(id)) && !allFilteredSelected;
  }, [filteredUserIds, selectedUserIds, allFilteredSelected]);

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      {/* Header & Search */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Users</h2>
          <span className="text-xs text-muted-foreground">
            {selectedUserIds.length > 0
              ? `${selectedUserIds.length} selected`
              : `${users.length} total`}
          </span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground/75" />
          <Input
            placeholder="Search username, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background/50 border-border text-foreground text-xs placeholder:text-muted-foreground rounded-lg focus-visible:ring-primary/20 focus-visible:ring-1"
          />
        </div>
      </div>

      {/* Select All Bar */}
      {filteredUsers.length > 0 && (
        <div className="px-4 py-2 border-b border-border/60 bg-muted/20 flex items-center gap-3">
          <Checkbox
            id="select-all-users"
            checked={allFilteredSelected ? true : someFilteredSelected ? "indeterminate" : false}
            onCheckedChange={(checked) => onToggleSelectAll(!!checked, filteredUserIds)}
            className="rounded"
          />
          <label
            htmlFor="select-all-users"
            className="text-[11px] font-medium text-muted-foreground cursor-pointer select-none"
          >
            Select all showing ({filteredUsers.length})
          </label>
        </div>
      )}

      {/* User list */}
      <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-border/60">
        {filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
            <User className="size-6 opacity-40" />
            <span className="text-xs">No users found</span>
          </div>
        ) : (
          filteredUsers.map((user) => {
            const isActive = activeUserId === user.id;
            const isChecked = selectedUserIds.includes(user.id);
            const isAdmin = isPermissionEnabled(user.permissions, RunaFlags.ADMINISTRATOR);

            return (
              <div
                key={user.id}
                onClick={() => onSelectUser(user)}
                className={`w-full p-3 transition-colors duration-150 flex items-center justify-between cursor-pointer border-l-2 ${
                  isActive
                    ? "bg-accent/40 border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0" onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => onToggleSelectBatchUser(user.id)}
                    className="rounded"
                  />
                  <div className="cursor-pointer" onClick={() => onSelectUser(user)}>
                    <Avatar className="size-8 rounded-lg border border-border">
                      <AvatarImage src={user.avatarUrl || undefined} alt={user.username} />
                      <AvatarFallback className="bg-background text-xs font-semibold text-foreground uppercase">
                        {user.username.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>

                <div className="flex-1 min-w-0 ml-3 cursor-pointer" onClick={() => onSelectUser(user)}>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-semibold text-foreground truncate block">
                      {user.displayName || user.username}
                    </span>
                    {isAdmin && (
                      <Shield className="size-3 text-primary shrink-0" />
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground truncate block">
                    @{user.username} • {user.email}
                  </span>
                </div>

                <div className="shrink-0 flex gap-1.5 ml-2">
                  {isAdmin ? (
                    <Badge variant="outline" className="text-[9px] bg-primary/10 text-primary border-primary/20 font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                      Admin
                    </Badge>
                  ) : user.permissions.length > 0 ? (
                    <Badge variant="outline" className="text-[9px] bg-muted text-muted-foreground border-border px-1.5 py-0.5 rounded-md font-medium">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9px] bg-muted/30 text-muted-foreground/60 border-transparent px-1.5 py-0.5 rounded-md font-normal italic">
                      None
                    </Badge>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
