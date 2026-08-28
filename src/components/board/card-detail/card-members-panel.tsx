"use client";

// US4 (C-07): multi-select from current board members. Assigning someone not yet a
// board member adds them to the board (invariant 5's sanctioned side effect, enforced
// server-side) — this UI doesn't distinguish that case, it just shows the result after
// invalidating both queries.
import { isTRPCClientError } from "@trpc/client";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import type { MemberAvatar } from "@/lib/api/boards-client";
import { Checkbox } from "@/components/ui/checkbox";

interface CardMembersPanelProps {
  cardPublicId: string;
  boardPublicId: string;
  assignedMembers: MemberAvatar[];
}

function errorMessage(error: unknown): string {
  return isTRPCClientError(error) ? error.message : "Something went wrong.";
}

export function CardMembersPanel({ cardPublicId, boardPublicId, assignedMembers }: CardMembersPanelProps) {
  const utils = trpc.useUtils();
  const membersQuery = trpc.boardMembers.list.useQuery({ boardPublicId });

  const invalidate = () => {
    utils.cards.getDetail.invalidate({ cardPublicId });
    utils.boards.getContent.invalidate({ boardPublicId });
    utils.boardMembers.list.invalidate({ boardPublicId });
  };

  const assignMutation = trpc.cards.assignMember.useMutation({ onSuccess: invalidate });
  const removeMutation = trpc.cards.removeMember.useMutation({ onSuccess: invalidate });

  const assignedIds = new Set(assignedMembers.map((member) => member.publicId));

  const onToggle = async (userPublicId: string, displayName: string, checked: boolean) => {
    try {
      if (checked) {
        await assignMutation.mutateAsync({ cardPublicId, userPublicId });
        toast.success(`Added ${displayName} to the card`);
      } else {
        await removeMutation.mutateAsync({ cardPublicId, userPublicId });
        toast.success(`Removed ${displayName} from the card`);
      }
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  if (membersQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading members…</p>;
  }
  if (membersQuery.isError || !membersQuery.data) {
    return <p className="text-sm text-destructive">Couldn&apos;t load board members.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {membersQuery.data.members.map((member) => (
        <label
          key={member.user.publicId}
          className="flex items-center gap-2 rounded px-1 py-1 hover:bg-muted/60"
        >
          <Checkbox
            checked={assignedIds.has(member.user.publicId)}
            disabled={assignMutation.isPending || removeMutation.isPending}
            onCheckedChange={(checked) =>
              onToggle(member.user.publicId, member.user.displayName, checked === true)
            }
          />
          <span
            className="flex size-6 items-center justify-center rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: member.user.avatarColor }}
          >
            {member.user.initials}
          </span>
          <span className="flex-1 text-sm">{member.user.displayName}</span>
        </label>
      ))}
    </div>
  );
}
