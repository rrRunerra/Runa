"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Search,
  UserPlus,
  UserMinus,
  UserCheck,
  UserX,
  Loader2,
  Trash2,
  Check,
  X,
  Edit2,
  FileText,
  User,
  Users,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSafeImageUrl } from "@/lib/inputValidation";
import { fetcher } from "@/lib/fetcher";

// Matching backend types
interface UserMini {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  createdAt: string;
  sender?: UserMini;
  receiver?: UserMini;
}

interface Friend {
  id: string;
  friendId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  nickname: string | null;
  note: string | null;
  createdAt: string;
}

interface RrFriendsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RrFriendsModal({ open, onOpenChange }: RrFriendsModalProps): React.JSX.Element {
  const { t } = useTranslation();
  const { data: session } = useSession();

  const [activeTab, setActiveTab] = useState<string>("friends");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Editing private nickname/note states
  const [editingFriendId, setEditingFriendId] = useState<string | null>(null);
  const [nicknameInput, setNicknameInput] = useState<string>("");
  const [noteInput, setNoteInput] = useState<string>("");

  // SWR queries
  const { data: friends = [], mutate: mutateFriends, isLoading: loadingFriends } = useSWR<Friend[]>(
    session?.accessToken ? [`${process.env.NEXT_PUBLIC_API_URL}/friends`, session.accessToken] : null,
    fetcher
  );

  const { data: incoming = [], mutate: mutateIncoming, isLoading: loadingIncoming } = useSWR<FriendRequest[]>(
    session?.accessToken ? [`${process.env.NEXT_PUBLIC_API_URL}/friends/requests/incoming`, session.accessToken] : null,
    fetcher
  );

  const { data: outgoing = [], mutate: mutateOutgoing, isLoading: loadingOutgoing } = useSWR<FriendRequest[]>(
    session?.accessToken ? [`${process.env.NEXT_PUBLIC_API_URL}/friends/requests/outgoing`, session.accessToken] : null,
    fetcher
  );

  // User search query (triggered on input change)
  const { data: searchResults = [], isLoading: searching } = useSWR<UserMini[]>(
    session?.accessToken && searchQuery.trim().length >= 2
      ? [`${process.env.NEXT_PUBLIC_API_URL}/users?q=${encodeURIComponent(searchQuery)}`, session.accessToken]
      : null,
    fetcher
  );

  const mutateAll = (): void => {
    void mutateFriends();
    void mutateIncoming();
    void mutateOutgoing();
  };

