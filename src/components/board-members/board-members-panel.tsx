"use client";

// T051/T052: member list + pending invitations + invite form. Not a
// components/tables/base data table (frontend-tables.md targets paginated/searchable
// tabular screens) — a single board's membership is a short, unpaginated list, so this
// stays a plain panel, matching this task's own file path/naming.
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { isTRPCClientError } from "@trpc/client";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import {
  boardRoleSchema,
  inviteFormSchema,
  type InviteFormValues,
} from "@/lib/board-members/schemas";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BoardMembersPanelProps {
  boardPublicId: string;
}

function errorMessage(error: unknown): string {
  return isTRPCClientError(error) ? error.message : "Something went wrong.";
}

export function BoardMembersPanel({ boardPublicId }: BoardMembersPanelProps) {
  const { data: session } = useSession();
  const utils = trpc.useUtils();
  const membersQuery = trpc.boardMembers.list.useQuery({ boardPublicId });

  const invalidate = () => utils.boardMembers.list.invalidate({ boardPublicId });
  const inviteMutation = trpc.boardMembers.invite.useMutation({ onSuccess: invalidate });
  const revokeMutation = trpc.boardMembers.revokeInvitation.useMutation({ onSuccess: invalidate });
  const removeMutation = trpc.boardMembers.removeMember.useMutation({ onSuccess: invalidate });

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: { email: "", role: "BoardMember" },
  });

  if (membersQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading members…</p>;
  }

  if (membersQuery.isError || !membersQuery.data) {
    return (
      <p className="text-sm text-destructive">
        Couldn&apos;t load board members. Try refreshing the page.
      </p>
    );
  }

  const { members, pendingInvitations } = membersQuery.data;
  // T052: gate invite/remove controls to the viewer's own effective role — found by
  // matching the session's publicId against the members list itself (the contract has
  // no separate "your role" field). The backend remains authoritative regardless of
  // what this hides (invariant 5) — this is UX only (frontend-security.md §3).
  const viewerEntry = members.find((member) => member.user.publicId === session?.user?.publicId);
  const isAdmin = viewerEntry?.role === "BoardAdmin" || viewerEntry?.isWorkspaceOwner === true;

  const onInvite = async (values: InviteFormValues) => {
    try {
      await inviteMutation.mutateAsync({ boardPublicId, ...values });
      toast.success("Invitation sent");
      form.reset();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const onRevoke = async (invitationPublicId: string) => {
    try {
      await revokeMutation.mutateAsync({ invitationPublicId });
      toast.success("Invitation revoked");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const onRemove = async (userPublicId: string) => {
    try {
      await removeMutation.mutateAsync({ boardPublicId, userPublicId });
      toast.success("Member removed");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>Everyone with access to this board.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border">
            {members.map((member) => (
              <li key={member.user.publicId} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <span
                    className="flex size-8 items-center justify-center rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: member.user.avatarColor }}
                  >
                    {member.user.initials}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{member.user.displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      {member.role}
                      {member.isWorkspaceOwner ? " · Workspace owner" : ""}
                    </p>
                  </div>
                </div>
                {isAdmin && !member.isWorkspaceOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={removeMutation.isPending}
                    onClick={() => onRemove(member.user.publicId)}
                  >
                    Remove
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending invitations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {pendingInvitations.map((invitation) => (
                <li
                  key={invitation.publicId}
                  className="flex items-center justify-between py-2"
                >
                  <div>
                    <p className="text-sm font-medium">{invitation.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {invitation.role} · invited by {invitation.invitedBy}
                    </p>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={revokeMutation.isPending}
                      onClick={() => onRevoke(invitation.publicId)}
                    >
                      Revoke
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Invite someone</CardTitle>
            <CardDescription>
              They&apos;ll get access immediately if they already have an account —
              otherwise the invitation takes effect the moment they sign up.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onInvite)}
                className="flex flex-col gap-4 sm:flex-row sm:items-end"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>
                        Email <span className="pl-1 font-bold text-red-500">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="teammate@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {boardRoleSchema.options.map((role) => (
                            <SelectItem key={role} value={role}>
                              {role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  Invite
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
