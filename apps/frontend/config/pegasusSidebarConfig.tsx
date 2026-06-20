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
import type { NavbarConfig } from "@/components/Providers/NavigationProvider";

export const getPegasusSidebarConfig = (
  session: any,
  emailAccounts: any[] = [],
): NavbarConfig => {
  const configs: NavbarConfig = [
    {
      section: "Phone",
      items: [
        {
          label: "Compose",
          href: "/pegasus/compose",
          icon: <Edit className="h-4 w-4" />,
          subtitle: "Compose mail",
          position: 1,
        },
      ],
    },
    {
      section: "",
      items: [
        {
          label: "Compose Mail",
          href: "/pegasus/compose",
          icon: <Edit className="h-4 w-4" />,
          subtitle: "Compose a new email",
        },
      ],
    },
    {
      section: "Accounts",
      items: emailAccounts.map((account) => {
        return {
          label: account.accountName,
          href: `/pegasus/account/${account.id}`,
          icon: <Mail className="h-4 w-4" style={{ color: account.color }} />,
          subtitle: account.emailAddress,
          children: [
            {
              label: "Inbox",
              href: `/pegasus/account/${account.id}/inbox`,
              icon: (
                <Inbox className="h-4 w-4" style={{ color: account.color }} />
              ),
              subtitle: "Incoming mail",
            },
            {
              label: "Drafts",
              href: `/pegasus/account/${account.id}/drafts`,
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
              icon: (
                <Send className="h-4 w-4" style={{ color: account.color }} />
              ),
              subtitle: "Sent mail",
            },
            {
              label: "Outbox",
              href: `/pegasus/account/${account.id}/outbox`,
              icon: (
                <Send className="h-4 w-4" style={{ color: account.color }} />
              ),
              subtitle: "Outbox",
            },
            {
              label: "Archive",
              href: `/pegasus/account/${account.id}/archive`,
              icon: (
                <Archive className="h-4 w-4" style={{ color: account.color }} />
              ),
              subtitle: "Archive",
            },
            {
              label: "Junk",
              href: `/pegasus/account/${account.id}/junk`,
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

  return configs;
};
