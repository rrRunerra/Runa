"use client";

import React from "react";
import {
  Mail,
  MailOpen,
  Reply,
  Archive,
  Flame,
  Trash2,
} from "lucide-react";
import {
  ContextMenuContent,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  ContextMenuItem,
} from "@/components/ui/context-menu";

import { Message } from "./rrThreadList";

interface RrThreadContextMenuProps {
  msg: Message;
  onMarkRead?: (id: string, read: boolean) => void;
  onReplyMsg?: (msg: Message, mode: "reply" | "replyAll" | "forward" | "redirect") => void;
  onMoveTo?: (id: string, targetFolder: string) => void;
  onCopyTo?: (id: string, targetFolder: string) => void;
  onEditAsNewMessage?: (msg: Message) => void;
}

export default function RrThreadContextMenu({
  msg,
  onMarkRead,
  onReplyMsg,
  onMoveTo,
  onCopyTo,
  onEditAsNewMessage,
}: RrThreadContextMenuProps): React.JSX.Element {
  return (
    <ContextMenuContent className="w-60 bg-popover/95 backdrop-blur-2xl border-border shadow-2xl rounded-2xl p-1.5 z-50">
      {/* Top Quick Bar */}
      <div className="flex items-center justify-between p-1 bg-muted/40 rounded-xl mb-1 border border-border/50">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMarkRead?.(msg.id, !msg.read);
          }}
          className="p-1.5 text-muted-foreground hover:text-primary hover:bg-card rounded-lg transition-all cursor-pointer"
          title={msg.read ? "Mark Unread" : "Mark Read"}
        >
          {msg.read ? (
            <Mail className="size-4" />
          ) : (
            <MailOpen className="size-4 text-primary" />
          )}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onReplyMsg?.(msg, "reply");
          }}
          className="p-1.5 text-muted-foreground hover:text-primary hover:bg-card rounded-lg transition-all cursor-pointer"
          title="Reply"
        >
          <Reply className="size-4" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMoveTo?.(msg.id, "archive");
          }}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-card rounded-lg transition-all cursor-pointer"
          title="Archive"
        >
          <Archive className="size-4" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMoveTo?.(msg.id, "junk");
          }}
          className="p-1.5 text-muted-foreground hover:text-amber-500 hover:bg-card rounded-lg transition-all cursor-pointer"
          title="Junk / Spam"
        >
          <Flame className="size-4" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMoveTo?.(msg.id, "trash");
          }}
          className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all cursor-pointer"
          title="Delete"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <ContextMenuSeparator />

      {/* Submenu: Reply */}
      <ContextMenuSub>
        <ContextMenuSubTrigger className="cursor-pointer text-xs font-medium py-1.5 px-2">
          <span>
            <span className="underline underline-offset-2 font-bold">R</span>eply
          </span>
        </ContextMenuSubTrigger>
        <ContextMenuSubContent className="w-48 bg-popover/95 backdrop-blur-xl border-border rounded-xl">
          <ContextMenuItem
            onClick={() => onReplyMsg?.(msg, "reply")}
            className="cursor-pointer text-xs py-1.5"
          >
            <span>
              <span className="underline underline-offset-2 font-bold">R</span>eply to Sender Only
            </span>
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => onReplyMsg?.(msg, "replyAll")}
            className="cursor-pointer text-xs py-1.5"
          >
            <span>
              Reply to <span className="underline underline-offset-2 font-bold">A</span>ll
            </span>
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>

      {/* Submenu: Forward and Redirect */}
      <ContextMenuSub>
        <ContextMenuSubTrigger className="cursor-pointer text-xs font-medium py-1.5 px-2">
          <span>
            <span className="underline underline-offset-2 font-bold">F</span>orward and Redirect
          </span>
        </ContextMenuSubTrigger>
        <ContextMenuSubContent className="w-44 bg-popover/95 backdrop-blur-xl border-border rounded-xl">
          <ContextMenuItem
            onClick={() => onReplyMsg?.(msg, "forward")}
            className="cursor-pointer text-xs py-1.5"
          >
            <span>
              <span className="underline underline-offset-2 font-bold">F</span>orward
            </span>
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => onReplyMsg?.(msg, "redirect")}
            className="cursor-pointer text-xs py-1.5"
          >
            <span>
              Redirec<span className="underline underline-offset-2 font-bold">t</span>
            </span>
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>

      <ContextMenuItem
        onClick={() => onEditAsNewMessage?.(msg)}
        className="cursor-pointer text-xs py-1.5"
      >
        <span>
          Edit As <span className="underline underline-offset-2 font-bold">N</span>ew Message
        </span>
      </ContextMenuItem>

      <ContextMenuSeparator />

      {/* Submenu: Move To */}
      <ContextMenuSub>
        <ContextMenuSubTrigger className="cursor-pointer text-xs font-medium py-1.5 px-2">
          <span>
            <span className="underline underline-offset-2 font-bold">M</span>ove To
          </span>
        </ContextMenuSubTrigger>
        <ContextMenuSubContent className="w-40 bg-popover/95 backdrop-blur-xl border-border rounded-xl">
          <ContextMenuItem
            onClick={() => onMoveTo?.(msg.id, "inbox")}
            className="cursor-pointer text-xs py-1.5"
          >
            Inbox
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => onMoveTo?.(msg.id, "archive")}
            className="cursor-pointer text-xs py-1.5"
          >
            Archive
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => onMoveTo?.(msg.id, "trash")}
            className="cursor-pointer text-xs py-1.5"
          >
            Trash
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => onMoveTo?.(msg.id, "junk")}
            className="cursor-pointer text-xs py-1.5"
          >
            Spam / Junk
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>

      {/* Submenu: Copy To */}
      <ContextMenuSub>
        <ContextMenuSubTrigger className="cursor-pointer text-xs font-medium py-1.5 px-2">
          <span>
            <span className="underline underline-offset-2 font-bold">C</span>opy To
          </span>
        </ContextMenuSubTrigger>
        <ContextMenuSubContent className="w-40 bg-popover/95 backdrop-blur-xl border-border rounded-xl">
          <ContextMenuItem
            onClick={() => onCopyTo?.(msg.id, "inbox")}
            className="cursor-pointer text-xs py-1.5"
          >
            Inbox
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => onCopyTo?.(msg.id, "archive")}
            className="cursor-pointer text-xs py-1.5"
          >
            Archive
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => onCopyTo?.(msg.id, "trash")}
            className="cursor-pointer text-xs py-1.5"
          >
            Trash
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => onCopyTo?.(msg.id, "junk")}
            className="cursor-pointer text-xs py-1.5"
          >
            Spam / Junk
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>
    </ContextMenuContent>
  );
}
