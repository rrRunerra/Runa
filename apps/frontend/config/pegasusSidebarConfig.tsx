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
import { ComposeEmailModal } from "@/components/pegasus/ComposeEmailModal";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { SidebarConfig } from "@/types/SidebarConfig";

export const getPegasusSidebarConfig = (
  emailAccounts: any[] = [],
): SidebarConfig => {
  const defaultAccountId = emailAccounts[0]?.id;

  return [
    {
      section: "#$Phone",
      items: [
        {
          label: "Compose",
          icon: <Edit className="h-4 w-4" />,
          subtitle: "Compose mail",
          position: 1,
          component: (
            <ComposeEmailModal accountId={defaultAccountId}>
              <SidebarMenuButton
                tooltip="Compose"
                className="relative transition-colors duration-200 rounded-xl h-9.5 px-3 text-muted-foreground hover:text-foreground hover:bg-white/5 cursor-pointer"
              >
                <span className="flex items-center gap-2.5 w-full relative z-20">
                  <Edit className="h-4 w-4" />
                  <span className="truncate">Compose</span>
                </span>
              </SidebarMenuButton>
            </ComposeEmailModal>
          ),
        },
      ],
    },
    {
      section: "",
      items: [
        {
          label: "Compose",
          icon: <Edit className="h-4 w-4" />,
          subtitle: "Compose mail",
          position: 1,
          component: (
            <ComposeEmailModal accountId={defaultAccountId}>
              <SidebarMenuButton
                tooltip="Compose"
                className="relative transition-colors duration-200 rounded-xl h-9.5 px-3 text-muted-foreground hover:text-foreground hover:bg-white/5 cursor-pointer"
              >
                <span className="flex items-center gap-2.5 w-full relative z-20">
                  <Edit className="h-4 w-4" />
                  <span className="truncate">Compose</span>
                </span>
              </SidebarMenuButton>
            </ComposeEmailModal>
          ),
        },
      ],
    },
    {
      section: "Accounts",
      items: emailAccounts.map((account) => {
        return {
          label: account.accountName,
          href: `/pegasus/account/${account.id}`,
          preventRedirect: true,
          icon: <Mail className="h-4 w-4" style={{ color: account.color }} />,
          subtitle: account.emailAddress,
          children: [
            {
              label: "Inbox",
              href: `/pegasus/account/${account.id}/inbox`,
              preventRedirect: true,
              icon: (
                <Inbox className="h-4 w-4" style={{ color: account.color }} />
              ),
              subtitle: "Incoming mail",
            },
            {
              label: "Drafts",
              href: `/pegasus/account/${account.id}/drafts`,
              preventRedirect: true,
              icon: (
                <FileText
                  className="h-4 w-4"
                  style={{ color: account.color }}
                />
              ),
              subtitle: "Drafts",
            },
            {
              label: "Sent",
              href: `/pegasus/account/${account.id}/sent`,
              preventRedirect: true,
              icon: (
                <Send className="h-4 w-4" style={{ color: account.color }} />
              ),
              subtitle: "Sent mail",
            },
            {
              label: "Outbox",
              href: `/pegasus/account/${account.id}/outbox`,
              preventRedirect: true,
              icon: (
                <Send className="h-4 w-4" style={{ color: account.color }} />
              ),
              subtitle: "Outbox",
            },
            {
              label: "Archive",
              href: `/pegasus/account/${account.id}/archive`,
              preventRedirect: true,
              icon: (
                <Archive className="h-4 w-4" style={{ color: account.color }} />
              ),
              subtitle: "Archive",
            },
            {
              label: "Junk",
              href: `/pegasus/account/${account.id}/junk`,
              preventRedirect: true,
              icon: (
                <ShieldAlert
                  className="h-4 w-4"
                  style={{ color: account.color }}
                />
              ),
              subtitle: "Spam",
            },
            {
              label: "Trash",
              href: `/pegasus/account/${account.id}/trash`,
              preventRedirect: true,
              icon: (
                <Trash className="h-4 w-4" style={{ color: account.color }} />
              ),
              subtitle: "Trash",
            },
          ],
        };
      }),
    },
  ];
};
