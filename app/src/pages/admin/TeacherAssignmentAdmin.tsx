import { useState } from 'react';
import { toast } from 'sonner';
import { trpc } from '@/providers/trpc';
import { Button } from '@/components/ui/button';
import { Loader2, UserPlus, UserMinus } from 'lucide-react';

export default function TeacherAssignmentAdmin() {
  const utils = trpc.useUtils();
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const { data: groupsData, isLoading: groupsLoading } =
    trpc.teacherAssignment.listGroups.useQuery();

  const { data: eligibleData, isLoading: eligibleLoading } =
    trpc.teacherAssignment.listEligibleUsers.useQuery(
      { groupId: selectedGroupId! },
      { enabled: selectedGroupId !== null }
    );

  const assignMutation = trpc.teacherAssignment.assign.useMutation({
    onSuccess: () => {
      toast.success('Teacher assigned successfully!');
      utils.teacherAssignment.listGroups.invalidate();
      setSelectedGroupId(null);
      setSelectedUserId('');
    },
    onError: (err) => toast.error(err.message),
  });

  const removeMutation = trpc.teacherAssignment.remove.useMutation({
    onSuccess: () => {
      toast.success('Teacher removed successfully!');
      utils.teacherAssignment.listGroups.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  if (groupsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );
  }

  const groups = groupsData ?? [];

  return (
    <div className="space-y-4 max-w-3xl">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Assign or remove Sunday School teachers for each active group.
      </p>

      {groups.length === 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 py-4 text-center">
          No active groups found.
        </p>
      )}

      {groups.map((group) => {
        const isExpanded = selectedGroupId === group.groupId;

        return (
          <div
            key={group.groupId}
            className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 bg-white dark:bg-[#0c0c0f] space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                  {group.groupName}
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {group.communityName}
                </p>
                {group.currentTeacher ? (
                  <p className="text-xs text-emerald-600 mt-0.5">
                    Teacher: {group.currentTeacher.name || group.currentTeacher.email}
                  </p>
                ) : (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 italic">
                    No teacher assigned
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {group.currentTeacher && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      removeMutation.mutate({
                        groupId: group.groupId,
                        userId: group.currentTeacher!.userId,
                      })
                    }
                    disabled={removeMutation.isPending}
                    title="Remove teacher"
                  >
                    {removeMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <UserMinus className="w-3.5 h-3.5" />
                    )}
                  </Button>
                )}

                <Button
                  size="sm"
                  onClick={() => {
                    if (isExpanded) {
                      setSelectedGroupId(null);
                      setSelectedUserId('');
                    } else {
                      setSelectedGroupId(group.groupId);
                      setSelectedUserId('');
                    }
                  }}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950"
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1" />
                  {isExpanded ? 'Cancel' : 'Assign Teacher'}
                </Button>
              </div>
            </div>

            {isExpanded && (
              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                {eligibleLoading ? (
                  <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <Loader2 className="w-4 h-4 animate-spin" /> Loading eligible users...
                  </div>
                ) : !eligibleData || eligibleData.length === 0 ? (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    No eligible users found in this community.
                  </p>
                ) : (
                  <div className="flex items-center gap-3">
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm px-3 py-2 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">Select a user...</option>
                      {eligibleData.map((u) => (
                        <option key={u.userId} value={u.userId}>
                          {u.name || u.email} {u.name && u.email ? `(${u.email})` : ''}
                        </option>
                      ))}
                    </select>

                    <Button
                      size="sm"
                      onClick={() => {
                        if (!selectedUserId) return;
                        assignMutation.mutate({
                          groupId: group.groupId,
                          userId: selectedUserId,
                        });
                      }}
                      disabled={!selectedUserId || assignMutation.isPending}
                      className="bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600 text-white"
                    >
                      {assignMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        'Confirm'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
