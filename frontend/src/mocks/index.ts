import { makeDb } from './fixtures'
import { bookTotals } from '@/features/funding/types'
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

/** Mirrors the backend's PageResponse envelope (common/PageResponse.java). */
const paged = <T>(items: T[], url: URL) => {
  const page = Number(url.searchParams.get('page') ?? 0)
  const size = Math.min(Number(url.searchParams.get('size') ?? 20), 100)
  const start = page * size
  return {
    items: items.slice(start, start + size),
    page,
    size,
    totalElements: items.length,
    totalPages: Math.max(Math.ceil(items.length / size), 1),
  }
}

/**
 * Recomputes a round's three bands from the commitments actually on it.
 *
 * The mock used to increment `committedAmount` on every POST regardless of the band, which made
 * the fixture server disagree with the API it is standing in for.
 */
const recountCycle = (cycleId: string) => {
  const cycle = db.cycles.find((c) => c.id === cycleId)
  if (!cycle) return
  // WITHDRAWN is excluded from every band and from the count, exactly as the API's
  // sumByCycleAndStatus query does — a pledge an investor pulled must not inflate a round.
  const own = db.commitments.filter(
    (c) => c.fundingCycleId === cycleId && c.status !== 'WITHDRAWN'
  )
  const sum = (status: string) =>
    own.filter((c) => c.status === status).reduce((total, c) => total + c.amount, 0)

  cycle.committedAmount = sum('COMMITTED')
  cycle.softCommittedAmount = sum('SOFT_COMMITTED')
  cycle.indicatedAmount = sum('INDICATED')
  cycle.commitmentCount = own.length
}

/** The round context the API attaches to a row on the firm's own book. */
/**
 * The fixture rounds carry their own band figures, and the fixture commitments imply a different
 * set. Recomputing on startup makes the commitments the single source: a round, its investor list
 * and its replayed history then agree, which the momentum chart depends on — it sits next to the
 * progress bar, so any disagreement is visible on one screen.
 */
const reconcileCycles = () => db.cycles.forEach((cycle) => recountCycle(cycle.id))

reconcileCycles()

/**
 * A refused write, in the shape the API refuses one: 409 with a sentence meant for the person.
 *
 * Every handler used to answer 200, which made it impossible to look at an error state that is
 * part of the design — the convert and withdraw dialogs both render their own failure inline, and
 * a mock that cannot fail cannot show that.
 */
const refuse = (message: string, status = 409) => ({ __refusal: { status, message } })

/**
 * Why this round would be refused, or null — the two rules FundingService checks on create and
 * update. `excludeId` is the round being edited, which doesn't count against itself.
 */
const cycleProblem = (body: any, excludeId: string | null) => {
  if (
    body.minTicketSize != null &&
    body.maxTicketSize != null &&
    body.minTicketSize > body.maxTicketSize
  ) {
    return refuse("The minimum ticket size can't be larger than the maximum.")
  }
  if (body.status === 'OPEN') {
    const alreadyOpen = db.cycles.find(
      (c) => c.startupId === 's-1' && c.status === 'OPEN' && c.id !== excludeId
    )
    if (alreadyOpen) {
      return refuse('You already have an open round. Close or pause it before opening another.')
    }
  }
  return null
}

/** Appends to the event log, mirroring FundingService.recordEvent — including its no-op guard. */
const recordEvent = (
  commitment: { id: string; vcFirmId: string; vcFirmName: string; status: string; amount: number; currency: string },
  previous: { status: string; amount: number } | null
) => {
  if (previous && previous.status === commitment.status && previous.amount === commitment.amount) return
  db.commitmentEvents.push({
    id: uid('ce'),
    commitmentId: commitment.id,
    vcFirmId: commitment.vcFirmId,
    vcFirmName: commitment.vcFirmName,
    fromStatus: previous ? previous.status : null,
    toStatus: commitment.status,
    fromAmount: previous ? previous.amount : null,
    toAmount: commitment.amount,
    currency: commitment.currency,
    occurredAt: now(),
  } as never)
}

const withRoundContext = <T extends { fundingCycleId: string }>(commitment: T) => {
  const cycle = db.cycles.find((c) => c.id === commitment.fundingCycleId)
  return {
    ...commitment,
    startupId: cycle?.startupId ?? null,
    startupName: cycle?.startupName ?? null,
    roundType: cycle?.roundType ?? null,
    cycleStatus: cycle?.status ?? null,
    cycleTargetAmount: cycle?.targetAmount ?? null,
    cycleClosedAt: cycle?.closedAt ?? null,
  }
}

