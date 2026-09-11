// Fixture data for the dev-only mock backend. Not bundled unless VITE_USE_MOCKS=true.
const iso = (daysAgo: number) =>
  new Date(Date.now() - daysAgo * 86_400_000).toISOString()

export const makeDb = () => ({
  user: {
    id: 'u-1',
    email: 'arjun@meridian.vc',
    userType: 'VC',
    isActive: true,
    accountSetupComplete: true,
  },

  startupUser: {
    id: 'u-9',
    email: 'priya@lumen.health',
    userType: 'STARTUP',
    isActive: true,
    accountSetupComplete: true,
  },

  firm: {
    id: 'f-1',
    name: 'Meridian Ventures',
    description:
      'Early-stage fund backing technical founders building for Indian SMBs. We lead seed rounds and hold reserves through Series A.',
    website: 'https://meridian.vc',
    aum: 480,
    investmentStage: 'Seed',
    sectors: ['Fintech', 'SaaS', 'Logistics', 'AI/ML'],
    location: 'Bengaluru, India',
    foundedYear: 2018,
    planTier: 'STARTER',
    thesis: {
      sectors: ['Fintech', 'SaaS', 'Logistics', 'AI/ML'],
      stages: ['PRE_SEED', 'SEED', 'SERIES_A'],
      chequeSizeMin: 25_000_000,
      chequeSizeMax: 150_000_000,
      currency: 'INR',
      notes:
        'Technical founding teams selling to Indian SMBs. Prefer capital-efficient businesses with early revenue. Avoid pure marketplaces and anything requiring heavy field ops.',
      updatedAt: iso(12),
    },
    createdAt: iso(900),
    updatedAt: iso(12),
  },

  members: [
    { id: 'm-1', userId: 'u-1', userEmail: 'arjun@meridian.vc', firmId: 'f-1', role: 'OWNER', joinedAt: iso(900), createdAt: iso(900), updatedAt: iso(900) },
    { id: 'm-2', userId: 'u-2', userEmail: 'divya@meridian.vc', firmId: 'f-1', role: 'PORTFOLIO_MANAGER', joinedAt: iso(420), createdAt: iso(420), updatedAt: iso(420) },
    { id: 'm-3', userId: 'u-3', userEmail: 'sameer@meridian.vc', firmId: 'f-1', role: 'STAFF', joinedAt: iso(120), createdAt: iso(120), updatedAt: iso(120) },
  ],

  startups: [
    { id: 's-1', name: 'Lumen Health', description: 'Clinic OS for India’s 80k independent diagnostic labs — billing, reporting, and patient comms in one workflow.', website: 'https://lumen.health', logoUrl: null, sector: 'Healthtech', stage: 'SEED', location: 'Bengaluru', foundedYear: 2022, annualRevenue: 42_00_000, teamSize: 18, pitchDeckUrl: 'https://example.com/lumen-deck', isRaising: true, createdAt: iso(400), updatedAt: iso(5) },
    { id: 's-2', name: 'Ledgerly', description: 'Automated reconciliation for mid-market finance teams. Plugs into Tally and Zoho Books.', website: 'https://ledgerly.in', logoUrl: null, sector: 'Fintech', stage: 'SERIES_A', location: 'Mumbai', foundedYear: 2020, annualRevenue: 3_20_00_000, teamSize: 54, pitchDeckUrl: null, isRaising: true, createdAt: iso(700), updatedAt: iso(9) },
    { id: 's-3', name: 'Freightwise', description: 'Freight procurement and tracking for manufacturers moving full truckloads across state lines.', website: 'https://freightwise.co', logoUrl: null, sector: 'Logistics', stage: 'SEED', location: 'Pune', foundedYear: 2021, annualRevenue: 85_00_000, teamSize: 26, pitchDeckUrl: 'https://example.com/fw-deck', isRaising: false, createdAt: iso(520), updatedAt: iso(30) },
    { id: 's-4', name: 'Cohortly', description: 'Retention analytics for consumer subscription apps. Self-serve, no data team required.', website: 'https://cohortly.app', logoUrl: null, sector: 'SaaS', stage: 'PRE_SEED', location: 'Remote', foundedYear: 2024, annualRevenue: 8_00_000, teamSize: 6, pitchDeckUrl: null, isRaising: true, createdAt: iso(180), updatedAt: iso(2) },
    { id: 's-5', name: 'Kisan Direct', description: 'Farm-gate procurement marketplace connecting FPOs to institutional buyers.', website: 'https://kisandirect.in', logoUrl: null, sector: 'Agritech', stage: 'SERIES_A', location: 'Nashik', foundedYear: 2019, annualRevenue: 6_10_00_000, teamSize: 88, pitchDeckUrl: null, isRaising: false, createdAt: iso(800), updatedAt: iso(45) },
    { id: 's-6', name: 'Vaultline', description: 'Compliance automation for RBI-regulated NBFCs — audit trails, filings, and policy drift detection.', website: 'https://vaultline.io', logoUrl: null, sector: 'Fintech', stage: 'SEED', location: 'Gurugram', foundedYear: 2023, annualRevenue: 28_00_000, teamSize: 14, pitchDeckUrl: 'https://example.com/vl-deck', isRaising: true, createdAt: iso(300), updatedAt: iso(7) },
    { id: 's-7', name: 'Stackline AI', description: 'Fine-tuning and eval infrastructure for teams shipping domain-specific LLM features.', website: 'https://stackline.ai', logoUrl: null, sector: 'AI/ML', stage: 'SEED', location: 'Hyderabad', foundedYear: 2023, annualRevenue: 55_00_000, teamSize: 21, pitchDeckUrl: null, isRaising: true, createdAt: iso(260), updatedAt: iso(4) },
    { id: 's-8', name: 'Sundial Energy', description: 'Rooftop solar financing and monitoring for commercial buildings.', website: 'https://sundial.energy', logoUrl: null, sector: 'Climate', stage: 'SERIES_B', location: 'Chennai', foundedYear: 2017, annualRevenue: 14_50_00_000, teamSize: 140, pitchDeckUrl: null, isRaising: false, createdAt: iso(1200), updatedAt: iso(60) },
  ],

  investments: [
    { id: 'i-1', vcFirmId: 'f-1', startupId: 's-3', startupName: 'Freightwise', startupSector: 'Logistics', startupLogoUrl: null, investmentDate: iso(430), amount: 60_000_000, currency: 'INR', round: 'SEED', equityPercentage: 9.5, status: 'ACTIVE', notes: 'Led the seed. Board observer seat. Strong ops hire in Q2.', createdAt: iso(430), updatedAt: iso(30) },
    { id: 'i-2', vcFirmId: 'f-1', startupId: 's-5', startupName: 'Kisan Direct', startupSector: 'Agritech', startupLogoUrl: null, investmentDate: iso(690), amount: 120_000_000, currency: 'INR', round: 'SERIES_A', equityPercentage: 6.2, status: 'ACTIVE', notes: 'Follow-on from seed. Revenue up 3.1x YoY.', createdAt: iso(690), updatedAt: iso(45) },
    { id: 'i-3', vcFirmId: 'f-1', startupId: 's-8', startupName: 'Sundial Energy', startupSector: 'Climate', startupLogoUrl: null, investmentDate: iso(1100), amount: 45_000_000, currency: 'INR', round: 'SEED', equityPercentage: 4.0, status: 'EXITED', notes: 'Partial secondary at Series B. 4.2x on the position.', createdAt: iso(1100), updatedAt: iso(200) },
    { id: 'i-4', vcFirmId: 'f-1', startupId: 's-2', startupName: 'Ledgerly', startupSector: 'Fintech', startupLogoUrl: null, investmentDate: iso(540), amount: 90_000_000, currency: 'INR', round: 'SERIES_A', equityPercentage: 5.1, status: 'ACTIVE', notes: 'Reconciliation volume doubled after the Tally integration shipped.', createdAt: iso(540), updatedAt: iso(9) },
    { id: 'i-5', vcFirmId: 'f-1', startupId: 's-6', startupName: 'Vaultline', startupSector: 'Fintech', startupLogoUrl: null, investmentDate: iso(210), amount: 35_000_000, currency: 'INR', round: 'SEED', equityPercentage: 8.0, status: 'ACTIVE', notes: 'Compliance tailwind from the new RBI circular.', createdAt: iso(210), updatedAt: iso(7) },
  ],

  pool: [
    { id: 'p-1', vcFirmId: 'f-1', startupId: 's-7', companyName: 'Stackline AI', sector: 'AI/ML', stage: 'SEED', addedByEmail: 'divya@meridian.vc', tags: ['ai-infra', 'revisit-Q3'], notes: 'Strong team out of a large-model lab. Waiting on revenue proof.', interestLevel: 'HIGH_PRIORITY', addedAt: iso(40) },
    { id: 'p-2', vcFirmId: 'f-1', startupId: 's-4', companyName: 'Cohortly', sector: 'SaaS', stage: 'PRE_SEED', addedByEmail: 'arjun@meridian.vc', tags: ['too-early'], notes: 'Nice wedge, but pre-seed is below our range right now.', interestLevel: 'WATCHING', addedAt: iso(22) },
    { id: 'p-3', vcFirmId: 'f-1', startupId: null, companyName: 'Nimbus Payroll', sector: 'SaaS', stage: 'SEED', addedByEmail: 'sameer@meridian.vc', tags: ['off-platform', 'founder-known'], notes: 'Not signed up yet. Intro via a Ledgerly angel.', interestLevel: 'INTERESTED', addedAt: iso(15) },
    { id: 'p-4', vcFirmId: 'f-1', startupId: null, companyName: 'Terra Cold Chain', sector: 'Logistics', stage: 'SERIES_A', addedByEmail: 'divya@meridian.vc', tags: ['adjacent'], notes: 'Possible conflict with Freightwise — check before proceeding.', interestLevel: 'WATCHING', addedAt: iso(8) },
  ],

  cycles: [
    { id: 'fc-1', startupId: 's-1', startupName: 'Lumen Health', startupSector: 'Healthtech', startupStage: 'SEED', roundType: 'Seed', targetAmount: 80_000_000, currency: 'INR', minTicketSize: 10_000_000, maxTicketSize: 40_000_000, status: 'OPEN', pitchDeckUrl: 'https://example.com/lumen-deck', dataRoomUrl: null, openedAt: iso(35), closedAt: null, committedAmount: 47_000_000, commitmentCount: 3 },
    { id: 'fc-2', startupId: 's-6', startupName: 'Vaultline', startupSector: 'Fintech', startupStage: 'SEED', roundType: 'Seed', targetAmount: 60_000_000, currency: 'INR', minTicketSize: 5_000_000, maxTicketSize: 30_000_000, status: 'OPEN', pitchDeckUrl: 'https://example.com/vl-deck', dataRoomUrl: null, openedAt: iso(20), closedAt: null, committedAmount: 18_000_000, commitmentCount: 2 },
    { id: 'fc-3', startupId: 's-7', startupName: 'Stackline AI', startupSector: 'AI/ML', startupStage: 'SEED', roundType: 'Seed', targetAmount: 100_000_000, currency: 'INR', minTicketSize: 15_000_000, maxTicketSize: 50_000_000, status: 'OPEN', pitchDeckUrl: null, dataRoomUrl: null, openedAt: iso(12), closedAt: null, committedAmount: 25_000_000, commitmentCount: 1 },
    { id: 'fc-4', startupId: 's-4', startupName: 'Cohortly', startupSector: 'SaaS', startupStage: 'PRE_SEED', roundType: 'Pre-Seed', targetAmount: 25_000_000, currency: 'INR', minTicketSize: 2_500_000, maxTicketSize: 10_000_000, status: 'PAUSED', pitchDeckUrl: null, dataRoomUrl: null, openedAt: iso(60), closedAt: null, committedAmount: 6_000_000, commitmentCount: 1 },
  ],

  commitments: [
    { id: 'c-1', fundingCycleId: 'fc-1', vcFirmId: 'f-1', vcFirmName: 'Meridian Ventures', amount: 25_000_000, currency: 'INR', status: 'SOFT_COMMITTED', committedAt: iso(18) },
    { id: 'c-2', fundingCycleId: 'fc-1', vcFirmId: 'f-2', vcFirmName: 'Cascade Partners', amount: 15_000_000, currency: 'INR', status: 'COMMITTED', committedAt: iso(25) },
    { id: 'c-3', fundingCycleId: 'fc-1', vcFirmId: 'f-3', vcFirmName: 'Ganges Capital', amount: 7_000_000, currency: 'INR', status: 'INDICATED', committedAt: iso(6) },
    { id: 'c-4', fundingCycleId: 'fc-2', vcFirmId: 'f-2', vcFirmName: 'Cascade Partners', amount: 12_000_000, currency: 'INR', status: 'SOFT_COMMITTED', committedAt: iso(10) },
    { id: 'c-5', fundingCycleId: 'fc-2', vcFirmId: 'f-4', vcFirmName: 'Northlight', amount: 6_000_000, currency: 'INR', status: 'INDICATED', committedAt: iso(4) },
  ],

  firms: [
    { id: 'f-2', name: 'Cascade Partners', description: 'Multi-stage fund with a focus on B2B infrastructure.', website: 'https://cascade.partners', aum: 1200, investmentStage: 'Series A', sectors: ['SaaS', 'Fintech', 'Deeptech'], location: 'Mumbai', foundedYear: 2014, planTier: 'GROWTH', thesis: null, createdAt: iso(2000), updatedAt: iso(100) },
    { id: 'f-3', name: 'Ganges Capital', description: 'Seed fund backing founders outside metro hubs.', website: 'https://ganges.capital', aum: 220, investmentStage: 'Seed', sectors: ['Agritech', 'Logistics', 'Consumer'], location: 'Kolkata', foundedYear: 2020, planTier: 'STARTER', thesis: null, createdAt: iso(1400), updatedAt: iso(80) },
    { id: 'f-4', name: 'Northlight', description: 'Pre-seed cheques for technical founders, first money in.', website: 'https://northlight.fund', aum: 90, investmentStage: 'Pre-Seed', sectors: ['AI/ML', 'SaaS'], location: 'Bengaluru', foundedYear: 2022, planTier: 'FREE', thesis: null, createdAt: iso(900), updatedAt: iso(40) },
  ],

  opportunities: [
    {
      id: 'o-1', firmId: 'f-1', companyName: 'Stackline AI', website: 'https://stackline.ai', sector: 'AI/ML', stage: 'SEED',
      askAmount: 100_000_000, currency: 'INR',
      description: 'Fine-tuning and eval infrastructure for teams shipping domain-specific LLM features. 21 people, ₹55L ARR, mostly mid-market SaaS customers.',
      contactEmail: 'founders@stackline.ai', fitScore: 86,
      rationale: 'Strong thesis alignment: AI/ML is a stated sector, Seed is in range, and the ₹10 Cr ask sits inside the cheque band. Technical founding team selling to SMB-adjacent SaaS buyers matches the thesis note almost exactly. Main reservation is revenue concentration — top three customers are ~60% of ARR.',
      citations: [
        { claim: 'AI/ML is an explicitly listed thesis sector.', thesisField: 'sectors', supporting: true },
        { claim: 'Seed stage falls inside the PRE_SEED–SERIES_A range.', thesisField: 'stages', supporting: true },
        { claim: '₹10 Cr ask is within the ₹2.5–15 Cr cheque band.', thesisField: 'chequeSize', supporting: true },
        { claim: 'Revenue concentration in three accounts is a capital-efficiency risk the thesis notes flag.', thesisField: 'notes', supporting: false },
      ],
      recommendedAction: 'PURSUE', status: 'PENDING_REVIEW', decisionNote: null, scoredAt: iso(3), createdAt: iso(3), updatedAt: iso(3),
    },
    {
      id: 'o-2', firmId: 'f-1', companyName: 'Terra Cold Chain', website: null, sector: 'Logistics', stage: 'SERIES_A',
      askAmount: 180_000_000, currency: 'INR',
      description: 'Refrigerated transport network for pharma and perishables. Asset-heavy, operates 140 owned reefer trucks.',
      contactEmail: 'raise@terracold.in', fitScore: 41,
      rationale: 'Sector and stage are in range, but the model runs against the thesis directly. Heavy field operations and owned assets are named as an anti-pattern, and the ₹18 Cr ask exceeds the top of the cheque band. There is also a plausible overlap with Freightwise.',
      citations: [
        { claim: 'Logistics is a listed thesis sector.', thesisField: 'sectors', supporting: true },
        { claim: 'Owned-fleet field operations are named as an anti-pattern.', thesisField: 'notes', supporting: false },
        { claim: '₹18 Cr ask exceeds the ₹15 Cr cheque ceiling.', thesisField: 'chequeSize', supporting: false },
      ],
      recommendedAction: 'PASS', status: 'PENDING_REVIEW', decisionNote: null, scoredAt: iso(6), createdAt: iso(6), updatedAt: iso(6),
    },
    {
      id: 'o-3', firmId: 'f-1', companyName: 'Nimbus Payroll', website: 'https://nimbuspayroll.in', sector: 'SaaS', stage: 'SEED',
      askAmount: 55_000_000, currency: 'INR',
      description: 'Payroll and compliance for Indian SMBs under 200 headcount.',
      contactEmail: 'hello@nimbuspayroll.in', fitScore: 79,
      rationale: 'Squarely on thesis — SaaS sold to Indian SMBs, seed stage, cheque in range. Capital efficient at 14 people with ₹38L ARR. Held pending a reference call with two of their larger customers.',
      citations: [
        { claim: 'SaaS sold to Indian SMBs is the core thesis statement.', thesisField: 'notes', supporting: true },
        { claim: 'Seed stage is in range.', thesisField: 'stages', supporting: true },
        { claim: 'Limited evidence of retention beyond 12 months.', thesisField: 'notes', supporting: false },
      ],
      recommendedAction: 'NEEDS_MORE_INFO', status: 'NEEDS_MORE_INFO', decisionNote: null, scoredAt: iso(11), createdAt: iso(11), updatedAt: iso(9),
    },
    {
      id: 'o-4', firmId: 'f-1', companyName: 'Vaultline', website: 'https://vaultline.io', sector: 'Fintech', stage: 'SEED',
      askAmount: 60_000_000, currency: 'INR',
      description: 'Compliance automation for RBI-regulated NBFCs.',
      contactEmail: 'raise@vaultline.io', fitScore: 91,
      rationale: 'Highest-scoring opportunity this quarter. Fintech, seed, cheque in range, technical founders, and a regulatory tailwind. Approved and closed.',
      citations: [
        { claim: 'Fintech is a listed thesis sector.', thesisField: 'sectors', supporting: true },
        { claim: 'Technical founding team selling to regulated SMB lenders.', thesisField: 'notes', supporting: true },
      ],
      recommendedAction: 'PURSUE', status: 'APPROVED', decisionNote: 'Led the round at ₹3.5 Cr for 8%. Closed last quarter.', scoredAt: iso(215), createdAt: iso(220), updatedAt: iso(210),
    },
    {
      id: 'o-5', firmId: 'f-1', companyName: 'Bazaar Social', website: null, sector: 'Consumer', stage: 'SERIES_A',
      askAmount: 200_000_000, currency: 'INR',
      description: 'Social commerce app for tier-2 resellers.',
      contactEmail: null, fitScore: 18,
      rationale: 'Off thesis on every dimension. Consumer social commerce is not a listed sector, the model is a pure marketplace which the thesis excludes, and the ask is well above the cheque band.',
      citations: [
        { claim: 'Consumer is not among the listed thesis sectors.', thesisField: 'sectors', supporting: false },
        { claim: 'Pure marketplaces are explicitly excluded.', thesisField: 'notes', supporting: false },
        { claim: '₹20 Cr ask is far above the ₹15 Cr ceiling.', thesisField: 'chequeSize', supporting: false },
      ],
      recommendedAction: 'PASS', status: 'REJECTED', decisionNote: 'Passed — outside thesis on sector and model.', scoredAt: iso(48), createdAt: iso(50), updatedAt: iso(47),
    },
    {
      id: 'o-6', firmId: 'f-1', companyName: 'Reeve Robotics', website: 'https://reeve.bot', sector: 'Deeptech', stage: 'PRE_SEED',
      askAmount: 30_000_000, currency: 'INR',
      description: 'Warehouse picking arms for mid-size 3PL operators.',
      contactEmail: 'team@reeve.bot', fitScore: null, rationale: null, citations: [],
      recommendedAction: null, status: 'SCORING', decisionNote: null, scoredAt: null, createdAt: iso(0), updatedAt: iso(0),
    },
  ],

  conflictReports: [
    {
      id: 'cr-1', opportunityId: 'o-2', opportunityName: 'Terra Cold Chain',
      overallConfidence: 0.72, comparedCompanyCount: 4, generatedAt: iso(5),
      dimensions: [
        { dimension: 'SECTOR_OVERLAP', confidence: 0.88, summary: 'Both operate in road freight for manufacturers and distributors. Freightwise is an existing active holding in the same sector and adjacent stage.', matches: [{ portfolioCompanyId: 'i-1', portfolioCompanyName: 'Freightwise', note: 'Same sector, overlapping shipper profile in western India.' }] },
        { dimension: 'CUSTOMER_OVERLAP', confidence: 0.64, summary: 'Named target accounts include two pharma distributors that Freightwise lists as reference customers.', matches: [{ portfolioCompanyId: 'i-1', portfolioCompanyName: 'Freightwise', note: 'Two shared named accounts in the Pune–Mumbai corridor.' }] },
        { dimension: 'COMPETITIVE_PRODUCT', confidence: 0.41, summary: 'Products are adjacent rather than directly competing — Freightwise is procurement software, Terra owns and operates the fleet. Convergence risk exists if Terra launches a shipper-facing booking product.', matches: [{ portfolioCompanyId: 'i-1', portfolioCompanyName: 'Freightwise', note: 'Adjacent today; roadmap overlap plausible within 18 months.' }] },
      ],
    },
  ],

  digests: [
    {
      id: 'd-1', vcFirmId: 'f-1', periodStart: iso(7), periodEnd: iso(0), sentAt: iso(0), companyCount: 4,
      summaryMarkdown: `## This week

Four active holdings reported. Two moved materially, one is quiet, and one needs attention.

### Ledgerly
Reconciliation volume is up **34% week over week** following the Tally integration launch. The team added two enterprise logos and now sits at ₹3.2 Cr ARR. No asks this week.

### Vaultline
The new RBI circular on NBFC audit trails landed in their favour — inbound doubled. Hiring two solutions engineers to keep up with onboarding.

### Freightwise
Quiet week. Last metrics update was **32 days ago**, which is past the staleness threshold. Worth a nudge before the quarterly review.

### Kisan Direct
Procurement volumes dipped with the seasonal cycle, in line with last year. Runway remains comfortable at 19 months.

---

**Suggested follow-ups**
- Ask Freightwise for updated shipment and revenue numbers
- Intro Vaultline to two compliance leads from the Ledgerly network`,
      alerts: [
        { investmentId: 'i-1', startupName: 'Freightwise', severity: 'WARNING', message: 'No metrics update in 32 days — past the 30-day staleness threshold.' },
        { investmentId: 'i-4', startupName: 'Ledgerly', severity: 'INFO', message: 'ARR up 34% week over week after the Tally integration shipped.' },
        { investmentId: 'i-5', startupName: 'Vaultline', severity: 'INFO', message: 'Regulatory tailwind: inbound doubled after the RBI circular.' },
      ],
      createdAt: iso(0),
    },
    {
      id: 'd-2', vcFirmId: 'f-1', periodStart: iso(14), periodEnd: iso(7), sentAt: iso(7), companyCount: 4,
      summaryMarkdown: `## Previous week

A steadier week across the portfolio.

### Ledgerly
Shipped the Tally integration to general availability. Early signal is positive but too soon to read into revenue.

### Kisan Direct
Closed a supply agreement with a second institutional buyer. Should show up in next month's volumes.

### Freightwise
Metrics update overdue at 25 days.`,
      alerts: [
        { investmentId: 'i-1', startupName: 'Freightwise', severity: 'INFO', message: 'Metrics update overdue at 25 days.' },
      ],
      createdAt: iso(7),
    },
  ],

  connections: [
    { id: 'cx-1', from: { userId: 'u-9', email: 'priya@lumen.health', displayName: 'Priya Raghavan', entityType: 'STARTUP', entityId: 's-1', entityName: 'Lumen Health', logoUrl: null }, to: { userId: 'u-1', email: 'arjun@meridian.vc', displayName: 'Arjun Mehta', entityType: 'VC_FIRM', entityId: 'f-1', entityName: 'Meridian Ventures', logoUrl: null }, status: 'PENDING', message: 'We are raising a ₹8 Cr seed and Meridian keeps coming up as the most founder-friendly fund in healthtech-adjacent SaaS. Would love 20 minutes.', requestedAt: iso(2), respondedAt: null },
    { id: 'cx-2', from: { userId: 'u-11', email: 'dev@cohortly.app', displayName: 'Dev Sharma', entityType: 'STARTUP', entityId: 's-4', entityName: 'Cohortly', logoUrl: null }, to: { userId: 'u-1', email: 'arjun@meridian.vc', displayName: 'Arjun Mehta', entityType: 'VC_FIRM', entityId: 'f-1', entityName: 'Meridian Ventures', logoUrl: null }, status: 'PENDING', message: 'Pre-seed, ₹2.5 Cr. Happy to share the retention data room.', requestedAt: iso(5), respondedAt: null },
    { id: 'cx-3', from: { userId: 'u-1', email: 'arjun@meridian.vc', displayName: 'Arjun Mehta', entityType: 'VC_FIRM', entityId: 'f-1', entityName: 'Meridian Ventures', logoUrl: null }, to: { userId: 'u-12', email: 'founders@stackline.ai', displayName: 'Rhea Kapoor', entityType: 'STARTUP', entityId: 's-7', entityName: 'Stackline AI', logoUrl: null }, status: 'ACCEPTED', message: 'Saw your eval tooling demo. Would like to understand the wedge better.', requestedAt: iso(14), respondedAt: iso(13) },
  ],

  conversations: [
    { id: 'cv-1', counterparty: { userId: 'u-12', email: 'founders@stackline.ai', displayName: 'Rhea Kapoor', entityType: 'STARTUP', entityId: 's-7', entityName: 'Stackline AI', logoUrl: null }, lastMessagePreview: 'Sending the cohort retention breakdown tonight.', lastMessageAt: iso(1), unreadCount: 2, createdAt: iso(13) },
    { id: 'cv-2', counterparty: { userId: 'u-13', email: 'ceo@ledgerly.in', displayName: 'Nikhil Rao', entityType: 'STARTUP', entityId: 's-2', entityName: 'Ledgerly', logoUrl: null }, lastMessagePreview: 'Board deck is in the shared folder.', lastMessageAt: iso(4), unreadCount: 0, createdAt: iso(400) },
  ],

  messages: {
    'cv-1': [
      { id: 'msg-1', conversationId: 'cv-1', senderUserId: 'u-1', senderEmail: 'arjun@meridian.vc', body: 'Thanks for accepting. The eval harness is the part I found most interesting — how much of that is defensible versus table stakes in 12 months?', sentAt: iso(13), readAt: iso(13) },
      { id: 'msg-2', conversationId: 'cv-1', senderUserId: 'u-12', senderEmail: 'founders@stackline.ai', body: 'Fair question. The harness itself commoditises. What does not is the labelled failure corpus we accumulate per customer domain — that is what makes the fine-tunes work and it compounds.', sentAt: iso(12), readAt: iso(12) },
      { id: 'msg-3', conversationId: 'cv-1', senderUserId: 'u-1', senderEmail: 'arjun@meridian.vc', body: 'That is the right answer. What does concentration look like right now?', sentAt: iso(3), readAt: iso(3) },
      { id: 'msg-4', conversationId: 'cv-1', senderUserId: 'u-12', senderEmail: 'founders@stackline.ai', body: 'Top three are about 60% of ARR. We know it is high. Two of the three signed 24-month contracts last month which helps a little.', sentAt: iso(2), readAt: null },
      { id: 'msg-5', conversationId: 'cv-1', senderUserId: 'u-12', senderEmail: 'founders@stackline.ai', body: 'Sending the cohort retention breakdown tonight.', sentAt: iso(1), readAt: null },
    ],
    'cv-2': [
      { id: 'msg-6', conversationId: 'cv-2', senderUserId: 'u-13', senderEmail: 'ceo@ledgerly.in', body: 'Tally integration is GA. Reconciliation volume already up meaningfully.', sentAt: iso(6), readAt: iso(6) },
      { id: 'msg-7', conversationId: 'cv-2', senderUserId: 'u-1', senderEmail: 'arjun@meridian.vc', body: 'Great news. Does that change the Series B timing at all?', sentAt: iso(5), readAt: iso(5) },
      { id: 'msg-8', conversationId: 'cv-2', senderUserId: 'u-13', senderEmail: 'ceo@ledgerly.in', body: 'Board deck is in the shared folder.', sentAt: iso(4), readAt: iso(4) },
    ] as Record<string, unknown>[],
  } as Record<string, Record<string, unknown>[]>,

  wishlist: [
    { id: 'w-1', targetType: 'STARTUP', targetId: 's-7', targetName: 'Stackline AI', targetSector: 'AI/ML', targetStage: 'SEED', targetLogoUrl: null, note: 'Revisit after the retention data lands.', savedAt: iso(14) },
    { id: 'w-2', targetType: 'STARTUP', targetId: 's-1', targetName: 'Lumen Health', targetSector: 'Healthtech', targetStage: 'SEED', targetLogoUrl: null, note: null, savedAt: iso(6) },
    { id: 'w-3', targetType: 'STARTUP', targetId: 's-4', targetName: 'Cohortly', targetSector: 'SaaS', targetStage: 'PRE_SEED', targetLogoUrl: null, note: 'Too early for us today.', savedAt: iso(20) },
  ],

  events: [
    { id: 'e-1', title: 'Meridian Seed Demo Day', description: 'Eight portfolio companies present to a room of Series A funds. Invite only for the founder cohort.', eventType: 'DEMO_DAY', hostName: 'Meridian Ventures', hostUserId: 'u-1', startTime: iso(-9), endTime: iso(-9), location: 'Bengaluru', virtualLink: null, isPublic: true, attendeeCount: 64, myRsvp: 'GOING' },
    { id: 'e-2', title: 'Office Hours: Fintech Compliance', description: 'Open slots with the Vaultline team on navigating RBI audit requirements.', eventType: 'OFFICE_HOURS', hostName: 'Vaultline', hostUserId: 'u-14', startTime: iso(-3), endTime: null, location: null, virtualLink: 'https://meet.example.com/vaultline', isPublic: true, attendeeCount: 22, myRsvp: null },
    { id: 'e-3', title: 'India SaaS Founders Mixer', description: 'Informal networking for seed and Series A SaaS founders.', eventType: 'NETWORKING', hostName: 'Cascade Partners', hostUserId: 'u-15', startTime: iso(-16), endTime: null, location: 'Mumbai', virtualLink: null, isPublic: true, attendeeCount: 130, myRsvp: 'MAYBE' },
    { id: 'e-4', title: 'Webinar: Pricing for Indian SMBs', description: 'What actually converts below ₹50k ACV.', eventType: 'WEBINAR', hostName: 'Northlight', hostUserId: 'u-16', startTime: iso(-24), endTime: null, location: null, virtualLink: 'https://meet.example.com/pricing', isPublic: true, attendeeCount: 41, myRsvp: null },
  ],

  signals: [
    { id: 'sg-1', relatedStartupId: 's-2', relatedStartupName: 'Ledgerly', relatedVCFirmId: null, relatedVCFirmName: null, sourceUrl: 'https://example.com/news/ledgerly-tally', headline: 'Ledgerly ships Tally integration to general availability', summary: 'The integration removes the largest onboarding blocker for mid-market finance teams and is already driving a step change in reconciliation volume.', signalType: 'PRODUCT', sentiment: 'POSITIVE', publishedAt: iso(6), aiGenerated: true },
    { id: 'sg-2', relatedStartupId: 's-6', relatedStartupName: 'Vaultline', relatedVCFirmId: null, relatedVCFirmName: null, sourceUrl: 'https://example.com/news/rbi-circular', headline: 'New RBI circular tightens NBFC audit-trail requirements', summary: 'Regulated lenders must retain immutable policy-change logs from next quarter, expanding the addressable need for compliance automation.', signalType: 'REGULATORY', sentiment: 'POSITIVE', publishedAt: iso(9), aiGenerated: true },
    { id: 'sg-3', relatedStartupId: 's-7', relatedStartupName: 'Stackline AI', relatedVCFirmId: null, relatedVCFirmName: null, sourceUrl: null, headline: 'Stackline AI hiring five for the evals team', summary: 'Headcount plan suggests they are prioritising the eval product over fine-tuning services.', signalType: 'HIRING', sentiment: 'NEUTRAL', publishedAt: iso(4), aiGenerated: true },
    { id: 'sg-4', relatedStartupId: 's-5', relatedStartupName: 'Kisan Direct', relatedVCFirmId: null, relatedVCFirmName: null, sourceUrl: 'https://example.com/news/agri-volumes', headline: 'Seasonal dip in farm-gate procurement volumes', summary: 'Volumes down in line with the same period last year. No structural concern flagged.', signalType: 'MARKET', sentiment: 'NEGATIVE', publishedAt: iso(11), aiGenerated: true },
    { id: 'sg-5', relatedStartupId: null, relatedStartupName: null, relatedVCFirmId: 'f-2', relatedVCFirmName: 'Cascade Partners', sourceUrl: 'https://example.com/news/cascade-fund', headline: 'Cascade Partners closes ₹1,200 Cr third fund', summary: 'Larger fund size signals more competition for Series A rounds in B2B infrastructure.', signalType: 'FUNDING', sentiment: 'NEUTRAL', publishedAt: iso(18), aiGenerated: false },
    { id: 'sg-6', relatedStartupId: 's-1', relatedStartupName: 'Lumen Health', relatedVCFirmId: null, relatedVCFirmName: null, sourceUrl: null, headline: 'Lumen Health opens ₹8 Cr seed round', summary: 'Round is roughly 59% committed with two funds already soft-circled.', signalType: 'FUNDING', sentiment: 'POSITIVE', publishedAt: iso(30), aiGenerated: true },
  ],

  suggestions: [
    { id: 'as-1', suggestionType: 'STARTUP_FOR_VC', targetId: 's-1', targetName: 'Lumen Health', targetSector: 'Healthtech', targetStage: 'SEED', targetLogoUrl: null, score: 0.82, reasoning: 'Seed-stage vertical SaaS sold to small independent operators — structurally the same buyer profile as your Ledgerly and Vaultline positions. Round size sits inside your cheque band and they are actively raising.', status: 'PENDING', generatedAt: iso(2) },
    { id: 'as-2', suggestionType: 'STARTUP_FOR_VC', targetId: 's-6', targetName: 'Vaultline', targetSector: 'Fintech', targetStage: 'SEED', targetLogoUrl: null, score: 0.74, reasoning: 'Already a holding, but the open round is a follow-on opportunity. Regulatory tailwind materially improved the outlook since your entry.', status: 'PENDING', generatedAt: iso(2) },
    { id: 'as-3', suggestionType: 'STARTUP_FOR_VC', targetId: 's-4', targetName: 'Cohortly', targetSector: 'SaaS', targetStage: 'PRE_SEED', targetLogoUrl: null, score: 0.51, reasoning: 'Thesis-adjacent SaaS with a clean wedge, but pre-seed sits at the very bottom of your stated stage range and the ask is below your minimum cheque.', status: 'PENDING', generatedAt: iso(2) },
    { id: 'as-4', suggestionType: 'STARTUP_FOR_VC', targetId: 's-7', targetName: 'Stackline AI', targetSector: 'AI/ML', targetStage: 'SEED', targetLogoUrl: null, score: 0.88, reasoning: 'Highest-confidence match. AI/ML is a stated sector, the team is technical, and the compounding failure-corpus moat lines up with your preference for capital-efficient businesses.', status: 'PENDING', generatedAt: iso(2) },
  ],

  outreach: [
    { id: 'or-1', fromFirmId: 'f-1', fromFirmName: 'Meridian Ventures', toStartupId: 's-1', toStartupName: 'Lumen Health', subject: 'Meridian — seed round', body: 'Saw you opened a seed. We led Vaultline and Ledgerly, both selling into regulated SMB workflows. Would like to understand the lab billing wedge better.', status: 'RESPONDED', sentAt: iso(8) },
    { id: 'or-2', fromFirmId: 'f-1', fromFirmName: 'Meridian Ventures', toStartupId: 's-4', toStartupName: 'Cohortly', subject: 'Retention analytics — intro?', body: 'Early for us but worth staying close. Happy to be useful on customer intros in the meantime.', status: 'SEEN', sentAt: iso(19) },
    { id: 'or-3', fromFirmId: 'f-1', fromFirmName: 'Meridian Ventures', toStartupId: 's-8', toStartupName: 'Sundial Energy', subject: 'Secondary interest', body: 'Following up on the partial secondary conversation from last quarter.', status: 'IGNORED', sentAt: iso(70) },
  ],

  insights: {
    profileViews: 342,
    connectionRequestsReceived: 28,
    connectionRequestsAccepted: 17,
    activeConversations: 2,
    wishlistedByCount: 46,
    totalAmount: 350_000_000,
    currency: 'INR',
    entityCount: 4,
    funnel: [
      { label: 'Profile views', count: 342 },
      { label: 'Wishlisted', count: 46 },
      { label: 'Connection requests', count: 28 },
      { label: 'Accepted', count: 17 },
      { label: 'Investments made', count: 5 },
    ],
    sectorBreakdown: [
      { sector: 'Fintech', count: 2, amount: 125_000_000 },
      { sector: 'Logistics', count: 1, amount: 60_000_000 },
      { sector: 'Agritech', count: 1, amount: 120_000_000 },
      { sector: 'Climate', count: 1, amount: 45_000_000 },
    ],
    generatedAt: iso(0),
  },
})

export type MockDb = ReturnType<typeof makeDb>
