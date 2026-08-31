"use client";

// US1 (FR-001–FR-004, FR-008, FR-009): attachments panel — upload one or more files, list
// each with filename/size/uploader, open/download. Upload and download bypass tRPC
// (research.md R-2, plan.md ADR-41) via dedicated Route Handlers; this component still reads
// the list from the existing card detail query and invalidates it after a successful upload,
// matching every other panel's reconcile-with-the-server-response pattern rather than
// inserting an optimistic row itself.
import { useRef, useState } from "react";
import { isTRPCClientError } from "@trpc/client";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import type { AttachmentDetail } from "@/lib/api/cards-client";
import { Button } from "@/components/ui/button";
import { Paperclip, X } from "lucide-react";

interface CardAttachmentsPanelProps {
  cardPublicId: string;
  boardPublicId: string;
  attachments: AttachmentDetail[];
  canMutate: boolean;
  isBoardAdmin: boolean;
  currentUserPublicId: string | null;
}

interface PendingUpload {
  key: string;
  fileName: string;
}

// spec.md Assumptions / plan.md Constraints — mirrors CardService's server-side limits
// exactly (frontend-security.md §6: "restrict accepted file types," "show file size
// limits," "validate before upload"). UX only; the backend re-validates authoritatively.
const MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024;
const BLOCKED_ATTACHMENT_EXTENSIONS = [".exe", ".bat", ".sh", ".cmd", ".msi"];

function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function findUploadRejectionReason(file: File): string | null {
  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return `"${file.name}" is over the 25 MB limit.`;
  }
  const lowerName = file.name.toLowerCase();
  if (BLOCKED_ATTACHMENT_EXTENSIONS.some((extension) => lowerName.endsWith(extension))) {
    return `"${file.name}" is a file type that isn't allowed.`;
  }
  return null;
}

function errorMessage(error: unknown): string {
  return isTRPCClientError(error) ? error.message : "Something went wrong.";
}

export function CardAttachmentsPanel({
  cardPublicId,
  boardPublicId,
  attachments,
  canMutate,
  isBoardAdmin,
  currentUserPublicId,
}: CardAttachmentsPanelProps) {
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();
  const invalidate = () => {
    utils.cards.getDetail.invalidate({ cardPublicId });
    utils.boards.getContent.invalidate({ boardPublicId });
  };

  // contracts/attachments-api.md: removal is uploader-OR-board-admin, distinct from (and
  // narrower than) canMutate — UX gating only, the backend re-resolves this server-side
  // (invariant 5).
  const removeMutation = trpc.cards.removeAttachment.useMutation({ onSuccess: invalidate });

  const onRemove = async (attachment: AttachmentDetail) => {
    try {
      await removeMutation.mutateAsync({ attachmentPublicId: attachment.publicId });
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const uploadFile = async (file: File) => {
    const rejectionReason = findUploadRejectionReason(file);
    if (rejectionReason) {
      toast.error(rejectionReason);
      return;
    }

    const key = `${file.name}-${file.size}-${Date.now()}`;
    setPending((previous) => [...previous, { key, fileName: file.name }]);

    try {
      const formData = new FormData();
      formData.set("cardPublicId", cardPublicId);
      formData.set("file", file);

      const response = await fetch("/api/attachments", { method: "POST", body: formData });
      if (!response.ok) {
        const problem = (await response.json().catch(() => null)) as
          | { error?: string; errors?: Record<string, string[]> }
          | null;
        const message = problem?.errors ? Object.values(problem.errors)[0]?.[0] : problem?.error;
        toast.error(message ?? "Couldn't attach this file.");
        return;
      }

      await Promise.all([
        utils.cards.getDetail.invalidate({ cardPublicId }),
        utils.boards.getContent.invalidate({ boardPublicId }),
      ]);
    } catch {
      toast.error("Couldn't attach this file.");
    } finally {
      setPending((previous) => previous.filter((item) => item.key !== key));
    }
  };

  const onFilesSelected = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => uploadFile(file));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Attachments</h4>
        {canMutate && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(event) => onFilesSelected(event.target.files)}
            />
            <Button type="button" variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Paperclip className="size-3.5" />
              Attach
            </Button>
          </>
        )}
      </div>

      {canMutate && (
        <p className="mb-2 text-xs text-muted-foreground">Up to 25 MB per file. Executable files aren&apos;t allowed.</p>
      )}

      {attachments.length === 0 && pending.length === 0 && (
        <p className="text-sm text-muted-foreground">No attachments yet.</p>
      )}

      <ul className="flex flex-col gap-1">
        {attachments.map((attachment) => {
          const canRemove = isBoardAdmin || attachment.uploadedBy.publicId === currentUserPublicId;
          return (
            <li
              key={attachment.publicId}
              className="group flex items-center gap-2 rounded px-1 py-1 hover:bg-muted/60"
            >
              <span
                className="flex size-6 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-medium text-white"
                style={{ backgroundColor: attachment.uploadedBy.avatarColor }}
                title={attachment.uploadedBy.displayName}
              >
                {attachment.uploadedBy.initials}
              </span>
              <div className="min-w-0 flex-1">
                <a
                  href={`/api/attachments/${attachment.publicId}`}
                  className="block truncate text-sm font-medium underline-offset-2 hover:underline"
                >
                  {attachment.fileName}
                </a>
                <p className="truncate text-xs text-muted-foreground">
                  {formatFileSize(attachment.sizeBytes)} · {attachment.uploadedBy.displayName}
                </p>
              </div>
              {canRemove && (
                <button
                  type="button"
                  aria-label="Remove attachment"
                  disabled={removeMutation.isPending}
                  onClick={() => onRemove(attachment)}
                  className="rounded p-1 text-muted-foreground opacity-0 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </li>
          );
        })}

        {pending.map((upload) => (
          <li key={upload.key} className="flex items-center gap-2 rounded px-1 py-1 text-muted-foreground">
            <span className="size-6 shrink-0 animate-pulse rounded-full bg-muted" />
            <span className="min-w-0 flex-1 truncate text-sm">{upload.fileName}</span>
            <span className="shrink-0 text-xs italic">Uploading…</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
