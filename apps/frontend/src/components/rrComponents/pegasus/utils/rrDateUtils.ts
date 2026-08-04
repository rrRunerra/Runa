/**
 * Formats an email date intelligently:
 * - "Today" / "Today, HH:mm" for messages from today
 * - "Yesterday" / "Yesterday, HH:mm" for messages from yesterday
 * - "MMM d" (or "MMM d, YYYY" for past years) for older messages
 */
export function formatSmartEmailDate(
  dateInput: string | Date | number,
  options?: { includeTime?: boolean; locale?: string },
): string {
  if (!dateInput) return "";

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const targetDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const timeString = d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  if (targetDate.getTime() === today.getTime()) {
    return options?.includeTime ? `Today, ${timeString}` : "Today";
  }

  if (targetDate.getTime() === yesterday.getTime()) {
    return options?.includeTime ? `Yesterday, ${timeString}` : "Yesterday";
  }

  const isSameYear = d.getFullYear() === now.getFullYear();
  if (options?.includeTime) {
    return d.toLocaleString([], {
      month: "short",
      day: "numeric",
      year: isSameYear ? undefined : "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  return d.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: isSameYear ? undefined : "numeric",
  });
}
