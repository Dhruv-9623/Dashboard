# VC Domain

## Overview

The VC domain manages Venture Capital firms, their team members, roles, and permissions. VCs use this domain to organize themselves and manage who has access to investments, pool entries, and other firm data.

## Entities

### `VCFirm`
Represents a venture capital firm.

**Fields:**
- `id` (UUID) — unique identifier
- `name` — firm name (required)
- `description` — firm bio/description
- `website` — firm website URL
- `aum` — Assets Under Management (in millions)
- `investmentStage` — focus areas (e.g., "Early Stage", "Growth")
- `sectors` — list of investment sectors (e.g., ["Tech", "Healthcare"])
- `location` — headquarters location
- `foundedYear` — when the firm was founded
- `createdAt`, `updatedAt` — timestamps

### `VCMember`
Represents a team member's association with a firm and their role.

**Fields:**
- `id` (UUID) — unique identifier
- `user` (FK to User) — the team member
- `firm` (FK to VCFirm) — the firm they belong to
- `role` (Enum) — `OWNER`, `PORTFOLIO_MANAGER`, or `STAFF`
- `joinedAt` — when they joined the firm
- `createdAt`, `updatedAt` — timestamps

### `VCRole` Enum
- **OWNER** — full admin: can add/remove members, change roles, modify firm details, access all investments/pool
- **PORTFOLIO_MANAGER** — can create investments, manage pool, view all firm data
- **STAFF** — read-only access, cannot create investments or pool entries

## Key Services

### `VCFirmService`
Handles firm CRUD and team membership.

**Methods:**
- `createFirm(owner, request)` — creates a new firm and adds the creator as OWNER
- `getFirm(firmId)` — loads firm by ID
- `updateFirm(firmId, actor, request)` — updates firm details; OWNER only
- `addMember(firmId, actor, request)` — adds a user to the firm; OWNER only
- `removeMember(firmId, actor, memberId)` — removes a member; OWNER only, cannot remove the sole OWNER
- `changeMemberRole(firmId, actor, memberId, newRole)` — changes a member's role; OWNER only
- `getUserFirmMembership(userId)` — returns the VCMember row for a user (fails if they don't belong to any firm)
- `getFirmMembers(firmId)` — lists all members of a firm

**Business Rules:**
1. **One firm per user** — a user can belong to at most one VCFirm (enforced via unique constraint on `vc_firm_members(user_id)`)
2. **Single OWNER per firm** — exactly one member must have role OWNER (enforced via Postgres partial unique index on `vc_firm_members(firm_id) WHERE role = 'OWNER'`)
3. **OWNER-only mutations** — only an OWNER can add members, remove members, or change roles
4. **No demoting sole OWNER** — if there's only one OWNER, cannot demote them without promoting a replacement first
5. **Cannot add user twice** — if a user already belongs to another firm, cannot add them to this firm

## API Endpoints

### `VCFirmController`
REST layer for firm management.

**Routes:**
- `POST /api/vc/firms` — create new firm; requires `@PreAuthorize("hasRole('VC')")`
- `GET /api/vc/firms/{id}` — get firm details; requester must be a member of that firm
- `PUT /api/vc/firms/{id}` — update firm; OWNER only
- `GET /api/vc/firms/{id}/members` — list firm members; requester must be a member of that firm
- `POST /api/vc/firms/{id}/members` — add member to firm; OWNER only
- `PUT /api/vc/firms/{id}/members/{memberId}/role` — change member role; OWNER only
- `DELETE /api/vc/firms/{id}/members/{memberId}` — remove member; OWNER only

**Request/Response DTOs:**
- `CreateVCFirmRequest` — firm creation fields
- `UpdateVCFirmRequest` — firm update fields
- `AddMemberRequest` — userId to add
- `VCFirmDTO` — firm details (from `VCFirmMapper`)
- `VCMemberDTO` — member details (from `VCFirmMapper`)

## Testing

**Unit Tests:** `VCFirmServiceTest.java`
- `testCreateFirm_Success` — firm creation with OWNER member
- `testCreateFirm_CreatesOwnerMember` — verifies the creator is added as OWNER

**Manual Testing:**
1. After account-type selection (VC), land on dashboard
2. Create a firm: fill in form, submit
3. View firm details: name, description, AUM, sectors, location visible
4. Invite team member: click "Add Member", enter email/ID
5. View members table: member shows with role badge
6. (As member) Try to remove another member: should be denied if you're not OWNER
7. (As OWNER) Change member role: see role update in UI
8. (As OWNER) Remove member: member disappears from table

## Database Constraints

- `users(email)` — UNIQUE
- `vc_firm_members(user_id)` — UNIQUE (one firm per user)
- `vc_firm_members(firm_id, role)` WHERE role='OWNER' — UNIQUE partial index (single OWNER per firm)
- Foreign keys: `vc_firm_members.user_id → users.id`, `vc_firm_members.firm_id → vc_firms.id`

## Security

- All firm mutations check `@PreAuthorize("hasRole('VC')")` at controller level
- Service layer additionally checks firm membership: non-members cannot view/edit a firm's data
- OWNER role is required for mutations (add/remove/promote members)
- No cascade deletes: removing a firm does not delete its members' user records

## Future Enhancements

- Invite members via email (currently only by user ID)
- Audit log of member additions/removals
- Member invitation workflow (pending acceptance before they see firm data)
- Firm-level permissions matrix (e.g., Staff can view pool but not investments)
- Bulk operations (add multiple members, bulk role changes)
