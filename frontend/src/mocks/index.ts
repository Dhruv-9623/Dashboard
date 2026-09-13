import { makeDb } from './fixtures'
import type { MockDb } from './fixtures'

// Dev-only fetch shim so the UI can be reviewed before the backend exists.
// Enabled with VITE_USE_MOCKS=true. Delete this directory once the API is live.

const db: MockDb = makeDb()

const STORAGE_KEY = 'mock-user-type'

const readUserType = () => {
  const fromUrl = new URLSearchParams(window.location.search).get('as')
  if (fromUrl === 'startup' || fromUrl === 'vc') {
    localStorage.setItem(STORAGE_KEY, fromUrl)
    return fromUrl
  }
  return localStorage.getItem(STORAGE_KEY) === 'startup' ? 'startup' : 'vc'
}

let userType = readUserType()

const uid = (prefix: string) => {
  const random = window.crypto.getRandomValues(new Uint32Array(1))[0]
  return `${prefix}-${random.toString(36).padStart(7, '0').slice(0, 7)}`
}
const now = () => new Date().toISOString()

type Ctx = { url: URL; body: any; params: string[] }
type Handler = (ctx: Ctx) => unknown

const routes: Array<[string, RegExp, Handler]> = [
  // ---- auth ----
  ['GET', /^\/api\/auth\/me$/, () => (userType === 'startup' ? db.startupUser : db.user)],
  ['POST', /^\/api\/auth\/logout$/, () => undefined],

  // ---- VC firm ----
  ['GET', /^\/api\/vc\/firms\/me$/, () => (userType === 'startup' ? null : db.firm)],
  ['GET', /^\/api\/vc\/firms$/, ({ url }) => {
    const search = (url.searchParams.get('search') ?? '').toLowerCase()
    return db.firms.filter((f) => f.name.toLowerCase().includes(search))
  }],
  ['GET', /^\/api\/vc\/firms\/([^/]+)\/members$/, () => db.members],
  ['POST', /^\/api\/vc\/firms\/([^/]+)\/members$/, ({ body }) => {
    const member = { id: uid('m'), userId: uid('u'), userEmail: body.userId, firmId: db.firm.id, role: 'STAFF', joinedAt: now(), createdAt: now(), updatedAt: now() }
    db.members.push(member as never)
    return member
  }],
  ['PUT', /^\/api\/vc\/firms\/([^/]+)\/thesis$/, ({ body }) => {
    db.firm.thesis = { ...body, notes: body.notes ?? null, updatedAt: now() }
    return db.firm.thesis
  }],
  ['PUT', /^\/api\/vc\/firms\/([^/]+)\/plan$/, ({ body }) => {
    db.firm.planTier = body.planTier
    return db.firm
  }],
  ['GET', /^\/api\/vc\/firms\/([^/]+)$/, ({ params }) =>
    [db.firm, ...db.firms].find((f) => f.id === params[0]) ?? db.firms[0]],
  ['PUT', /^\/api\/vc\/firms\/([^/]+)$/, ({ body }) => {
    Object.assign(db.firm, body, { updatedAt: now() })
    return db.firm
  }],
  ['POST', /^\/api\/vc\/firms$/, ({ body }) => {
    Object.assign(db.firm, body)
    return db.firm
  }],

  // ---- startups ----
  ['GET', /^\/api\/startups\/me$/, () => (userType === 'startup' ? db.startups[0] : null)],
  ['GET', /^\/api\/startups$/, ({ url }) => {
    const search = (url.searchParams.get('search') ?? '').toLowerCase()
    const sector = url.searchParams.get('sector')
    const stage = url.searchParams.get('stage')
    const raising = url.searchParams.get('raisingOnly') === 'true'
    return db.startups.filter(
      (s) =>
        s.name.toLowerCase().includes(search) &&
        (!sector || s.sector === sector) &&
        (!stage || s.stage === stage) &&
        (!raising || s.isRaising)
    )
  }],
  ['GET', /^\/api\/startups\/([^/]+)\/members$/, () => [
    { id: 'sm-1', userId: 'u-9', userEmail: 'priya@lumen.health', startupId: 's-1', role: 'FOUNDER', joinedAt: db.startups[0].createdAt },
    { id: 'sm-2', userId: 'u-10', userEmail: 'kabir@lumen.health', startupId: 's-1', role: 'CO_FOUNDER', joinedAt: db.startups[0].createdAt },
  ]],
  ['POST', /^\/api\/startups\/([^/]+)\/members$/, ({ body }) => ({
    id: uid('sm'), userId: uid('u'), userEmail: body.email, startupId: 's-1', role: body.role, joinedAt: now(),
  })],
  ['GET', /^\/api\/startups\/([^/]+)$/, ({ params }) =>
    db.startups.find((s) => s.id === params[0]) ?? db.startups[0]],
  ['PUT', /^\/api\/startups\/([^/]+)$/, ({ body }) => {
    Object.assign(db.startups[0], body, { updatedAt: now() })
    return db.startups[0]
  }],
  ['POST', /^\/api\/startups$/, ({ body }) => {
    Object.assign(db.startups[0], body)
    return db.startups[0]
  }],

  // ---- investments ----
  ['GET', /^\/api\/investments$/, () => db.investments],
  ['POST', /^\/api\/investments$/, ({ body }) => {
    const startup = db.startups.find((s) => s.id === body.startupId)
    const item = { id: uid('i'), vcFirmId: 'f-1', startupName: startup?.name ?? 'Unknown', startupSector: startup?.sector ?? '—', startupLogoUrl: null, equityPercentage: null, notes: null, createdAt: now(), updatedAt: now(), ...body }
    db.investments.unshift(item as never)
    return item
  }],
  ['PUT', /^\/api\/investments\/([^/]+)$/, ({ params, body }) => {
    const item = db.investments.find((i) => i.id === params[0])
    if (item) Object.assign(item, body, { updatedAt: now() })
    return item
  }],
  ['DELETE', /^\/api\/investments\/([^/]+)$/, ({ params }) => {
    const index = db.investments.findIndex((i) => i.id === params[0])
    if (index >= 0) db.investments.splice(index, 1)
    return undefined
  }],

  // ---- pool ----
  ['GET', /^\/api\/pool$/, () => db.pool],
  ['POST', /^\/api\/pool$/, ({ body }) => {
    const entry = { id: uid('p'), vcFirmId: 'f-1', startupId: body.startupId ?? null, addedByEmail: db.user.email, addedAt: now(), sector: null, stage: null, notes: null, ...body }
    db.pool.unshift(entry as never)
    return entry
  }],
  ['PUT', /^\/api\/pool\/([^/]+)$/, ({ params, body }) => {
    const entry = db.pool.find((p) => p.id === params[0])
    if (entry) Object.assign(entry, body)
    return entry
  }],
  ['DELETE', /^\/api\/pool\/([^/]+)$/, ({ params }) => {
    const index = db.pool.findIndex((p) => p.id === params[0])
    if (index >= 0) db.pool.splice(index, 1)
    return undefined
  }],

  // ---- funding ----
  ['GET', /^\/api\/funding-cycles\/open$/, ({ url }) => {
    const sector = url.searchParams.get('sector')
    const stage = url.searchParams.get('stage')
    return db.cycles.filter(
      (c) =>
        c.status === 'OPEN' &&
        (!sector || c.startupSector === sector) &&
        (!stage || c.startupStage === stage)
    )
  }],
  ['GET', /^\/api\/funding-cycles$/, () => db.cycles.filter((c) => c.startupId === 's-1')],
  ['POST', /^\/api\/funding-cycles$/, ({ body }) => {
    const cycle = { id: uid('fc'), startupId: 's-1', startupName: db.startups[0].name, startupSector: db.startups[0].sector, startupStage: db.startups[0].stage, openedAt: now(), closedAt: null, committedAmount: 0, commitmentCount: 0, minTicketSize: null, maxTicketSize: null, pitchDeckUrl: null, dataRoomUrl: null, ...body }
    db.cycles.unshift(cycle as never)
    return cycle
  }],
  ['GET', /^\/api\/funding-cycles\/([^/]+)\/commitments$/, ({ params }) =>
    db.commitments.filter((c) => c.fundingCycleId === params[0])],
  ['POST', /^\/api\/funding-cycles\/([^/]+)\/commitments$/, ({ params, body }) => {
    const commitment = { id: uid('c'), fundingCycleId: params[0], vcFirmId: 'f-1', vcFirmName: db.firm.name, committedAt: now(), ...body }
    db.commitments.push(commitment as never)
    const cycle = db.cycles.find((c) => c.id === params[0])
    if (cycle) {
      cycle.committedAmount += body.amount
      cycle.commitmentCount += 1
    }
    return commitment
  }],
  ['PUT', /^\/api\/funding-cycles\/([^/]+)$/, ({ params, body }) => {
    const cycle = db.cycles.find((c) => c.id === params[0])
    if (cycle) Object.assign(cycle, body)
    return cycle
  }],
  ['PATCH', /^\/api\/commitments\/([^/]+)$/, ({ params, body }) => {
    const commitment = db.commitments.find((c) => c.id === params[0])
    if (commitment) commitment.status = body.status
    return commitment
  }],

  // ---- deal triage ----
  ['GET', /^\/api\/opportunities$/, ({ url }) => {
    const status = url.searchParams.get('status')
    return status ? db.opportunities.filter((o) => o.status === status) : db.opportunities
  }],
  ['POST', /^\/api\/opportunities$/, ({ body }) => {
    const opportunity = {
      id: uid('o'), firmId: 'f-1', website: null, askAmount: null, description: null, contactEmail: null,
      fitScore: null, rationale: null, citations: [], recommendedAction: null,
      status: 'SCORING', decisionNote: null, scoredAt: null, createdAt: now(), updatedAt: now(), ...body,
    }
    db.opportunities.unshift(opportunity as never)
    // Simulate the async scoring agent finishing.
    setTimeout(() => {
      Object.assign(opportunity, {
        fitScore: 72,
        rationale:
          'Sector and stage are inside the thesis and the ask sits within the cheque band. Scored on the information provided — a fuller description would tighten this estimate.',
        citations: [
          { claim: `${opportunity.sector} appears in the firm's thesis sectors.`, thesisField: 'sectors', supporting: true },
          { claim: 'Stage falls inside the stated range.', thesisField: 'stages', supporting: true },
          { claim: 'Limited traction detail provided at intake.', thesisField: 'notes', supporting: false },
        ],
        recommendedAction: 'PURSUE',
        status: 'PENDING_REVIEW',
        scoredAt: now(),
      })
    }, 4000)
    return opportunity
  }],
  ['GET', /^\/api\/opportunities\/([^/]+)\/conflict-report$/, ({ params }) =>
    db.conflictReports.find((r) => r.opportunityId === params[0]) ?? null],
  ['POST', /^\/api\/opportunities\/([^/]+)\/conflict-check$/, ({ params }) => {
    const existing = db.conflictReports.find((r) => r.opportunityId === params[0])
    if (existing) return { ...existing, generatedAt: now() }
    const opportunity = db.opportunities.find((o) => o.id === params[0])
    const report = {
      id: uid('cr'), opportunityId: params[0], opportunityName: opportunity?.companyName ?? '—',
      overallConfidence: 0.24, comparedCompanyCount: db.investments.length, generatedAt: now(),
      dimensions: [
        { dimension: 'SECTOR_OVERLAP', confidence: 0.31, summary: 'No current holding operates in this exact sector, though one is adjacent.', matches: [] },
        { dimension: 'CUSTOMER_OVERLAP', confidence: 0.18, summary: 'No shared named accounts detected across the portfolio.', matches: [] },
        { dimension: 'COMPETITIVE_PRODUCT', confidence: 0.22, summary: 'No directly competing product in the portfolio today.', matches: [] },
      ],
    }
    db.conflictReports.push(report as never)
    return report
  }],
  ['POST', /^\/api\/opportunities\/([^/]+)\/rescore$/, ({ params }) => {
    const opportunity = db.opportunities.find((o) => o.id === params[0])
    if (opportunity) {
      opportunity.scoredAt = now()
      opportunity.updatedAt = now()
    }
    return opportunity
  }],
  ['PATCH', /^\/api\/opportunities\/([^/]+)\/status$/, ({ params, body }) => {
    const opportunity = db.opportunities.find((o) => o.id === params[0])
    if (opportunity) {
      opportunity.status = body.status
      opportunity.decisionNote = body.decisionNote ?? null
      opportunity.updatedAt = now()
    }
    return opportunity
  }],
  ['GET', /^\/api\/opportunities\/([^/]+)$/, ({ params }) =>
    db.opportunities.find((o) => o.id === params[0]) ?? db.opportunities[0]],
  ['GET', /^\/api\/conflict-reports$/, () => db.conflictReports],

  // ---- pulse ----
  ['GET', /^\/api\/digests$/, () => db.digests],
  ['POST', /^\/api\/digests\/generate$/, () => {
    const digest = { ...db.digests[0], id: uid('d'), periodEnd: now(), sentAt: now(), createdAt: now() }
    db.digests.unshift(digest as never)
    return digest
  }],
  ['GET', /^\/api\/digests\/([^/]+)$/, ({ params }) =>
    db.digests.find((d) => d.id === params[0]) ?? db.digests[0]],

  // ---- messaging ----
  ['GET', /^\/api\/connection-requests$/, ({ url }) => {
    const direction = url.searchParams.get('direction')
    const me = userType === 'startup' ? db.startupUser.id : db.user.id
    return db.connections.filter((c) =>
      direction === 'outgoing' ? c.from.userId === me : c.to.userId === me
    )
  }],
  ['POST', /^\/api\/connection-requests$/, ({ body }) => ({
    id: uid('cx'), from: db.connections[2].from, to: db.connections[2].to,
    status: 'PENDING', message: body.message ?? null, requestedAt: now(), respondedAt: null,
  })],
  ['PATCH', /^\/api\/connection-requests\/([^/]+)$/, ({ params, body }) => {
    const request = db.connections.find((c) => c.id === params[0])
    if (request) {
      request.status = body.status
      request.respondedAt = now()
      if (body.status === 'ACCEPTED') {
        db.conversations.unshift({
          id: uid('cv'), counterparty: request.from,
          lastMessagePreview: null, lastMessageAt: null, unreadCount: 0, createdAt: now(),
        } as never)
      }
    }
    return request
  }],
  ['GET', /^\/api\/conversations$/, () => db.conversations],
  ['GET', /^\/api\/conversations\/([^/]+)\/messages$/, ({ params }) => db.messages[params[0]] ?? []],
  ['POST', /^\/api\/conversations\/([^/]+)\/messages$/, ({ params, body }) => {
    const me = userType === 'startup' ? db.startupUser : db.user
    const message = { id: uid('msg'), conversationId: params[0], senderUserId: me.id, senderEmail: me.email, body: body.body, sentAt: now(), readAt: null }
    db.messages[params[0]] = [...(db.messages[params[0]] ?? []), message]
    const conversation = db.conversations.find((c) => c.id === params[0])
    if (conversation) {
      conversation.lastMessagePreview = body.body
      conversation.lastMessageAt = now()
      conversation.unreadCount = 0
    }
    return message
  }],
  ['POST', /^\/api\/conversations\/([^/]+)\/read$/, () => undefined],

  // ---- wishlist ----
  ['GET', /^\/api\/wishlist$/, () => db.wishlist],
  ['POST', /^\/api\/wishlist$/, ({ body }) => {
    const startup = db.startups.find((s) => s.id === body.targetId)
    const firm = db.firms.find((f) => f.id === body.targetId)
    const item = {
      id: uid('w'), targetType: body.targetType, targetId: body.targetId,
      targetName: startup?.name ?? firm?.name ?? 'Saved',
      targetSector: startup?.sector ?? null, targetStage: startup?.stage ?? null,
      targetLogoUrl: null, note: body.note ?? null, savedAt: now(),
    }
    db.wishlist.unshift(item as never)
    return item
  }],
  ['DELETE', /^\/api\/wishlist\/([^/]+)$/, ({ params }) => {
    const index = db.wishlist.findIndex((w) => w.id === params[0])
    if (index >= 0) db.wishlist.splice(index, 1)
    return undefined
  }],

  // ---- events ----
  ['GET', /^\/api\/events$/, ({ url }) => {
    const upcoming = url.searchParams.get('upcoming') !== 'false'
    return db.events.filter((e) =>
      upcoming ? new Date(e.startTime) >= new Date() : new Date(e.startTime) < new Date()
    )
  }],
  ['POST', /^\/api\/events\/([^/]+)\/rsvp$/, ({ params, body }) => {
    const event = db.events.find((e) => e.id === params[0])
    if (event) {
      if (event.myRsvp !== body.rsvpStatus && body.rsvpStatus === 'GOING') event.attendeeCount += 1
      event.myRsvp = body.rsvpStatus
    }
    return event
  }],
  ['GET', /^\/api\/events\/([^/]+)\/attendees$/, () => []],
  ['POST', /^\/api\/events$/, ({ body }) => {
    const event = { id: uid('e'), hostName: db.firm.name, hostUserId: db.user.id, attendeeCount: 1, myRsvp: 'GOING', description: null, endTime: null, location: null, virtualLink: null, ...body }
    db.events.unshift(event as never)
    return event
  }],
  ['GET', /^\/api\/events\/([^/]+)$/, ({ params }) =>
    db.events.find((e) => e.id === params[0]) ?? db.events[0]],

  // ---- signals / suggestions / outreach / insights / comparison ----
  ['GET', /^\/api\/signals$/, ({ url }) => {
    const type = url.searchParams.get('type')
    return type ? db.signals.filter((s) => s.signalType === type) : db.signals
  }],
  ['GET', /^\/api\/ai\/suggestions$/, () => db.suggestions],
  ['PATCH', /^\/api\/ai\/suggestions\/([^/]+)$/, ({ params, body }) => {
    const suggestion = db.suggestions.find((s) => s.id === params[0])
    if (suggestion) suggestion.status = body.status
    return suggestion
  }],
  ['POST', /^\/api\/ai\/suggestions\/regenerate$/, () => undefined],
  ['GET', /^\/api\/outreach$/, () => db.outreach],
  ['POST', /^\/api\/outreach$/, ({ body }) => {
    const startup = db.startups.find((s) => s.id === body.toStartupId)
    const message = { id: uid('or'), fromFirmId: 'f-1', fromFirmName: db.firm.name, toStartupName: startup?.name ?? '—', status: 'SENT', sentAt: now(), ...body }
    db.outreach.unshift(message as never)
    return message
  }],
  ['GET', /^\/api\/insights$/, () => db.insights],
  ['POST', /^\/api\/comparison$/, ({ body }) =>
    (body.startupIds as string[])
      .map((id) => db.startups.find((s) => s.id === id))
      .filter(Boolean)
      .map((startup) => ({
        startup,
        totalRaised: Math.round((startup!.annualRevenue ?? 10_00_000) * 2.4),
        currency: 'INR',
        openRound: db.cycles.find((c) => c.startupId === startup!.id && c.status === 'OPEN')?.roundType ?? null,
        investorCount: db.cycles.find((c) => c.startupId === startup!.id)?.commitmentCount ?? 0,
      }))],
]

export function installMocks() {
  userType = readUserType()
  const passthrough = window.fetch.bind(window)

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const url = new URL(raw, window.location.origin)
    const method = (init?.method ?? 'GET').toUpperCase()

    for (const [routeMethod, pattern, handler] of routes) {
      if (routeMethod !== method) continue
      const match = pattern.exec(url.pathname)
      if (!match) continue

      let body: unknown = undefined
      if (typeof init?.body === 'string') {
        try {
          body = JSON.parse(init.body)
        } catch {
          body = undefined
        }
      }

      const data = handler({ url, body, params: match.slice(1) })
      await new Promise((resolve) => setTimeout(resolve, 120))

      return new Response(JSON.stringify({ success: true, data, timestamp: now() }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return passthrough(input as RequestInfo, init)
  }

  // eslint-disable-next-line no-console
  console.info(
    `[mocks] Serving fixture data as a ${userType === 'startup' ? 'STARTUP' : 'VC'} user. ` +
      `Switch with ?as=startup or ?as=vc`
  )
}
