import { fetchApi } from '@/lib/api-client'
import {
  VCFirmDTO,
  VCMemberDTO,
  CreateVCFirmRequest,
  UpdateVCFirmRequest,
  AddMemberRequest,
  VCRole,
} from './types'

export const vcFirmApi = {
  createFirm: (request: CreateVCFirmRequest) =>
    fetchApi<VCFirmDTO>('/api/vc/firms', {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  getFirm: (id: string) =>
    fetchApi<VCFirmDTO>(`/api/vc/firms/${id}`),

  updateFirm: (id: string, request: UpdateVCFirmRequest) =>
    fetchApi<VCFirmDTO>(`/api/vc/firms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    }),

  getFirmMembers: (id: string) =>
    fetchApi<VCMemberDTO[]>(`/api/vc/firms/${id}/members`),

  addMember: (firmId: string, request: AddMemberRequest) =>
    fetchApi<VCMemberDTO>(`/api/vc/firms/${firmId}/members`, {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  changeMemberRole: (firmId: string, memberId: string, _newRole: VCRole) =>
    fetchApi<VCMemberDTO>(`/api/vc/firms/${firmId}/members/${memberId}/role`, {
      method: 'PUT',
      body: JSON.stringify({}),
      headers: {
        'Accept': 'application/json',
      },
    }).then(() =>
      // Refetch after role change to get updated data
      fetchApi<VCMemberDTO[]>(`/api/vc/firms/${firmId}/members`)
    ),

  removeMember: (firmId: string, memberId: string) =>
    fetchApi<void>(`/api/vc/firms/${firmId}/members/${memberId}`, {
      method: 'DELETE',
    }),
}
