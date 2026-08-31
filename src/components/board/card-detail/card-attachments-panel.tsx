"use client";

// US1 (FR-001–FR-004, FR-008, FR-009): attachments panel — upload one or more files, list
// each with filename/size/uploader, open/download. Upload and download bypass tRPC
// (research.md R-2, plan.md ADR-41) via dedicated Route Handlers; this component still reads
// the list from the existing card detail query and invalidates it after a successful upload,
// matching every other panel's reconcile-with-the-server-response pattern rather than
// inserting an optimistic row itself.
import { useRef, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import type { AttachmentDetail } from "@/lib/api/cards-client";
import { Button } from "@/components/ui/button";
import { Paperclip } from "lucide-react";

interface CardAttachmentsPanelProps {
  cardPublicId: string;
  boardPublicId: string;
  attachments: AttachmentDetail[];
  canMutate: boolean;
}

interface PendingUpload {
  key: string;
  fileName: string;
}

function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CardAttachmentsPanel({
  cardPublicId,
  boardPublicId,
  attachments,
  canMutate,
}: CardAttachmentsPanelProps) {
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const uploadFile = async (file: File) => {
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

      {attachments.length === 0 && pending.length === 0 && (
        <p className="text-sm text-muted-foreground">No attachments yet.</p>
      )}

      <ul className="flex flex-col gap-1">
        {attachments.map((attachment) => (
          <li key={attachment.publicId} className="flex items-center gap-2 rounded px-1 py-1 hover:bg-muted/60">
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
          </li>
        ))}

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
