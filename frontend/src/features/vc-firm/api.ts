import { fetchApi } from '@/lib/api-client'
import {
  VCFirmDTO,
  VCMemberDTO,
  CreateVCFirmRequest,
  UpdateVCFirmRequest,
  AddMemberRequest,
  VCRole,
  ThesisDTO,
  UpdateThesisRequest,
  PlanTier,
} from './types'

export const vcFirmApi = {
  createFirm: (request: CreateVCFirmRequest) =>
    fetchApi<VCFirmDTO>('/api/vc/firms', {
      method: 'POST',
      body: JSON.stringify(request),
    }),

  /** The firm the signed-in VC user belongs to, or null before setup. */
  getMyFirm: () => fetchApi<VCFirmDTO | null>('/api/vc/firms/me'),

  searchFirms: (search?: string) =>
    fetchApi<VCFirmDTO[]>(
      search ? `/api/vc/firms?search=${encodeURIComponent(search)}` : '/api/vc/firms'
    ),

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

  updateThesis: (firmId: string, request: UpdateThesisRequest) =>
    fetchApi<ThesisDTO>(`/api/vc/firms/${firmId}/thesis`, {
      method: 'PUT',
      body: JSON.stringify(request),
    }),

  selectPlan: (firmId: string, planTier: PlanTier) =>
    fetchApi<VCFirmDTO>(`/api/vc/firms/${firmId}/plan`, {
      method: 'PUT',
      body: JSON.stringify({ planTier }),
    }),
}
