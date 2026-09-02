import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { vcFirmApi } from './api'
import { useAuth } from '@/features/auth/useAuth'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Loading } from '@/components/Loading'
import { VCRole } from './types'

interface MembersPageProps {
  firmId: string
}

export const MembersPage = ({ firmId }: MembersPageProps) => {
  const { user } = useAuth()
  const [showAddMember, setShowAddMember] = useState(false)
  const [newMemberUserId, setNewMemberUserId] = useState('')
  const queryClient = useQueryClient()

  const { data: members, isLoading } = useQuery({
    queryKey: ['vcFirmMembers', firmId],
    queryFn: () => vcFirmApi.getFirmMembers(firmId),
  })

  const addMemberMutation = useMutation({
    mutationFn: (userId: string) =>
      vcFirmApi.addMember(firmId, { userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcFirmMembers', firmId] })
      setNewMemberUserId('')
      setShowAddMember(false)
    },
  })

  const removeMemberMutation = useMutation({
    mutationFn: (memberId: string) =>
      vcFirmApi.removeMember(firmId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vcFirmMembers', firmId] })
    },
  })

  const roleVariants: Record<VCRole, 'default' | 'secondary' | 'success' | 'warning' | 'danger'> = {
    [VCRole.OWNER]: 'success',
    [VCRole.PORTFOLIO_MANAGER]: 'warning',
    [VCRole.STAFF]: 'secondary',
  }

  const isCurrentUserOwner =
    members?.some((m) => m.userId === user?.id && m.role === VCRole.OWNER) || false

  if (isLoading) {
    return <Loading />
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Team Members</CardTitle>
        {isCurrentUserOwner && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddMember(!showAddMember)}
          >
            {showAddMember ? 'Cancel' : 'Add Member'}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {showAddMember && isCurrentUserOwner && (
          <div className="p-4 bg-gray-50 rounded-lg space-y-3">
            <Input
              type="text"
              placeholder="User ID or email"
              value={newMemberUserId}
              onChange={(e) => setNewMemberUserId(e.target.value)}
            />
            <Button
              variant="primary"
              size="sm"
              onClick={() => addMemberMutation.mutate(newMemberUserId)}
              disabled={!newMemberUserId || addMemberMutation.isPending}
            >
              {addMemberMutation.isPending ? 'Adding...' : 'Add'}
            </Button>
            {addMemberMutation.isError && (
              <p className="text-sm text-red-600">Failed to add member</p>
            )}
          </div>
        )}

        {members && members.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200">
                <tr>
                  <th className="text-left py-2 font-semibold">Email</th>
                  <th className="text-left py-2 font-semibold">Role</th>
                  <th className="text-left py-2 font-semibold">Joined</th>
                  {isCurrentUserOwner && <th className="text-left py-2 font-semibold">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3">{member.userEmail}</td>
                    <td className="py-3">
                      <Badge variant={roleVariants[member.role]}>
                        {member.role}
                      </Badge>
                    </td>
                    <td className="py-3 text-gray-600">
                      {new Date(member.joinedAt).toLocaleDateString()}
                    </td>
                    {isCurrentUserOwner && (
                      <td className="py-3">
                        {member.role !== VCRole.OWNER && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeMemberMutation.mutate(member.id)}
                            disabled={removeMemberMutation.isPending}
                          >
                            Remove
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-600">No team members yet</p>
        )}
      </CardContent>
    </Card>
  )
}
