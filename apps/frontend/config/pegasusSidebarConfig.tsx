"use client";

import {
  Archive,
  Edit,
  FileText,
  Inbox,
  Mail,
  Send,
  ShieldAlert,
  Trash,
} from "lucide-react";
import { RrComposeEmailModal } from "@/components/rrComponents/pegasus/rrComposeEmailModal";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { SidebarConfig } from "@/types/SidebarConfig";

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

export const getPegasusSidebarConfig = (
  emailAccounts: any[] = [],
  t: TranslateFn = (key) => key,
): SidebarConfig => {
  const defaultAccountId = emailAccounts[0]?.id;
  const totalUnread = emailAccounts.reduce(
    (sum, acc) => sum + (acc.unreadCount || 0),
    0,
  );

  return [
    {
      section: "#$Phone",
      items: [
        {
          label: t("sidebarCompose"),
          icon: <Edit className="h-4 w-4" />,
          subtitle: t("sidebarComposeSubtitle"),
          position: 1,
          component: (
            <RrComposeEmailModal accountId={defaultAccountId}>
              <SidebarMenuButton
                tooltip={t("sidebarCompose")}
                className="relative transition-colors duration-200 rounded-xl h-9.5 px-3 text-muted-foreground hover:text-foreground hover:bg-white/5 cursor-pointer"
              >
                <span className="flex items-center gap-2.5 w-full relative z-20">
                  <Edit className="h-4 w-4" />
                  <span className="truncate">{t("sidebarCompose")}</span>
                </span>
              </SidebarMenuButton>
            </RrComposeEmailModal>
          ),
        },
        {
          label: t("sidebarAllInboxes"),
          icon: <Inbox className="h-4 w-4" />,
          subtitle: t("sidebarAllInboxesSubtitle"),
          position: 3,
          href: "/pegasus/unified/inbox",
          preventRedirect: false,
        },
        {
          label: t("sidebarAttachments"),
          icon: <FileText className="h-4 w-4" />,
          subtitle: t("sidebarAttachmentsSubtitle"),
          position: 4,
          href: "/pegasus/attachments",
          preventRedirect: false,
        },
      ],
    },
    {
      section: "",
      items: [
        {
          label: t("sidebarCompose"),
          icon: <Edit className="h-4 w-4" />,
          subtitle: t("sidebarComposeSubtitle"),
          position: 1,
          component: (
            <RrComposeEmailModal accountId={defaultAccountId}>
              <SidebarMenuButton
                tooltip={t("sidebarCompose")}
                className="relative transition-colors duration-200 rounded-xl h-9.5 px-3 text-muted-foreground hover:text-foreground hover:bg-white/5 cursor-pointer"
              >
                <span className="flex items-center gap-2.5 w-full relative z-20">
                  <Edit className="h-4 w-4" />
                  <span className="truncate">{t("sidebarCompose")}</span>
                </span>
              </SidebarMenuButton>
            </RrComposeEmailModal>
          ),
        },
      ],
    },
    {
      section: t("sidebarUnified"),
      dataKey: "Unified",
      items: [
        {
          dataKey: "Unified Inbox",
          label: t("sidebarUnifiedInbox"),
          href: "/pegasus/unified/inbox",
          preventRedirect: true,
          icon: <Inbox className="h-4 w-4" style={{ color: "#3b82f6" }} />,
          subtitle: t("sidebarAllInboxesSubtitle"),
          badge: totalUnread > 0 ? totalUnread.toString() : undefined,
        },
        {
          dataKey: "Attachments",
          label: t("sidebarAttachments"),
          href: "/pegasus/attachments",
          preventRedirect: true,
          icon: <FileText className="h-4 w-4" style={{ color: "#10b981" }} />,
          subtitle: t("sidebarAttachmentsSubtitle"),
        },
      ],
    },
    {
      section: t("sidebarAccounts"),
      dataKey: "Accounts",
      items: emailAccounts.map((account) => {
        return {
          label: account.accountName,
          href: `/pegasus/account/${account.id}`,
          preventRedirect: true,
          icon: <Mail className="h-4 w-4" style={{ color: account.color }} />,
          subtitle: account.emailAddress,
          children: [
            {
              dataKey: "Inbox",
              label: t("sidebarInbox"),
              href: `/pegasus/account/${account.id}/inbox`,
              preventRedirect: true,
              icon: (
                <Inbox className="h-4 w-4" style={{ color: account.color }} />
              ),
              subtitle: t("sidebarInboxSubtitle"),
              badge: account.unreadCount > 0 ? account.unreadCount.toString() : undefined,
            },
            {
              dataKey: "Drafts",
              label: t("sidebarDrafts"),
              href: `/pegasus/account/${account.id}/drafts`,
              preventRedirect: true,
              icon: (
                <FileText
                  className="h-4 w-4"
                  style={{ color: account.color }}
                />
              ),
              subtitle: t("sidebarDrafts"),
            },
            {
              dataKey: "Sent",
              label: t("sidebarSent"),
              href: `/pegasus/account/${account.id}/sent`,
              preventRedirect: true,
              icon: (
                <Send className="h-4 w-4" style={{ color: account.color }} />
              ),
              subtitle: t("sidebarSentSubtitle"),
            },
            {
              dataKey: "Outbox",
              label: t("sidebarOutbox"),
              href: `/pegasus/account/${account.id}/outbox`,
              preventRedirect: true,
              icon: (
                <Send className="h-4 w-4" style={{ color: account.color }} />
              ),
              subtitle: t("sidebarOutbox"),
            },
            {
              dataKey: "Archive",
              label: t("sidebarArchive"),
              href: `/pegasus/account/${account.id}/archive`,
              preventRedirect: true,
              icon: (
                <Archive className="h-4 w-4" style={{ color: account.color }} />
              ),
              subtitle: t("sidebarArchive"),
            },
            {
              dataKey: "Junk",
              label: t("sidebarJunk"),
              href: `/pegasus/account/${account.id}/junk`,
              preventRedirect: true,
              icon: (
                <ShieldAlert
                  className="h-4 w-4"
                  style={{ color: account.color }}
                />
              ),
              subtitle: t("sidebarJunkSubtitle"),
            },
            {
              dataKey: "Trash",
              label: t("sidebarTrash"),
              href: `/pegasus/account/${account.id}/trash`,
              preventRedirect: true,
              icon: (
                <Trash className="h-4 w-4" style={{ color: account.color }} />
              ),
              subtitle: t("sidebarTrash"),
            },
          ],
        };
      }),
    },
  ];
};
