"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import {
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function MonocerosSubmissionsPage(): React.JSX.Element {
  const { data: session, status } = useSession();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    data: submissions = [],
    isLoading,
    mutate,
  } = useSWR<any[]>(
    status === "authenticated"
      ? `${process.env.NEXT_PUBLIC_API_URL}/aquila/submissions`
      : null,
    fetcher
  );

  const handleApprove = async (id: string) => {
    if (!session?.accessToken) return;
    setIsProcessing(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/aquila/submissions/${id}/approve`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        }
      );
      if (!res.ok) throw new Error("Failed to approve submission");

      toast.success("Submission approved and applied to database!");
      mutate();
    } catch (err: any) {
      toast.error(err.message || "Approval failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectingId || !session?.accessToken) return;
    setIsProcessing(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/aquila/submissions/${rejectingId}/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({ rejectionReason }),
        }
      );
      if (!res.ok) throw new Error("Failed to reject submission");

      toast.success("Submission rejected.");
      setRejectingId(null);
      setRejectionReason("");
      mutate();
    } catch (err: any) {
      toast.error(err.message || "Rejection failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/monoceros">
            <Button variant="outline" size="icon" className="rounded-xl">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="size-6 text-primary" />
              Pending Media Submissions
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Review user requests to add or edit media entries in Aquila.
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="text-xs font-semibold px-3 py-1 rounded-lg">
          {submissions.length} Pending
        </Badge>
      </div>

      {/* Submissions List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner className="size-8 text-primary" />
        </div>
      ) : submissions.length === 0 ? (
        <div className="border border-dashed border-border/60 rounded-2xl p-12 text-center bg-card/30">
          <Clock className="size-10 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="text-base font-semibold">No pending submissions</h3>
          <p className="text-xs text-muted-foreground mt-1">
            All user media additions and edits have been reviewed.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {submissions.map((item) => {
            const data = item.data || {};
            const title =
              data.titleEnglish ||
              data.titleRomaji ||
              data.titleNative ||
              data.titleString ||
              "Untitled Entry";

            return (
              <div
                key={item.id}
                className="border border-border/50 rounded-2xl p-5 bg-card/40 backdrop-blur-xl shadow-xs space-y-4"
              >
                {/* Meta Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/30 pb-3">
                  <div className="flex items-center gap-2">
                    <Badge className="capitalize font-semibold text-xs">{item.mediaType}</Badge>
                    <Badge variant={item.actionType === "CREATE" ? "default" : "outline"} className="text-[11px]">
                      {item.actionType}
                    </Badge>
                    {item.mediaId && (
                      <span className="text-xs text-muted-foreground font-mono">
                        (Media ID: #{item.mediaId})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <UserIcon className="size-3.5" />
                    <span>{item.submittedBy?.displayName || item.submittedBy?.username || "Unknown"}</span>
                    <span>•</span>
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Content preview */}
                <div className="flex flex-col md:flex-row gap-4 items-start">
                  {data.coverImage && (
                    <img
                      src={data.coverImage}
                      alt={title}
                      className="w-20 h-28 object-cover rounded-xl border border-border/40 shrink-0"
                    />
                  )}
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <h3 className="text-base font-bold text-foreground truncate">{title}</h3>
                    {data.description && (
                      <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                        {data.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2 text-[11px] pt-1">
                      {data.format && <Badge variant="secondary">Format: {data.format}</Badge>}
                      {data.status && <Badge variant="secondary">Status: {data.status}</Badge>}
                      {data.episodes && <Badge variant="secondary">{data.episodes} Ep</Badge>}
                      {data.chapters && <Badge variant="secondary">{data.chapters} Ch</Badge>}
                      {Array.isArray(data.genres) && data.genres.map((g: string) => (
                        <Badge key={g} variant="outline" className="text-[10px]">{g}</Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/30">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRejectingId(item.id)}
                    disabled={isProcessing}
                    className="h-8 gap-1.5 text-xs text-destructive hover:bg-destructive/10"
                  >
                    <XCircle className="size-3.5" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApprove(item.id)}
                    disabled={isProcessing}
                    className="h-8 gap-1.5 text-xs font-semibold"
                  >
                    <CheckCircle2 className="size-3.5" />
                    Approve & Apply
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Reason Dialog */}
      <Dialog open={!!rejectingId} onOpenChange={(open) => !open && setRejectingId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Submission</DialogTitle>
            <DialogDescription>
              Provide an optional note explaining why this submission is being rejected.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label className="text-xs font-semibold">Rejection Reason</Label>
            <Textarea
              rows={3}
              placeholder="e.g. Duplicate entry or inaccurate metadata..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setRejectingId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleReject} disabled={isProcessing}>
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
