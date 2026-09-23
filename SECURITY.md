# Security Policy

**VC × Startup Platform** handles sensitive venture capital data, portfolio positions, cap tables, and investment decision-making information. Security is a foundational requirement, not an add-on. This policy reflects that priority.

---

## Table of Contents

- [Supported Versions](#supported-versions)
- [Security Principles](#security-principles)
- [Reporting a Vulnerability](#reporting-a-vulnerability)
- [Response Timeline](#response-timeline)
- [Security Commitments](#security-commitments)
- [Data Protection Standards](#data-protection-standards)
- [Known Security Constraints](#known-security-constraints)

---

## Supported Versions

Only the current and previous major versions receive active security support. Given the financial sensitivity of this application, security patches take priority over feature releases.

| Version | Status | Security Support | Notes |
| --- | --- | --- | --- |
| 2.x | Stable | ✅ Active | Current stable release |
| 1.x | Legacy | ✅ 6 months | Security patches only; critical issues prioritized |
| < 1.0 | Pre-release | ❌ Deprecated | Do not use in production |

### Patch Release Cadence

- **Critical security patches**: deployed within 48 hours of discovery and verification
- **High-severity patches**: deployed within 1 week
- **Medium-severity patches**: included in next scheduled release (rolling window)

---

## Security Principles

### Core Commitments

1. **Zero tolerance for data breach risk**  
   Portfolio positions, cap tables, and investment theses are non-public. Any vulnerability exposing customer data is treated as critical.

2. **Encryption first**  
   All data in transit (TLS 1.3 minimum) and at rest (AES-256) by default. No exceptions for "internal" data.

3. **Least privilege access**  
   Tenant isolation enforced at the service layer. A user cannot query another fund's data, period.

4. **Audit everything**  
   Every data access, every API call, every configuration change is logged with immutable timestamps and actor identification.

5. **Assume breach**  
   Build for forensic visibility. If data is compromised, you will be able to answer: who saw what, when, and from where.

### Operational Standards

- **No production data on developer machines** — ever
- **Code review on every merge** — security review on any change touching auth, encryption, or data access
- **Dependency scanning on every build** — vulnerabilities in dependencies block CI/CD
- **Annual penetration testing** — minimum; more frequent for critical features
- **Secure-by-default configuration** — strong defaults, require explicit action to weaken security

---

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.** Disclosure in public signals an attack window before a patch exists.

### How to Report

**Email**: security@[your-domain].com  
**PGP key**: [publish your public key or link to keybase]  
**Response SLA**: 24 hours acknowledgment; full assessment within 5 business days

### What to Include

1. **Vulnerability description** — what is the flaw
2. **Affected version(s)** — which releases are vulnerable
3. **Steps to reproduce** — clear, minimal reproduction
4. **Impact assessment** — what data/systems are at risk
5. **Your contact info** — how we reach you with updates

### Example Report

```
To: security@[your-domain].com
Subject: [SECURITY] Authentication bypass in deal-triage endpoint (v1.2.1)

Description:
The /api/v1/triage/{fundId}/score endpoint does not validate fund_id 
against the authenticated user's permitted funds. A user with valid auth 
can triage deals for any fund by guessing a different fundId.

Affected versions: 1.2.0, 1.2.1
Fixed in: 1.2.2 (unreleased)

Steps to reproduce:
1. Authenticate as User A (assigned to Fund X)
2. Call POST /api/v1/triage/999/score with deal data
3. Observe that the score is recorded against Fund 999 (arbitrary fund)

Impact:
- Data integrity: unauthorized deal records written to other funds' portfolios
- Information disclosure: a user can read portfolio structure via error messages
- Potential data leakage: inferred holdings reveal positions of competing funds

Contact: [your name], [phone], [secure messaging app]
```

---

## Response Timeline

### Critical (CVSS 9.0–10.0)

Vulnerabilities permitting unauthorized access to portfolio data, cap tables, or user credentials.

| Phase | Timeline | Action |
| --- | --- | --- |
| **Discovery** | Immediate | Page on-call security team; open incident response |
| **Assessment** | 2 hours | Reproduce; determine scope of exposure |
| **Patch development** | 4 hours | Fix coded; unit tested |
| **QA / security review** | 6 hours | Regression testing; audit log verification |
| **Production deployment** | 24 hours max | Push to all environments; notify customers |
| **Post-incident** | +5 days | Full forensics; affected-account notification; root cause analysis |

### High (CVSS 7.0–8.9)

Significant vulnerabilities requiring elevated access or multiple steps, but exposing sensitive data.

| Phase | Timeline | Action |
| --- | --- | --- |
| **Assessment** | 24 hours | Reproduce; impact analysis |
| **Patch / workaround** | 48 hours | Code fix OR interim control (e.g., rate limit, IP restrict) |
| **Testing & deployment** | 72 hours | Deploy to production; notify affected users |

### Medium (CVSS 4.0–6.9)

Exploitable vulnerabilities with limited impact or requiring specific conditions.

| Phase | Timeline | Action |
| --- | --- | --- |
| **Assessment** | 1 week | Reproduce; risk ranking against other work |
| **Fix** | 2 weeks | Included in next planned release |
| **Notification** | At release | Security advisory published with mitigation steps |

### Low (CVSS 0.1–3.9)

Theoretical vulnerabilities, very difficult exploitation, or affecting non-sensitive features.

| Phase | Timeline | Action |
| --- | --- | --- |
| **Assessment** | 2 weeks | Reproduce; prioritize against backlog |
| **Fix** | Next release cycle | Bundled with other maintenance work |

---

## Security Commitments

### What You Can Expect

✅ **Transparent communication**  
We will not hide a vulnerability or delay disclosure to cover up a mistake. A patch issued without full transparency will harm your trust more than the original flaw.

✅ **Public advisories on all fixes**  
Every security fix ≥ Medium severity gets a published advisory (CVE request filed for High/Critical). You will know what was broken and why.

✅ **Backward-incompatible security changes without breaking API**  
If a security fix requires a change in behavior, we will version it, document the migration, and support both code paths for one release cycle.

✅ **Responsible disclosure**  
If a fix addresses a novel attack vector, we will coordinate disclosure with security researchers and work with industry standards bodies (e.g., OWASP) before public announcement.

### What We Require

✅ **Reasonable disclosure grace period**  
Give us 90 days to patch before publishing the vulnerability. For critical flaws, we may ask for shorter windows; we will always honour a commitment made before the fix ships.

✅ **Good-faith research**  
Do not exploit a vulnerability for data theft, disruption, or competitive advantage. Testing is research. Extraction is crime.

✅ **Respect for privacy**  
Minimize data exposure during testing. Do not report the vulnerability in public before giving us a chance to respond. Do not sell or share the vulnerability details with third parties without our permission.

---

## Data Protection Standards

### Encryption

| Context | Standard | Key Management |
| --- | --- | --- |
| **Data in transit** | TLS 1.3 minimum; HSTS enforced | Certificates rotated every 90 days; automated renewal via Let's Encrypt |
| **Data at rest — customer data** | AES-256 (GCM mode); authenticated encryption | Per-tenant encryption keys stored in AWS Secrets Manager; automatic key rotation every 180 days |
| **Data at rest — API keys / credentials** | AES-256 (GCM mode) | Key encryption keys (KEKs) stored in HSM; regular rotation |
| **Backups** | Same encryption as live data; encrypted transport to cold storage | Immutable backup keys; separate from operational key store |

### Authentication & Authorization

| Control | Requirement | Verification |
| --- | --- | --- |
| **MFA** | Mandatory for all user accounts; TOTP (RFC 6238) or hardware keys | Enforced at login; no bypass for any reason |
| **Session management** | 30-minute inactivity timeout; re-auth for sensitive operations (portfolio upload, API key generation) | Audit log of all session events |
| **Role-based access** | Three roles per fund: Owner (all permissions), Member (read/triage/report), Viewer (read-only) | Policy evaluated on every API call |
| **API authentication** | Bearer tokens (JWT); 90-day expiration; automatic rotation | Tokens include subject (fund_id), issued-at, expiration, rate limit claims |
| **Third-party integrations** | OAuth 2.0 (authorization code flow) with PKCE; no client credentials exposed to frontend | Token lifetime ≤ 1 hour; refresh tokens stored server-side only |

### Audit Logging

Every action is logged with these fields:

```json
{
  "timestamp": "2026-09-24T14:32:18.123Z",
  "actor": "user_uuid | service_account_id",
  "action": "portfolio.imported | deal.triaged | conflict.analyzed",
  "resource": "fund_id:12345 | deal_id:67890",
  "status": "success | failure",
  "error_code": "null | 'unauthorized' | 'validation_failed'",
  "ip_address": "203.0.113.45",
  "user_agent": "[truncated; first 200 chars only]",
  "request_id": "req_uuid"
}
```

**Retention**: 7 years (regulatory requirement for investment records).  
**Access**: Restricted to security team and legal; queryable only via audit dashboard (no raw log export).  
**Tamper-proofing**: Logs stored in append-only database; cryptographic signatures on audit trail at 4-hour intervals.

### Secrets Management

| Secret Type | Storage | Rotation | Access |
| --- | --- | --- | --- |
| **Database passwords** | AWS Secrets Manager (encrypted, versioned) | 90 days automatic | EC2 IAM role; no hardcoding |
| **API keys** | Secrets Manager + in-memory cache (refreshed hourly) | 180 days | Service-specific IAM policies |
| **Signing keys** | AWS CloudHSM (hardware-backed) | 365 days | HSM partition PIN required; logged |
| **OAuth client secrets** | Secrets Manager | On each integration setup | Service account only; human access via break-glass procedure |

### Network Security

| Layer | Control | Details |
| --- | --- | --- |
| **Ingress** | API Gateway + WAF (AWS) | Rate limiting (100 req/min per user, 10k req/min global); IP filtering by geographic region; SQL injection / XSS blocking rules active |
| **VPC** | Private subnets for all compute / data | NAT Gateway for outbound; no public IPs on databases |
| **Database** | Security groups; encrypted connections only | Port 5432 open only to application tier; password auth + SSL required |
| **Outbound** | Approved domains only (for API calls, webhooks) | HTTPS-only; certificate pinning for third-party integrations |

---

## Known Security Constraints

### Phase 1 (Current)

These limitations are intentional trade-offs for speed to market. They will be addressed before Phase 2 or production scaling.

| Constraint | Impact | Timeline for Fix |
| --- | --- | --- |
| **No SOC 2 Type II audit** | Funds with strict compliance requirements cannot buy. Gates the $250M+ AUM segment. | Month 12 (end of Year 1) |
| **Single-region deployment** | A region-wide AWS outage or geographic data localization requirement blocks some customers. | Post-Series A or when customer demand justifies |
| **No advanced threat detection (SIEM)** | Real-time anomaly detection not available; incident response is manual triage of logs. | Month 6 (post revenue confirmation) |
| **Development environment access** | Non-production databases hold sample data, not real fund positions. No production data cloned to dev. | Existing; will document formally |
| **Rate limiting by API key only** | DDoS protection is AWS WAF rules, not application-layer. Sophisticated attacks harder to detect. | Post-launch if DDoS observed |

### Unsupported Threat Models

The following are explicitly **not** in scope for Phase 1. They will be re-assessed at Month 12.

- **Insider threat from employees** — assume background checks and access controls; no internal audit trail segregation
- **Nation-state adversaries** — you are not our threat model; go hire a CISO if you need this
- **Supply-chain attacks on open-source dependencies** — we use dependency scanning; we do not rewrite the entire ecosystem
- **Side-channel attacks** (timing, power analysis) — not practical against web services; irrelevant at this scale

---

## Pre-Launch Security Checklist

Before the first customer uploads portfolio data, these must be true:

- [ ] TLS 1.3 enabled; HSTS header set to 1 year
- [ ] All user passwords hashed with bcrypt (cost ≥ 12); salted
- [ ] Database encryption at rest enabled; keys in Secrets Manager
- [ ] Audit logging implemented and tested; 7-year retention configured
- [ ] Multi-tenant isolation tested; one user cannot query another fund's data
- [ ] MFA mandatory for all accounts; TOTP enforced
- [ ] API keys expire after 90 days; cannot be viewed after creation
- [ ] Rate limiting deployed; 100 req/min per user
- [ ] DPA drafted by legal; published on website
- [ ] Privacy Policy and Terms of Service reviewed for compliance (GDPR, India DPDP)
- [ ] Secrets not hardcoded; credential rotation documented
- [ ] Dependency scan clean (no High/Critical CVEs)
- [ ] CORS policy restricted to known domains only
- [ ] SQL injection tests passed; parameterized queries enforced
- [ ] XSS tests passed; CSP headers deployed
- [ ] Backup and restore tested end-to-end; encryption verified
- [ ] Incident response runbook drafted; on-call rotation assigned

---

## Security Champions & Contact

| Role | Responsibility | Contact |
| --- | --- | --- |
| **Security Lead** | Policy, incident response, audit | Dhruv Patel (technical co-founder) |
| **Compliance Lead** | Legal, regulatory, DPA | [Commercial co-founder name TBD] |
| **DevOps / Infrastructure** | Secrets management, encryption, monitoring | Dhruv Patel |
| **Security Researcher** | External: bug bounty coordination (TBD) | security@[domain] |

---

## Updates to This Policy

This policy will be reviewed and updated:

- **Quarterly** — to reflect new threats or lessons learned
- **On every major release** — to document new security features
- **After any security incident** — to close gaps exposed by the incident

**Last updated**: 22 July 2026  
**Next review**: 22 October 2026