  // Actions
  const handleSendRequest = async (username: string): Promise<void> => {
    if (!session?.accessToken) return;
    setProcessingId(username);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/friends/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({ username }),
      });
      if (res.ok) {
        toast.success(t("polaris.user.sentFriendRequestSuccess", "Friend request sent successfully!"));
        void mutateOutgoing();
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || t("failedSendRequest", "Failed to send request"));
      }
    } catch {
      toast.error(t("failedSendRequest", "Failed to send request"));
    } finally {
      setProcessingId(null);
    }
  };

  const handleAcceptRequest = async (requestId: string): Promise<void> => {
    if (!session?.accessToken) return;
    setProcessingId(requestId);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/friends/request/${requestId}/accept`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (res.ok) {
        toast.success(t("polaris.user.friendRequestAccepted", "Friend request accepted!"));
        mutateAll();
      } else {
        toast.error(t("failedAcceptRequest", "Failed to accept request"));
      }
    } catch {
      toast.error(t("failedAcceptRequest", "Failed to accept request"));
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeclineRequest = async (requestId: string): Promise<void> => {
    if (!session?.accessToken) return;
    setProcessingId(requestId);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/friends/request/${requestId}/decline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (res.ok) {
        toast.success(t("polaris.user.friendRequestDeclined", "Friend request declined."));
        void mutateIncoming();
      } else {
        toast.error(t("failedDeclineRequest", "Failed to decline request"));
      }
    } catch {
      toast.error(t("failedDeclineRequest", "Failed to decline request"));
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancelRequest = async (requestId: string): Promise<void> => {
    if (!session?.accessToken) return;
    setProcessingId(requestId);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/friends/request/${requestId}/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (res.ok) {
        toast.success(t("polaris.user.friendRequestCancelled", "Friend request cancelled."));
        void mutateOutgoing();
      } else {
        toast.error(t("failedCancelRequest", "Failed to cancel request"));
      }
    } catch {
      toast.error(t("failedCancelRequest", "Failed to cancel request"));
    } finally {
      setProcessingId(null);
    }
  };

  const handleRemoveFriend = async (friendId: string): Promise<void> => {
    if (!session?.accessToken) return;
    setProcessingId(friendId);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/friends/${friendId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (res.ok) {
        toast.success(t("polaris.user.friendRemoved", "Friend removed."));
        mutateAll();
      } else {
        toast.error(t("failedRemoveFriend", "Failed to remove friend"));
      }
    } catch {
      toast.error(t("failedRemoveFriend", "Failed to remove friend"));
    } finally {
      setProcessingId(null);
    }
  };

  const handleUpdateFriend = async (friendId: string): Promise<void> => {
    if (!session?.accessToken) return;
    setProcessingId(friendId);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/friends/${friendId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({
          nickname: nicknameInput || undefined,
          note: noteInput || undefined,
        }),
      });
      if (res.ok) {
        toast.success(t("polaris.user.friendUpdated", "Friend details updated."));
        void mutateFriends();
        setEditingFriendId(null);
      } else {
        toast.error(t("failedUpdateFriend", "Failed to update details"));
      }
    } catch {
      toast.error(t("failedUpdateFriend", "Failed to update details"));
    } finally {
      setProcessingId(null);
    }
  };

  const startEditing = (friend: Friend): void => {
    setEditingFriendId(friend.friendId);
    setNicknameInput(friend.nickname || "");
    setNoteInput(friend.note || "");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md md:max-w-lg bg-card border shadow-xl p-6 rounded-2xl flex flex-col max-h-[85vh]">
        <DialogHeader className="pb-3 border-b flex flex-row items-center gap-2">
          <Users className="size-5 text-primary shrink-0" />
          <DialogTitle className="text-md font-bold tracking-tight text-foreground">
            {t("polaris.user.friends", "Friends")}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col mt-4 min-h-0">
          <TabsList className="grid grid-cols-3 h-9 bg-muted/50 border rounded-lg p-0.5 mb-4 shrink-0">
            <TabsTrigger value="friends" className="text-xs font-semibold py-1">
              {t("polaris.user.friendList", "Friend List")} ({friends.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs font-semibold py-1">
              {t("polaris.user.friendRequests", "Requests")} ({incoming.length + outgoing.length})
            </TabsTrigger>
            <TabsTrigger value="add" className="text-xs font-semibold py-1">
              {t("polaris.user.addFriend", "Add Friend")}
            </TabsTrigger>
          </TabsList>

          {/* TAB: FRIENDS LIST */}
          <TabsContent value="friends" className="flex-1 min-h-0 flex flex-col focus-visible:outline-hidden">
            {loadingFriends ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground flex flex-col items-center gap-2">
                <Users className="size-8 text-muted-foreground/45" />
                {t("polaris.user.noFriends", "No friends added yet")}
              </div>
            ) : (
              <ScrollArea className="flex-1 pr-2">
                <div className="flex flex-col gap-3">
                  {friends.map((friend) => (
                    <div
                      key={friend.friendId}
                      className="border border-border/50 rounded-xl p-3.5 bg-card flex flex-col gap-3 hover:shadow-xs transition-all duration-200"
                    >
                      <div className="flex items-center gap-3 justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-9 w-9 border">
                            <AvatarImage src={friend.avatarUrl ? getSafeImageUrl(friend.avatarUrl) : ""} />
                            <AvatarFallback className="text-xs font-bold uppercase">
                              {friend.username.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs truncate text-foreground">
                                {friend.displayName || friend.username}
                              </span>
                              {friend.nickname && (
                                <Badge variant="secondary" className="text-[9px] px-1 py-0 font-medium">
                                  {friend.nickname}
                                </Badge>
                              )}
                            </div>
                            <span className="text-[10px] text-muted-foreground block truncate">
                              @{friend.username}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => startEditing(friend)}
                            className="size-7 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                            title={t("polaris.user.editFriendSettings", "Edit nickname/note")}
                          >
                            <Edit2 className="size-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            disabled={processingId === friend.friendId}
                            onClick={() => handleRemoveFriend(friend.friendId)}
                            className="size-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                            title={t("polaris.user.removeFriend", "Remove Friend")}
                          >
                            {processingId === friend.friendId ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="size-3.5" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Notes / Collapsible details */}
                      {friend.note && editingFriendId !== friend.friendId && (
                        <div className="bg-muted/40 rounded-lg p-2 flex items-start gap-1.5 border border-border/20">
                          <FileText className="size-3 text-muted-foreground/70 mt-0.5 shrink-0" />
                          <span className="text-[10px] text-muted-foreground leading-relaxed italic wrap-break-word">
                            {friend.note}
                          </span>
                        </div>
                      )}

                      {/* Inline editing mode */}
                      {editingFriendId === friend.friendId && (
                        <div className="mt-1 border-t pt-3 flex flex-col gap-2.5 bg-muted/20 p-2.5 rounded-lg border">
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                              {t("polaris.user.friendNickname", "Nickname")}
                            </label>
                            <Input
                              placeholder={t("polaris.user.nicknamePlaceholder", "Enter nickname")}
                              value={nicknameInput}
                              onChange={(e) => setNicknameInput(e.target.value)}
                              className="h-7 text-xs rounded-md"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                              {t("polaris.user.friendNote", "Note")}
                            </label>
                            <Input
                              placeholder={t("polaris.user.notePlaceholder", "Enter private note")}
                              value={noteInput}
                              onChange={(e) => setNoteInput(e.target.value)}
                              className="h-7 text-xs rounded-md"
                            />
                          </div>
                          <div className="flex justify-end gap-1.5 pt-1">
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => setEditingFriendId(null)}
                              className="h-7 px-2.5 text-[10px] font-semibold"
                            >
                              {t("cancel")}
                            </Button>
                            <Button
                              size="xs"
                              disabled={processingId === friend.friendId}
                              onClick={() => handleUpdateFriend(friend.friendId)}
                              className="h-7 px-3 text-[10px] font-semibold bg-primary text-primary-foreground"
                            >
                              {processingId === friend.friendId ? (
                                <Loader2 className="size-3 animate-spin mr-1" />
                              ) : (
                                <Check className="size-3 mr-1" />
                              )}
                              {t("save")}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* TAB: FRIEND REQUESTS */}
          <TabsContent value="pending" className="flex-1 min-h-0 flex flex-col focus-visible:outline-hidden">
            <ScrollArea className="flex-1 pr-2">
              <div className="flex flex-col gap-6">
                {/* Incoming Section */}
                <div className="flex flex-col gap-2.5">
                  <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    {t("polaris.user.incomingRequests", "Incoming")} ({incoming.length})
                  </h3>
                  {loadingIncoming ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : incoming.length === 0 ? (
                    <span className="text-[11px] text-muted-foreground italic pl-1">
                      {t("polaris.user.noIncomingRequests", "No incoming friend requests")}
                    </span>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {incoming.map((req) => (
                        <div
                          key={req.id}
                          className="border border-border/50 rounded-xl p-2.5 bg-card flex items-center justify-between gap-3 hover:shadow-xs transition-shadow duration-150"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="h-7 w-7 border">
                              <AvatarImage src={req.sender?.avatarUrl ? getSafeImageUrl(req.sender.avatarUrl) : ""} />
                              <AvatarFallback className="text-[10px] font-bold uppercase">
                                {req.sender?.username?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 leading-tight">
                              <span className="font-bold text-[11px] truncate text-foreground block">
                                {req.sender?.displayName || req.sender?.username}
                              </span>
                              <span className="text-[9px] text-muted-foreground block truncate">
                                @{req.sender?.username}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              size="xs"
                              disabled={processingId === req.id}
                              onClick={() => handleAcceptRequest(req.id)}
                              className="h-7 w-7 rounded-md bg-success hover:bg-success/90 text-success-foreground p-0"
                              title={t("polaris.user.acceptFriendRequest", "Accept")}
                            >
                              {processingId === req.id ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <Check className="size-3.5" />
                              )}
                            </Button>
                            <Button
                              size="xs"
                              variant="ghost"
                              disabled={processingId === req.id}
                              onClick={() => handleDeclineRequest(req.id)}
                              className="h-7 w-7 rounded-md text-destructive hover:text-destructive hover:bg-destructive/10 p-0"
                              title={t("polaris.user.declineFriendRequest", "Decline")}
                            >
                              <X className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Outgoing Section */}
                <div className="flex flex-col gap-2.5">
                  <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    {t("polaris.user.outgoingRequests", "Outgoing")} ({outgoing.length})
                  </h3>
                  {loadingOutgoing ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : outgoing.length === 0 ? (
                    <span className="text-[11px] text-muted-foreground italic pl-1">
                      {t("polaris.user.noOutgoingRequests", "No outgoing friend requests")}
                    </span>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {outgoing.map((req) => (
                        <div
                          key={req.id}
                          className="border border-border/50 rounded-xl p-2.5 bg-card flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="h-7 w-7 border">
                              <AvatarImage src={req.receiver?.avatarUrl ? getSafeImageUrl(req.receiver.avatarUrl) : ""} />
                              <AvatarFallback className="text-[10px] font-bold uppercase">
                                {req.receiver?.username?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 leading-tight">
                              <span className="font-bold text-[11px] truncate text-foreground block">
                                {req.receiver?.displayName || req.receiver?.username}
                              </span>
                              <span className="text-[9px] text-muted-foreground block truncate">
                                @{req.receiver?.username}
                              </span>
                            </div>
                          </div>
                          <Button
                            size="xs"
                            variant="ghost"
                            disabled={processingId === req.id}
                            onClick={() => handleCancelRequest(req.id)}
                            className="h-7 px-2.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-[10px] font-semibold"
                          >
                            {processingId === req.id ? (
                              <Loader2 className="size-3 animate-spin mr-1" />
                            ) : (
                              <X className="size-3 mr-1" />
                            )}
                            {t("polaris.user.cancelFriendRequest", "Cancel")}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* TAB: ADD FRIEND */}
          <TabsContent value="add" className="flex-1 min-h-0 flex flex-col focus-visible:outline-hidden">
            <div className="relative mb-4 shrink-0">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder={t("polaris.user.searchPlaceholder", "Search by username or email...")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-lg"
              />
            </div>

            <ScrollArea className="flex-1 pr-2">
              {searching ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : searchQuery.trim().length < 2 ? (
                <div className="text-center py-8 text-xs text-muted-foreground italic">
                  {t("searchInstruction", "Type at least 2 characters to search")}
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  {t("noUsersFound", "No users found")}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {searchResults
                    .filter((u) => u.id !== session?.user?.id) // Filter self
                    .map((user) => {
                      // Client side status matching
                      const isFriend = friends.some((f) => f.friendId === user.id);
                      const isIncoming = incoming.some((r) => r.senderId === user.id);
                      const isOutgoing = outgoing.some((r) => r.receiverId === user.id);

                      return (
                        <div
                          key={user.id}
                          className="border border-border/50 rounded-xl p-3 bg-card flex items-center justify-between gap-3 hover:shadow-xs transition-shadow duration-150"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar className="h-8 w-8 border">
                              <AvatarImage src={user.avatarUrl ? getSafeImageUrl(user.avatarUrl) : ""} />
                              <AvatarFallback className="text-xs font-bold uppercase">
                                {user.username.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 leading-tight">
                              <span className="font-bold text-[11px] truncate text-foreground block">
                                {user.displayName || user.username}
                              </span>
                              <span className="text-[9px] text-muted-foreground block truncate">
                                @{user.username}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isFriend ? (
                              <Badge variant="outline" className="text-[10px] py-1 border-success/35 text-success bg-success/5 font-semibold">
                                <UserCheck className="size-3 mr-1" />
                                {t("polaris.user.youAreFriends", "Friends")}
                              </Badge>
                            ) : isOutgoing ? (
                              <Badge variant="outline" className="text-[10px] py-1 font-semibold text-muted-foreground bg-muted/30">
                                {t("pending", "Pending")}
                              </Badge>
                            ) : isIncoming ? (
                              <Button
                                size="xs"
                                disabled={processingId !== null}
                                onClick={() => {
                                  const req = incoming.find((r) => r.senderId === user.id);
                                  if (req) void handleAcceptRequest(req.id);
                                }}
                                className="h-7 text-[10px] font-bold bg-success text-success-foreground"
                              >
                                <UserCheck className="size-3 mr-1" />
                                {t("polaris.user.acceptFriendRequest", "Accept")}
                              </Button>
                            ) : (
                              <Button
                                size="xs"
                                variant="outline"
                                disabled={processingId === user.username}
                                onClick={() => void handleSendRequest(user.username)}
                                className="h-7 text-[10px] font-bold border-primary/30 text-primary hover:bg-primary/5 active:scale-95"
                              >
                                {processingId === user.username ? (
                                  <Loader2 className="size-3 animate-spin mr-1" />
                                ) : (
                                  <UserPlus className="size-3 mr-1" />
                                )}
                                {t("polaris.user.addFriend", "Add Friend")}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
