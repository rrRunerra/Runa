"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { 
  Shield, 
  Search, 
  ArrowLeft, 
  Check, 
  Loader2, 
  User, 
  Info,
  Tv,
  MessageSquare,
  Database,
  Lock,
  Globe
} from "lucide-react";
import { toast } from "sonner";

import { BitField, PolarisFlags, LynxFlags, AquilaFlags, hasPermission, PERMISSION_DESCRIPTIONS } from "@runa/permissions";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import PolarisUnauthorized from "@/components/unauthorized/PolarisUnauthorized";
import { getAllUsers, updateUserPermissions, SafeUser } from "@/actions/permissionActions";

interface PermissionDefinition {
  name: string;
  flag: bigint;
  label: string;
  description: string;
}

interface PermissionGroup {
  name: string;
  icon: React.ReactNode;
  permissions: PermissionDefinition[];
}


const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    name: "Global / Administration",
    icon: <Globe className="size-4 text-purple-400" />,
    permissions: Object.entries(BitField.Flags).map(([name, flag]) => ({
      name,
      flag,
      label: name === "ADMINISTRATOR" ? "Administrator" : name.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" "),
      description: PERMISSION_DESCRIPTIONS[name] || `Grants global ${name.toLowerCase()} permission`,
    })),
  },
  {
    name: "Polaris Account",
    icon: <User className="size-4 text-blue-400" />,
    permissions: Object.entries(PolarisFlags).map(([name, flag]) => {
      const key = `POLARIS_${name}`;
      return {
        name,
        flag,
        label: name === "LOGGED_IN" ? "Logged In" : `${name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()} Polaris`,
        description: PERMISSION_DESCRIPTIONS[key] || `Access ${name.toLowerCase()} features in Polaris`,
      };
    }),
  },
  {
    name: "Lynx Bot Interface",
    icon: <MessageSquare className="size-4 text-emerald-400" />,
    permissions: Object.entries(LynxFlags).map(([name, flag]) => {
      const key = `LYNX_${name}`;
      let label = name.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
      if (name === "VIEW") label = "View Lynx";
      if (name === "MANAGE") label = "Manage Lynx";
      if (name === "LOGGED_IN") label = "Logged In";
      if (name === "GUILD_CHAT") label = "Guild Chatting";
      if (name === "DM_CHAT") label = "Direct Messages";
      return {
        name,
        flag,
        label,
        description: PERMISSION_DESCRIPTIONS[key] || `Access ${name.toLowerCase()} features in Lynx`,
      };
    }),
  },
  {
    name: "Aquila Media Library",
    icon: <Tv className="size-4 text-amber-400" />,
    permissions: Object.entries(AquilaFlags).map(([name, flag]) => {
      const key = `AQUILA_${name}`;
      let label = name.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
      if (name === "VIEW") label = "View Aquila";
      if (name === "MANAGE") label = "Manage Aquila";
      if (name === "LOGGED_IN") label = "Logged In";
      return {
        name,
        flag,
        label,
        description: PERMISSION_DESCRIPTIONS[key] || `Access ${name.toLowerCase()} features in Aquila`,
      };
    }),
  },
];

function isPermissionEnabled(userPermissions: number[], flag: bigint): boolean {
  // Check if the user is an administrator (global bypass)
  const adminBits = BitField.resolve(BitField.Flags.ADMINISTRATOR, {});
  let hasAdmin = true;
  for (let i = 0; i < adminBits.length; i++) {
    const adminWord = adminBits[i] || 0;
    const userWord = userPermissions[i] || 0;
    if (adminWord !== 0 && (userWord & adminWord) !== adminWord) {
      hasAdmin = false;
      break;
    }
  }

  if (hasAdmin && flag !== BitField.Flags.ADMINISTRATOR) {
    return true;
  }

  const flagBits = BitField.resolve(flag, {});
  for (let i = 0; i < flagBits.length; i++) {
    const flagWord = flagBits[i] || 0;
    const userWord = userPermissions[i] || 0;
    if ((userWord & flagWord) !== flagWord) {
      return false;
    }
  }
  return true;
}

