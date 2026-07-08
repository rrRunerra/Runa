"use client";

import React, { useState, useEffect, useRef } from "react";
import { Link2, UserPlus, Check, Copy, Trash2, X, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { wrapKey, decrypt, importRawKey } from "@runa/crypto/browser";
import { useSession } from "next-auth/react";
import Image from "next/image";
import UserProfileCard, { UserProfileInfo } from "./UserProfileCard";

interface SharedUser {
  id: string;
  username: string;
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  createdAt?: string | Date;
}

interface LaceraFileShare {
  id: string;
  userId: string;
  user: SharedUser;
  allowEdit: boolean;
}

interface ShareFileItem {
  id: string;
  key: string;
  name: string; // Encrypted
  isPublic: boolean;
  wrappedKey: string;
  shares: LaceraFileShare[];
  isFolder: boolean;
  parentId?: string | null;
  rawFileKey?: string | null;
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: ShareFileItem | null;
  rawFileKey: string | null;
  onUpdate: () => void;
  allItems?: any[];
}

export default function ShareModal({
  isOpen,
  onClose,
  file,
  rawFileKey,
  onUpdate,
  allItems,
}: ShareModalProps): React.JSX.Element | null {
  const { data: session } = useSession();
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [usernameInput, setUsernameInput] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<UserProfileInfo[]>([]);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [allowEdit, setAllowEdit] = useState<boolean>(true);

  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!usernameInput.trim() || !session?.accessToken) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/users?q=${encodeURIComponent(usernameInput.trim())}`,
          {
            headers: { Authorization: `Bearer ${session.accessToken}` },
          }
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
          setShowDropdown(data.length > 0);
        }
      } catch (err) {
        console.error("Failed to search users:", err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [usernameInput, session?.accessToken]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isOpen || !file) return null;

  const shareUrl = rawFileKey
    ? `${window.location.origin}/lacerta/share/${file.id}#${rawFileKey}`
    : `${window.location.origin}/lacerta/share/${file.id}`;

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      toast.success("Share link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error("Failed to copy link!");
    }
  };

  const shareWithUser = async (recipient: {
    id: string;
    username: string;
    userPublicKey: string | null;
  }) => {
    if (!session?.accessToken) return;
    if (!recipient.userPublicKey) {
      toast.error("Recipient does not have E2EE enabled. They must log in once to initialize keys.");
      return;
    }

    // Ensure not sharing with self
    if (recipient.id === session.user?.id) {
      toast.error("You cannot share a file with yourself!");
      return;
    }

    // Check if already shared (only check the parent folder/file itself)
    if (file.shares.some((s) => s.userId === recipient.id)) {
      toast.error("File is already shared with this user.");
      return;
    }

    if (!rawFileKey) {
      toast.error("Unlock your secure storage first (E2EE keys not active).");
      return;
    }

    setIsSearching(true);
    const shareToast = toast.loading(`Sharing with @${recipient.username}...`);

    try {
      // Gather all descendants if this is a folder
      const targetsToShare = [file];
      if (file.isFolder && allItems) {
        const queue = [file.id];
        while (queue.length > 0) {
          const currentId = queue.shift()!;
          const children = allItems.filter((item) => item.parentId === currentId);
          for (const child of children) {
            targetsToShare.push(child);
            if (child.isFolder) {
              queue.push(child.id);
            }
          }
        }
      }

      // Perform ECIES re-encryption wrapping and sharing for each target
      for (const target of targetsToShare) {
        if (target.shares?.some((s: any) => s.userId === recipient.id)) {
          continue;
        }

        const targetRawKey = target.rawFileKey || (target.id === file.id ? rawFileKey : null);
        if (!targetRawKey) continue;

        const recipientWrappedKey = JSON.stringify(
          await wrapKey(targetRawKey, recipient.userPublicKey)
        );

        const shareRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/${target.id}/share`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.accessToken}`,
            },
            body: JSON.stringify({
              recipientId: recipient.id,
              wrappedKey: recipientWrappedKey,
              allowEdit,
            }),
          }
        );

        if (!shareRes.ok) {
          throw new Error(`Failed to store share on server for item ${target.name}.`);
        }
      }

      toast.success(
        file.isFolder
          ? `Successfully shared folder and all its contents with @${recipient.username}!`
          : `Successfully shared file with @${recipient.username}!`,
        { id: shareToast }
      );
      setUsernameInput("");
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || "Failed to share with user.", { id: shareToast });
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddUserShare = async () => {
    if (!usernameInput.trim() || !session?.accessToken) return;
    setIsSearching(true);
    try {
      // 1. Fetch public key of recipient
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/${usernameInput.trim().toLowerCase()}/public-key`,
        {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        }
      );
      if (!res.ok) {
        throw new Error("Recipient user not found or does not have E2EE keys setup.");
      }
      const recipient = await res.json();
      await shareWithUser(recipient);
    } catch (err: any) {
      toast.error(err.message || "Failed to share with user.");
      setIsSearching(false);
    }
  };

  const handleRemoveUserShare = async (recipientId: string) => {
    if (!session?.accessToken) return;
    try {
      const targetsToUnshare = [file];
      if (file.isFolder && allItems) {
        const queue = [file.id];
        while (queue.length > 0) {
          const currentId = queue.shift()!;
          const children = allItems.filter((item) => item.parentId === currentId);
          for (const child of children) {
            targetsToUnshare.push(child);
            if (child.isFolder) {
              queue.push(child.id);
            }
          }
        }
      }

      for (const target of targetsToUnshare) {
        if (!target.shares?.some((s: any) => s.userId === recipientId)) {
          continue;
        }

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/${target.id}/share/${recipientId}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${session.accessToken}` },
          }
        );
        if (!res.ok) throw new Error(`Failed to remove sharing permissions for item ${target.name}.`);
      }

      toast.success("Sharing permissions revoked.");
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || "Failed to remove user share.");
    }
  };

  const handleTogglePublic = async () => {
    if (!session?.accessToken) return;
    try {
      const isAboutToBePublic = !file.isPublic;

      // 1. Perform visibility update on the parent canvas file
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/${file.key}/visibility`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${session.accessToken}` },
        }
      );
      if (!res.ok) throw new Error("Failed to update visibility.");

      // 2. If it is a .canvas file and is being made public, sync visibility of embedded files
      if (isAboutToBePublic && file.name.endsWith(".canvas") && rawFileKey) {
        toast.info("Syncing visibility of embedded vault assets...");
        try {
          const downloadRes = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/${file.key}`,
            {
              headers: { Authorization: `Bearer ${session.accessToken}` },
            }
          );
          if (downloadRes.ok) {
            const encBuffer = await downloadRes.arrayBuffer();
            const fileKey = await importRawKey(rawFileKey);
            const decBuffer = await decrypt(encBuffer, fileKey);
            const decText = new TextDecoder().decode(decBuffer);
            const canvasData = JSON.parse(decText);
            const nodes = canvasData.nodes || [];

            // Find all embedded files (they have lacertaFileKey)
            const embeddedFileKeys = new Set<string>();
            for (const node of nodes) {
              if (node.lacertaFileKey) {
                embeddedFileKeys.add(node.lacertaFileKey);
              }
            }

            // Sync visibility for each embedded file
            for (const embeddedKey of embeddedFileKeys) {
              try {
                // To check if it's already public, we find it in allItems or fetch its metadata
                const matchedItem = allItems?.find((item) => item.key === embeddedKey);
                
                let shouldToggle = false;
                if (matchedItem) {
                  shouldToggle = !matchedItem.isPublic;
                } else {
                  // Fallback: fetch metadata to see if it is public
                  const metaRes = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/${embeddedKey}/metadata`,
                    { headers: { Authorization: `Bearer ${session.accessToken}` } }
                  );
                  if (metaRes.ok) {
                    const meta = await metaRes.json();
                    shouldToggle = !meta.isPublic;
                  }
                }

                if (shouldToggle) {
                  await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/files/lacerta/${embeddedKey}/visibility`,
                    {
                      method: "PATCH",
                      headers: { Authorization: `Bearer ${session.accessToken}` },
                    }
                  );
                }
              } catch (nodeErr) {
                console.error("Failed to sync visibility for asset key:", embeddedKey, nodeErr);
              }
            }
          }
        } catch (syncErr) {
          console.error("Failed to sync visibility of embedded canvas assets:", syncErr);
        }
      }

      toast.success("File visibility updated successfully.");
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle visibility.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card/60 p-6 shadow-2xl backdrop-blur-xl flex flex-col">
        <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
          <h3 className="text-lg font-semibold text-foreground">File Sharing</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Link Sharing Segment */}
        <div className="mb-6">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Link Sharing
          </label>
          <div className="mt-2 flex items-center justify-between gap-3 p-3 bg-muted/10 rounded-xl border border-border/60">
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-semibold text-foreground">
                {file.isPublic ? "Public Access Enabled" : "Restricted Access"}
              </span>
              <span className="text-xs text-muted-foreground truncate max-w-[280px]">
                {file.isPublic
                  ? "Anyone with the link can decrypt and view this file."
                  : "Only shared users can decrypt this file."}
              </span>
            </div>
            <button
              onClick={handleTogglePublic}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                file.isPublic
                  ? "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20"
                  : "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
              }`}
            >
              {file.isPublic ? "Disable" : "Enable"}
            </button>
          </div>

          {file.isPublic && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 bg-muted/5 border border-border rounded-lg px-3 py-2 text-xs font-mono text-muted-foreground truncate">
                {shareUrl}
              </div>
              <button
                onClick={copyShareLink}
                className="p-2 border border-border rounded-lg bg-card hover:bg-muted/10 text-foreground transition-all shrink-0"
              >
                {copiedLink ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          )}
        </div>

        {/* Specific User Sharing Segment */}
        <div className="flex-1 flex flex-col min-h-0">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Share with Users
          </label>

          {/* User Search Input */}
          <div className="relative mt-2" ref={searchContainerRef}>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search by username..."
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="flex-1 bg-muted/5 border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary transition-all"
              />
              <button
                onClick={handleAddUserShare}
                disabled={isSearching || !usernameInput.trim()}
                className="px-3 py-2 bg-primary hover:bg-primary/95 disabled:bg-primary/50 text-primary-foreground font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-all"
              >
                <UserPlus className="h-3.5 w-3.5" />
                {isSearching ? "Sharing..." : "Share"}
              </button>
            </div>

            {/* Checkbox for allowEdit */}
            <div className="mt-2 flex items-center gap-2 px-1">
              <input
                type="checkbox"
                id="allowEditShare"
                checked={allowEdit}
                onChange={(e) => setAllowEdit(e.target.checked)}
                className="rounded border-border bg-muted/5 text-primary focus:ring-primary size-3.5 cursor-pointer"
              />
              <label htmlFor="allowEditShare" className="text-[11px] text-muted-foreground cursor-pointer select-none">
                Allow recipients to edit and save changes
              </label>
            </div>

            {/* Dropdown Results */}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl max-h-48 overflow-y-auto no-scrollbar z-50 py-1.5 divide-y divide-neutral-800/40">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    onClick={async () => {
                      setShowDropdown(false);
                      await shareWithUser({
                        id: user.id,
                        username: user.username,
                        userPublicKey: user.userPublicKey ?? null,
                      });
                    }}
                    className="flex items-center gap-2.5 px-3.5 py-2 hover:bg-neutral-800/50 cursor-pointer transition-colors"
                  >
                    {/* User Avatar */}
                    {user.avatarUrl ? (
                      <Image
                        src={user.avatarUrl}
                        alt={user.username}
                        width={24}
                        height={24}
                        className="rounded-full object-cover size-6 shrink-0 border border-neutral-700"
                      />
                    ) : (
                      <div className="size-6 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-[10px] shrink-0">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    
                    <div className="flex flex-col min-w-0 flex-1">
                      <UserProfileCard user={user} triggerMode="hover">
                        <span className="text-xs font-semibold text-white truncate">
                          {user.displayName || user.username}
                        </span>
                      </UserProfileCard>
                      <span className="text-[10px] text-neutral-400 truncate">
                        @{user.username}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* List of Shared Users */}
          <div className="mt-4 flex-1 overflow-y-auto max-h-[160px] no-scrollbar border border-border/40 rounded-xl divide-y divide-border/30">
            {file.shares.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                Not shared with any users yet.
              </div>
            ) : (
              file.shares.map((share) => (
                <div
                  key={share.id}
                  className="flex items-center justify-between p-3 hover:bg-muted/5 transition-all animate-in fade-in duration-100"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Avatar */}
                    {share.user.avatarUrl ? (
                      <Image
                        src={share.user.avatarUrl}
                        alt={share.user.username}
                        width={24}
                        height={24}
                        className="rounded-full object-cover size-6 shrink-0 border border-neutral-700"
                      />
                    ) : (
                      <div className="size-6 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-[10px] shrink-0">
                        {share.user.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <UserProfileCard user={share.user} triggerMode="hover">
                          <span className="text-xs font-semibold text-foreground truncate">
                            @{share.user.username}
                          </span>
                        </UserProfileCard>
                        <span className={`text-[9px] px-1.5 py-0.25 font-semibold rounded-full shrink-0 scale-90 origin-left ${
                          share.allowEdit 
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}>
                          {share.allowEdit ? "Can Edit" : "View Only"}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground truncate">
                        {share.user.email}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveUserShare(share.userId)}
                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