const uid = (prefix: string) => {
  const random = window.crypto.getRandomValues(new Uint32Array(1))[0]
  return `${prefix}-${random.toString(36).padStart(7, '0').slice(0, 7)}`
}
const now = () => new Date().toISOString()

type Ctx = { url: URL; body: any; params: string[] }
type Handler = (ctx: Ctx) => unknown

/**
 * Whether a startup has a round open — derived, exactly as the server derives it.
 *
 * The fixtures carried a hand-set `isRaising` flag, which drifted from the rounds in `db.cycles`
 * and let a "Raising" badge disagree with the funding data on the next screen.
 */
const raising = (startupId: string) =>
  db.cycles.some((c) => c.startupId === startupId && c.status === 'OPEN')

/** A startup as the API sends it, with `isRaising` computed rather than stored. */
const asStartup = <T extends { id: string }>(startup: T) => ({
  ...startup,
  isRaising: raising(startup.id),
})

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
    const member = { id: uid('m'), userId: uid('u'), userEmail: body.email, firmId: db.firm.id, role: body.role ?? 'STAFF', joinedAt: now(), createdAt: now(), updatedAt: now() }
    db.members.push(member as never)
    return member
  }],
  // The role endpoint reads the new role from the query string, not the body.
  ['PUT', /^\/api\/vc\/firms\/([^/]+)\/members\/([^/]+)\/role$/, ({ params, url }) => {
    const member = db.members.find((m) => m.id === params[1])
    if (!member) return refuse('No such member.', 404)
    const newRole = url.searchParams.get('newRole')
    if (member.role === 'OWNER') return refuse('A firm keeps exactly one owner.')
    member.role = newRole as never
    member.updatedAt = now()
    return member
  }],
  ['DELETE', /^\/api\/vc\/firms\/([^/]+)\/members\/([^/]+)$/, ({ params }) => {
    const index = db.members.findIndex((m) => m.id === params[1])
    if (index < 0) return refuse('No such member.', 404)
    if (db.members[index].role === 'OWNER') return refuse("The firm's owner can't be removed.")
    db.members.splice(index, 1)
    return null
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
  ['GET', /^\/api\/startups\/me$/, () => (userType === 'startup' ? asStartup(db.startups[0]) : null)],
  ['GET', /^\/api\/startups$/, ({ url }) => {
    const search = (url.searchParams.get('search') ?? '').toLowerCase()
    const sector = url.searchParams.get('sector')
    const stage = url.searchParams.get('stage')
    const raisingOnly = url.searchParams.get('raisingOnly') === 'true'
    const matches = db.startups.filter(
      (s) =>
        s.name.toLowerCase().includes(search) &&
        (!sector || s.sector === sector) &&
        (!stage || s.stage === stage) &&
        (!raisingOnly || raising(s.id))
    )
    return paged(matches.map(asStartup), url)
  }],
  ['GET', /^\/api\/startups\/([^/]+)\/members$/, () => db.startupMembers],
  ['POST', /^\/api\/startups\/([^/]+)\/members$/, ({ body }) => {
    const member = { id: uid('sm'), userId: uid('u'), userEmail: body.email, startupId: 's-1', role: body.role, joinedAt: now(), createdAt: now(), updatedAt: now() }
    db.startupMembers.push(member as never)
    return member
  }],
  ['DELETE', /^\/api\/startups\/([^/]+)\/members\/([^/]+)$/, ({ params }) => {
    const index = db.startupMembers.findIndex((m) => m.id === params[1])
    if (index < 0) return refuse('No such member.', 404)
    if (db.startupMembers[index].role === 'FOUNDER') return refuse("The founder can't be removed.")
    db.startupMembers.splice(index, 1)
    return null
  }],
  ['GET', /^\/api\/startups\/([^/]+)$/, ({ params }) =>
    asStartup(db.startups.find((s) => s.id === params[0]) ?? db.startups[0])],
  ['PUT', /^\/api\/startups\/([^/]+)$/, ({ body }) => {
    Object.assign(db.startups[0], body, { updatedAt: now() })
    return db.startups[0]
  }],
  ['POST', /^\/api\/startups$/, ({ body }) => {
    Object.assign(db.startups[0], body)
    return db.startups[0]
  }],

  // ---- investments ----
  ['GET', /^\/api\/investments$/, ({ url }) => {
    const status = url.searchParams.get('status')
    return paged(status ? db.investments.filter((i) => i.status === status) : db.investments, url)
  }],
  ['GET', /^\/api\/investments\/summary$/, () => {
    const totalsByCurrency: Record<string, number> = {}
    const activeTotalsByCurrency: Record<string, number> = {}
    for (const item of db.investments) {
      totalsByCurrency[item.currency] = (totalsByCurrency[item.currency] ?? 0) + item.amount
      if (item.status === 'ACTIVE') {
        activeTotalsByCurrency[item.currency] =
          (activeTotalsByCurrency[item.currency] ?? 0) + item.amount
      }
    }
    const count = (status: string) => db.investments.filter((i) => i.status === status).length
    // Distinct companies, like the real query: a follow-on is another position in a company
    // already held, not another holding.
    const activeCompanies = new Set(
      db.investments.filter((i) => i.status === 'ACTIVE').map((i) => i.startupId)
    ).size
    return {
      totalsByCurrency,
      activeTotalsByCurrency,
      totalCount: db.investments.length,
      activeCount: count('ACTIVE'),
      activeCompanyCount: activeCompanies,
      exitedCount: count('EXITED'),
      writtenOffCount: count('WRITTEN_OFF'),
    }
  }],
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
  ['GET', /^\/api\/pool$/, ({ url }) => {
    const interest = url.searchParams.get('interestLevel')
    return paged(interest ? db.pool.filter((p) => p.interestLevel === interest) : db.pool, url)
  }],
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
  // Paged, like the real endpoint: deal flow spans the whole market.
  ['GET', /^\/api\/funding-cycles\/open$/, ({ url }) => {
    const sector = url.searchParams.get('sector')
    const stage = url.searchParams.get('stage')
    const startupId = url.searchParams.get('startupId')
    return paged(
      db.cycles.filter(
        (c) =>
          c.status === 'OPEN' &&
          (!sector || c.startupSector === sector) &&
          (!stage || c.startupStage === stage) &&
          (!startupId || c.startupId === startupId)
          (!stage || c.startupStage === stage)
      ),
      url
    )
  }],
  ['GET', /^\/api\/funding-cycles$/, () => db.cycles.filter((c) => c.startupId === 's-1')],
  ['POST', /^\/api\/funding-cycles$/, ({ body }) => {
    const problem = cycleProblem(body, null)
    if (problem) return problem
    const cycle = { id: uid('fc'), startupId: 's-1', startupName: db.startups[0].name, startupSector: db.startups[0].sector, startupStage: db.startups[0].stage, openedAt: now(), closedAt: null, committedAmount: 0, softCommittedAmount: 0, indicatedAmount: 0, commitmentCount: 0, minTicketSize: null, maxTicketSize: null, pitchDeckUrl: null, dataRoomUrl: null, ...body }
    db.cycles.unshift(cycle as never)
    return cycle
  }],
  // The founder sees every investor; a VC sees only its own firm. The mock returned everyone's to
  // both, which would have hidden a rival-visibility bug rather than surfacing it.
  ['GET', /^\/api\/funding-cycles\/([^/]+)\/commitments$/, ({ params }) =>
    db.commitments.filter(
      (c) => c.fundingCycleId === params[0] && (userType === 'startup' || c.vcFirmId === 'f-1')
    )],
  ['GET', /^\/api\/funding-cycles\/([^/]+)\/history$/, ({ params }) => {
    const onRound = new Set(
      db.commitments.filter((c) => c.fundingCycleId === params[0]).map((c) => c.id)
    )
    return db.commitmentEvents
      .filter((e) => onRound.has(e.commitmentId) && (userType === 'startup' || e.vcFirmId === 'f-1'))
      .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
  }],
  // After /open and the sub-paths above, so it can't swallow them.
  ['GET', /^\/api\/funding-cycles\/([^/]+)$/, ({ params }) =>
    db.cycles.find((c) => c.id === params[0])],
  ['POST', /^\/api\/funding-cycles\/([^/]+)\/commitments$/, ({ params, body }) => {
    const cycle = db.cycles.find((c) => c.id === params[0])
    if (!cycle) return undefined
    // The same four guards as FundingService.commit. The mock used to accept anything, so a
    // ₹10 pledge against a ₹50 L–₹3 Cr band went through here and would have been refused by the
    // real API — the fixture server hiding the contract instead of standing in for it.
    if (cycle.status !== 'OPEN') return refuse("This round isn't open for commitments.")
    if (body.currency !== cycle.currency) {
      return refuse(`This round is raising in ${cycle.currency}.`)
    }
    if (cycle.minTicketSize !== null && body.amount < cycle.minTicketSize) {
      return refuse(`This round's minimum ticket is ${cycle.minTicketSize} ${cycle.currency}.`)
    }
    if (cycle.maxTicketSize !== null && body.amount > cycle.maxTicketSize) {
      return refuse(`This round's maximum ticket is ${cycle.maxTicketSize} ${cycle.currency}.`)
    }
    }
    if (cycle.minTicketSize !== null && body.amount < cycle.minTicketSize) {
      return refuse(`This round's minimum ticket is ${cycle.minTicketSize} ${cycle.currency}.`)
    }
    if (cycle.maxTicketSize !== null && body.amount > cycle.maxTicketSize) {
      return refuse(`This round's maximum ticket is ${cycle.maxTicketSize} ${cycle.currency}.`)
    }

    const existingIndex = db.commitments.findIndex(
      (c) => c.fundingCycleId === params[0] && c.vcFirmId === 'f-1'
    )
    // Spread the existing row first: rebuilding it from scratch dropped the fields the body
    // doesn't carry — `convertedInvestmentId` among them — and a pledge with that key missing
    // read as already recorded and vanished from the book's totals.
    const existing = existingIndex >= 0 ? db.commitments[existingIndex] : null
    const commitment = {
      ...(existing ?? { convertedInvestmentId: null }),
      id: existing ? existing.id : uid('c'),
      fundingCycleId: params[0],
      vcFirmId: 'f-1',
      vcFirmName: db.firm.name,
      committedAt: now(),
      ...body,
    }
    const previous = existing ? { ...existing } : null
    if (existingIndex >= 0) db.commitments[existingIndex] = commitment as never
    else db.commitments.push(commitment as never)

    recordEvent(commitment, previous)
    recountCycle(params[0])
    return commitment
  }],
  ['PUT', /^\/api\/funding-cycles\/([^/]+)$/, ({ params, body }) => {
    const cycle = db.cycles.find((c) => c.id === params[0])
    if (!cycle) return undefined
    const problem = cycleProblem(body, params[0])
    if (problem) return problem
    Object.assign(cycle, body)
    // Closing a round is what makes its pledges convertible, and reopening one undoes that, so
    // closedAt is the server's to set — as it is in FundingService.applyStatus.
    if (body.status === 'CLOSED' && !cycle.closedAt) cycle.closedAt = now()
    if (body.status !== 'CLOSED') cycle.closedAt = null
    return cycle
  }],
  // The firm's own book, across every round. Paged and filterable, like the real endpoint.
  ['GET', /^\/api\/commitments$/, ({ url }) => {
    const status = url.searchParams.get('status')
    const mine = db.commitments
      .filter((c) => c.vcFirmId === 'f-1' && (!status || c.status === status))
      .map(withRoundContext)
      .sort((a, b) => String(b.committedAt).localeCompare(String(a.committedAt)))
    return paged(mine, url)
  }],
  // Totals over the whole book, like the real endpoint — the page's cards read these, so the
  // arithmetic has to be the one the app ships (bookTotals, which the tests pin down).
  ['GET', /^\/api\/commitments\/summary$/, () => {
    const mine = db.commitments.filter((c) => c.vcFirmId === 'f-1').map(withRoundContext)
    const totals = bookTotals(mine as never)
    return {
      committedByCurrency: totals.committed,
      likelyByCurrency: totals.likely,
      liveCount: totals.liveCount,
      readyToRecordCount: totals.readyToRecordCount,
    }
  }],
  ['PATCH', /^\/api\/commitments\/([^/]+)$/, ({ params, body }) => {
    const commitment = db.commitments.find((c) => c.id === params[0])
    if (!commitment) return undefined
    const previous = { ...commitment }
    commitment.status = body.status
    recordEvent(commitment, previous)
    // Moving along the ladder moves the money between bands, so the round has to be recounted.
    recountCycle(commitment.fundingCycleId)
    return commitment
  }],
  /**
   * Record a closed round's pledge as an investment.
   *
   * The same three guards as the server, so the mock refuses what the API would refuse: the round
   * has to be closed, the pledge has to be COMMITTED, and it can only happen once. Amount,
   * currency and round come from the pledge — the body cannot restate them.
   */
  ['POST', /^\/api\/commitments\/([^/]+)\/convert$/, ({ params, body }) => {
    const commitment = db.commitments.find((c) => c.id === params[0])
    if (!commitment) return undefined
    const cycle = db.cycles.find((c) => c.id === commitment.fundingCycleId)
    if (cycle?.status !== 'CLOSED') {
      return refuse('You can record this as an investment once the round has closed.')
    }
    if (commitment.status !== 'COMMITTED') {
      return refuse("Only a committed pledge becomes an investment. An indication isn't money yet.")
    }
    if (commitment.convertedInvestmentId) {
      return refuse('This pledge is already in your portfolio.')
    }
    // @PastOrPresent on the server. Without it here, May 2031 saved.
    if (body?.investmentDate && String(body.investmentDate) > now().slice(0, 10)) {
      return refuse("The investment date can't be in the future.", 400)
    }

    const startup = db.startups.find((entry) => entry.id === cycle.startupId)
    const investment = {
      id: uid('i'),
      vcFirmId: 'f-1',
      startupId: cycle.startupId,
      startupName: cycle.startupName,
      startupSector: cycle.startupSector,
      startupLogoUrl: startup?.logoUrl ?? null,
      investmentDate: (body?.investmentDate as string) ?? String(cycle.closedAt).slice(0, 10),
      amount: commitment.amount,
      currency: commitment.currency,
      round: cycle.roundType,
      equityPercentage: body?.equityPercentage ?? null,
      status: 'ACTIVE',
      notes: body?.notes ?? null,
      createdAt: now(),
      updatedAt: now(),
    }
    db.investments.unshift(investment as never)
    commitment.convertedInvestmentId = investment.id
    return withRoundContext(commitment)
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

const SCENARIO_KEY = 'mock-scenario'

/**
 * How the fake API behaves, so the states that are hardest to reach on real data can be looked at
 * directly: `?mock=error`, `?mock=empty`, `?mock=slow`, `?mock=off` (the default).
 *
 * The design review had to inject these from the browser console; this makes them shareable URLs.
 */
type Scenario = 'off' | 'error' | 'empty' | 'slow' | 'signedout'

const readScenario = (): Scenario => {
  const fromUrl = new URLSearchParams(window.location.search).get('mock')
  if (
    fromUrl === 'error' ||
    fromUrl === 'empty' ||
    fromUrl === 'slow' ||
    fromUrl === 'signedout' ||
    fromUrl === 'off'
  ) {
    sessionStorage.setItem(SCENARIO_KEY, fromUrl)
    return fromUrl
  }
  const stored = sessionStorage.getItem(SCENARIO_KEY)
  return stored === 'error' || stored === 'empty' || stored === 'slow' || stored === 'signedout'
    ? stored
    : 'off'
}

/** Strips a scenario's data down to nothing, whatever shape the endpoint returns. */
const emptied = (data: unknown): unknown => {
  if (Array.isArray(data)) return []
  if (data && typeof data === 'object' && 'items' in data) {
    return { ...(data as object), items: [], totalElements: 0, totalPages: 1 }
  }
  return null
}

export function installMocks() {
  userType = readUserType()
  const scenario = readScenario()
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
      await new Promise((resolve) => setTimeout(resolve, scenario === 'slow' ? 4000 : 120))

      // Auth and profile keep working in every scenario, otherwise the app just bounces to
      // sign-in and no page renders in the state being looked at.
      const isSession = /^\/api\/(auth|vc\/firms\/me|startups\/me)/.test(url.pathname)

      // …except when signed-out is the state being looked at. `?mock=signedout`
      // refuses the session so the landing and sign-in screens can be worked on
      // without a backend.
      if (scenario === 'signedout' && url.pathname === '/api/auth/me') {
        return new Response(
          JSON.stringify({ success: false, errorCode: 'UNAUTHORIZED', message: 'Not signed in' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        )
      }

      if (scenario === 'error' && !isSession) {
        return new Response(
          JSON.stringify({
            success: false,
            errorCode: 'INTERNAL_ERROR',
            message: 'Injected failure (?mock=error)',
            timestamp: now(),
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }

      // A handler that refused the write answers like the API does, not with success: true.
      const refusal = (data as { __refusal?: { status: number; message: string } })?.__refusal
      if (refusal) {
        return new Response(
          JSON.stringify({
            success: false,
            errorCode: 'BUSINESS_RULE_VIOLATION',
            message: refusal.message,
            timestamp: now(),
          }),
          { status: refusal.status, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const payload = scenario === 'empty' && !isSession ? emptied(data) : data

      return new Response(JSON.stringify({ success: true, data: payload, timestamp: now() }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return passthrough(input as RequestInfo, init)
  }

  // eslint-disable-next-line no-console
  console.info(
    `[mocks] Serving fixture data as a ${userType === 'startup' ? 'STARTUP' : 'VC'} user` +
      (scenario === 'off' ? '' : ` in "${scenario}" mode`) + '. ' +
      `Switch with ?as=startup / ?as=vc, and ?mock=error | empty | slow | signedout | off`
  )
}