function togglePermissionInArray(userPermissions: number[], flag: bigint): number[] {
  const bitfield = new BitField(userPermissions);
  if (isPermissionEnabled(userPermissions, flag)) {
    bitfield.remove(flag);
  } else {
    bitfield.add(flag);
  }
  return bitfield.serialize();
}

export default function PermissionsPage() {
  const { data: session, status } = useSession();

  const [users, setUsers] = useState<SafeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<SafeUser | null>(null);
  const [editedPermissions, setEditedPermissions] = useState<number[]>([]);
  
  const [isPending, startTransition] = useTransition();

  // Load all users on mount
  useEffect(() => {
    document.title = "Polaris > Permissions Manager";
    if (status === "authenticated" && hasPermission(session?.user?.permissions, BitField.Flags.ADMINISTRATOR)) {
      loadUsers();
    }
  }, [status, session]);

  const loadUsers = async () => {
    setLoading(true);
    const result = await getAllUsers();
    if (result.success && result.users) {
      setUsers(result.users);
      // Auto-select first user if none selected
      if (result.users.length > 0 && !selectedUser) {
        handleSelectUser(result.users[0]);
      } else if (selectedUser) {
        // Sync selected user details
        const updated = result.users.find(u => u.id === selectedUser.id);
        if (updated) handleSelectUser(updated);
      }
    } else {
      toast.error(result.error || "Failed to load users");
    }
    setLoading(false);
  };

  const handleSelectUser = (user: SafeUser) => {
    setSelectedUser(user);
    setEditedPermissions([...user.permissions]);
  };

  // Filter users by search query
  const filteredUsers = useMemo(() => {
    return users.filter(user => 
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.displayName && user.displayName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [users, searchQuery]);

  // Check if permissions have been modified for the selected user
  const hasChanges = useMemo(() => {
    if (!selectedUser) return false;
    if (selectedUser.permissions.length !== editedPermissions.length) return true;
    return selectedUser.permissions.some((p, i) => p !== editedPermissions[i]);
  }, [selectedUser, editedPermissions]);

  const handleTogglePermission = (flag: bigint) => {
    setEditedPermissions(prev => togglePermissionInArray(prev, flag));
  };

  const handleSavePermissions = () => {
    if (!selectedUser) return;

    startTransition(async () => {
      const result = await updateUserPermissions(selectedUser.id, editedPermissions);
      if (result.success && result.user) {
        toast.success(`Permissions updated for ${selectedUser.username}`);
        await loadUsers();
      } else {
        toast.error(result.error || "Failed to save permissions");
      }
    });
  };

  const handleResetPermissions = () => {
    if (selectedUser) {
      setEditedPermissions([...selectedUser.permissions]);
    }
  };

  // Helper to extract active permission names to show as badges in user list
  const getActiveBadges = (userPermissions: number[]) => {
    const badges: string[] = [];
    if (isPermissionEnabled(userPermissions, BitField.Flags.ADMINISTRATOR)) {
      return ["Administrator"];
    }

    for (const group of PERMISSION_GROUPS) {
      if (group.name.includes("Global")) continue;
      for (const perm of group.permissions) {
        if (isPermissionEnabled(userPermissions, perm.flag)) {
          badges.push(perm.label);
        }
      }
    }
    return badges;
  };

  if (status === "loading") {
    return (
      <div className="w-full min-h-screen bg-black flex flex-col items-center justify-center gap-3 text-muted-foreground font-sans">
        <Loader2 className="size-8 animate-spin text-purple-400" />
        <span className="text-xs tracking-wider uppercase opacity-75">Loading secure panel...</span>
      </div>
    );
  }

  if (status === "unauthenticated" || !hasPermission(session?.user?.permissions, BitField.Flags.ADMINISTRATOR)) {
    return (
      <PolarisUnauthorized 
        message="You don't have permission to access the Polaris Permissions Manager."
        returnUrl="/polaris/dash"
      />
    );
  }

  return (
    <div className="w-full min-h-screen bg-black text-foreground antialiased flex flex-col font-sans">
      {/* Premium Header */}
      <header className="border-b border-border/20 bg-background/50 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/polaris/dash">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white rounded-xl">
              <ArrowLeft className="size-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Shield className="size-5 text-purple-400" />
              <h1 className="text-xl font-bold tracking-wide text-white">Permissions Manager</h1>
            </div>
            <p className="text-[11px] text-muted-foreground">Manage user permissions and bitfield flags</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-purple-950/20 text-purple-300 border-purple-800/30 px-3 py-1 font-semibold tracking-wider uppercase text-[9px]">
            Administrator Access
          </Badge>
        </div>
      </header>

      {/* Main layout */}
      <div className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Left Pane - User List (2/5 span) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Card className="border-border/30 bg-card/20 backdrop-blur-md shadow-2xl rounded-2xl flex flex-col overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/10">
              <CardTitle className="text-white text-base">Users</CardTitle>
              <CardDescription>Select a user to review and edit permissions</CardDescription>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground/60" />
                <Input
                  placeholder="Search username, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-background/30 border-border/30 text-white rounded-xl focus-visible:ring-purple-500/20 focus-visible:border-purple-500"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0 max-h-[calc(100vh-280px)] overflow-y-auto no-scrollbar">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
                  <Loader2 className="size-6 animate-spin text-purple-400" />
                  <span className="text-xs">Fetching users from database...</span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                  <User className="size-8 opacity-30" />
                  <span className="text-xs">No users found</span>
                </div>
              ) : (
                <div className="divide-y divide-border/10">
                  {filteredUsers.map((user) => {
                    const isSelected = selectedUser?.id === user.id;
                    const badges = getActiveBadges(user.permissions);
                    const isGlobalAdmin = badges.includes("Administrator");
                    
                    return (
                      <button
                        key={user.id}
                        onClick={() => handleSelectUser(user)}
                        className={`w-full text-left p-4 transition-all duration-200 flex items-start gap-3 border-l-2 ${
                          isSelected 
                            ? "bg-purple-950/10 border-purple-500 text-white" 
                            : "border-transparent text-muted-foreground hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <Avatar className="size-9 rounded-xl border border-border/30">
                          {user.avatarUrl && <AvatarImage src={user.avatarUrl} />}
                          <AvatarFallback className="bg-background text-xs font-bold rounded-xl text-purple-300">
                            {user.username.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className={`text-xs font-bold truncate ${isSelected ? "text-purple-300" : "text-white"}`}>
                              {user.displayName || user.username}
                            </span>
                            {user.displayName && (
                              <span className="text-[10px] text-muted-foreground/60 truncate">
                                @{user.username}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground truncate block mb-1.5">
                            {user.email}
                          </span>
                          
                          {/* Active permissions display */}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {isGlobalAdmin ? (
                              <Badge className="bg-purple-500/10 text-purple-400 border-purple-800/40 text-[8px] px-1.5 py-0">
                                Administrator
                              </Badge>
                            ) : badges.length > 0 ? (
                              badges.slice(0, 3).map((badge, idx) => (
                                <Badge key={idx} variant="outline" className="border-border/30 text-muted-foreground text-[8px] px-1.5 py-0 bg-background/20">
                                  {badge}
                                </Badge>
                              ))
                            ) : (
                              <Badge variant="outline" className="border-border/20 text-muted-foreground/40 text-[8px] px-1.5 py-0">
                                No Permissions
                              </Badge>
                            )}
                            {badges.length > 3 && (
                              <span className="text-[8px] text-muted-foreground/50 self-center">
                                +{badges.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Pane - Permissions Editor (3/5 span) */}
        <div className="lg:col-span-3">
          {selectedUser ? (
            <Card className="border-border/30 bg-card/20 backdrop-blur-md shadow-2xl rounded-2xl flex flex-col overflow-hidden h-full">
              <CardHeader className="border-b border-border/10 pb-4 bg-background/20">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-11 rounded-xl border border-border/30">
                      {selectedUser.avatarUrl && <AvatarImage src={selectedUser.avatarUrl} />}
                      <AvatarFallback className="bg-background text-sm font-bold rounded-xl text-purple-300">
                        {selectedUser.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-white text-base font-bold">
                          {selectedUser.displayName || selectedUser.username}
                        </CardTitle>
                        <Badge variant="outline" className="text-[8px] px-1.5 py-0 border-border/40 text-muted-foreground bg-background/40">
                          ID: {selectedUser.id}
                        </Badge>
                      </div>
                      <CardDescription className="text-xs">{selectedUser.email}</CardDescription>
                    </div>
                  </div>

                  {hasChanges && (
                    <div className="flex items-center gap-2 animate-pulse">
                      <span className="h-2 w-2 rounded-full bg-purple-500" />
                      <span className="text-[10px] text-purple-400 font-semibold tracking-wider uppercase">Unsaved Changes</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="p-4 md:p-6 overflow-y-auto space-y-6 no-scrollbar max-h-[calc(100vh-280px)]">
                {PERMISSION_GROUPS.map((group, groupIdx) => {
                  return (
                    <div key={groupIdx} className="space-y-3">
                      <div className="flex items-center gap-2 border-b border-border/10 pb-1.5">
                        {group.icon}
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          {group.name}
                        </h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {group.permissions.map((perm) => {
                          const isEnabled = isPermissionEnabled(editedPermissions, perm.flag);
                          const isInitiallyEnabled = isPermissionEnabled(selectedUser.permissions, perm.flag);
                          
                          // Custom style if the checkbox was modified but unsaved
                          const isModified = isEnabled !== isInitiallyEnabled;

                          return (
                            <button
                              key={perm.name}
                              type="button"
                              onClick={() => handleTogglePermission(perm.flag)}
                              className={`group relative text-left p-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-start gap-3 select-none ${
                                isEnabled 
                                  ? "bg-purple-950/5 border-purple-500/40 text-white" 
                                  : "bg-background/25 border-border/20 text-muted-foreground hover:border-border/40 hover:text-white"
                              } ${isModified ? "ring-1 ring-amber-500/40 border-amber-500/30" : ""}`}
                            >
                              <div className="pt-0.5">
                                <Checkbox
                                  checked={isEnabled}
                                  onCheckedChange={() => handleTogglePermission(perm.flag)}
                                  className="pointer-events-none"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-xs font-bold tracking-wide group-hover:text-purple-300">
                                    {perm.label}
                                  </span>
                                  {isModified && (
                                    <span className="text-[8px] font-bold text-amber-500 uppercase px-1 py-0 border border-amber-500/20 bg-amber-500/5 rounded-md">
                                      Modified
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-muted-foreground/75 mt-0.5 leading-normal">
                                  {perm.description}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </CardContent>

              <CardFooter className="border-t border-border/10 p-4 bg-background/20 flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={handleResetPermissions}
                  disabled={!hasChanges || isPending}
                  className="rounded-xl border-border/40 text-muted-foreground hover:text-white hover:bg-white/5 rounded-xl cursor-pointer"
                >
                  Reset Changes
                </Button>
                <Button
                  onClick={handleSavePermissions}
                  disabled={!hasChanges || isPending}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-semibold rounded-xl px-5 gap-2 cursor-pointer shadow-[0_0_15px_rgba(147,51,234,0.3)] disabled:shadow-none"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="size-4" />
                      Save Permissions
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Card className="border-border/30 bg-card/20 backdrop-blur-md shadow-2xl rounded-2xl flex flex-col items-center justify-center p-12 text-center h-full">
              <Lock className="size-12 text-purple-400/40 mb-3" />
              <CardTitle className="text-white text-base font-bold">No User Selected</CardTitle>
              <CardDescription className="max-w-xs mt-1">
                Choose a user from the left pane to manage their security bitfields.
              </CardDescription>
            </Card>
          )}
        </div>

      </div>
    </div>
  );
}
