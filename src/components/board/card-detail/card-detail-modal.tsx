"use client";

// US2 (C-03, INV-007, FUNCTIONAL_SPEC.md §4.7): the card detail modal. plan.md ADR-14 —
// plain client-side dialog state, not an intercepting/parallel route. Two-column layout
// (single column below 700px, VI-003); dismissed by close button, scrim click, or Esc
// (all three handled by Radix Dialog's onOpenChange, which fires on both).
import { trpc } from "@/lib/trpc/client";
import type { LabelSummary, ListContent } from "@/lib/api/boards-client";
import { DUE_STATUS_STYLES, formatDueLabel } from "@/lib/cards/due-status";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CardTitleField } from "@/components/board/card-detail/card-title-field";
import { CardDescriptionPanel } from "@/components/board/card-detail/card-description-panel";
import { CardChecklistPanel } from "@/components/board/card-detail/card-checklist-panel";
import { CardAttachmentsPanel } from "@/components/board/card-detail/card-attachments-panel";
import { CardActivityFeed } from "@/components/board/card-detail/card-activity-feed";
import { CardAddToCardMenu } from "@/components/board/card-detail/card-add-to-card-menu";

interface CardDetailModalProps {
  cardPublicId: string;
  boardPublicId: string;
  boardLabels: LabelSummary[];
  boardLists: ListContent[];
  onClose: () => void;
  canMutate: boolean;
}

export function CardDetailModal({
  cardPublicId,
  boardPublicId,
  boardLabels,
  boardLists,
  onClose,
  canMutate,
}: CardDetailModalProps) {
  const detailQuery = trpc.cards.getDetail.useQuery({ cardPublicId });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="gap-0 p-0 sm:max-w-3xl" showCloseButton>
        {detailQuery.isLoading && (
          <div className="p-6 text-sm text-muted-foreground">Loading card…</div>
        )}
        {detailQuery.isError && (
          <div className="p-6 text-sm text-destructive">Couldn&apos;t load this card.</div>
        )}

        {detailQuery.data && (
          <div className="flex max-h-[85vh] flex-col overflow-y-auto">
            <header className="border-b border-border p-4 pr-12">
              <p className="mb-1 text-xs text-muted-foreground">
                in list <span className="font-medium">{detailQuery.data.card.listName}</span> · board{" "}
                <span className="font-medium">{detailQuery.data.card.boardName}</span>
                {detailQuery.data.card.dueStatus && detailQuery.data.card.dueAt && (
                  <span
                    className={cn(
                      "ml-2 rounded px-1.5 py-0.5 text-[0.7rem] font-medium",
                      DUE_STATUS_STYLES[detailQuery.data.card.dueStatus],
                    )}
                  >
                    {formatDueLabel(detailQuery.data.card.dueAt)}
                  </span>
                )}
              </p>
              <CardTitleField
                cardPublicId={cardPublicId}
                boardPublicId={boardPublicId}
                title={detailQuery.data.card.title}
                etag={detailQuery.data.etag}
                canMutate={canMutate}
              />
            </header>

            <div className="flex flex-col gap-6 p-4 sm:flex-row">
              <div className="flex min-w-0 flex-1 flex-col gap-6">
                {detailQuery.data.card.labels.length > 0 && (
                  <section>
                    <h4 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      Labels
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {detailQuery.data.card.labels.map((label) => (
                        <span
                          key={label.publicId}
                          className="rounded px-2 py-1 text-xs font-semibold text-white"
                          style={{ backgroundColor: label.color }}
                        >
                          {label.name}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                <CardDescriptionPanel
                  cardPublicId={cardPublicId}
                  boardPublicId={boardPublicId}
                  description={detailQuery.data.card.description}
                  etag={detailQuery.data.etag}
                  canMutate={canMutate}
                />

                <CardChecklistPanel
                  cardPublicId={cardPublicId}
                  boardPublicId={boardPublicId}
                  items={detailQuery.data.card.checklistItems}
                  canMutate={canMutate}
                />

                <CardAttachmentsPanel
                  cardPublicId={cardPublicId}
                  boardPublicId={boardPublicId}
                  attachments={detailQuery.data.card.attachments}
                  canMutate={canMutate}
                />

                <CardActivityFeed cardPublicId={cardPublicId} />
              </div>

              <div className="shrink-0 sm:w-44">
                <CardAddToCardMenu
                  card={detailQuery.data.card}
                  etag={detailQuery.data.etag}
                  boardPublicId={boardPublicId}
                  boardLabels={boardLabels}
                  boardLists={boardLists}
                  onClosed={onClose}
                  canMutate={canMutate}
                />
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
