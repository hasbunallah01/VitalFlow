# Security Policy

## Reporting a vulnerability

**Do not open a public issue.**

Report privately via [GitHub Security Advisories](https://github.com/hasbunallah01/VitalFlow/security/advisories/new).

Please include: what the issue is, how to reproduce it, what an attacker could achieve, and any suggested fix.

You can expect acknowledgement within 72 hours and an assessment within 7 days. We will keep you updated through to resolution and will credit you in the advisory unless you prefer otherwise.

## Scope

VitalFlow handles bank statement data. We are particularly interested in reports concerning:

- Cross-organisation data access — any path that reads another business's data
- Unauthorised access to uploaded files or generated reports
- PII leakage to third-party model providers
- Prompt injection via transaction descriptions producing harmful or misleading output
- Share-link enumeration, forgery, or failure to expire
- CSV parsing vulnerabilities (resource exhaustion, formula injection)
- Authentication and session handling flaws

## Out of scope

- Reports generated solely by automated scanners with no demonstrated impact
- Missing best-practice headers with no exploitable consequence
- Social engineering, physical attacks, or denial of service via volume
- Vulnerabilities in third-party dependencies without a demonstrated path in VitalFlow

## Supported versions

Pre-release. Only `main` is supported until v1.0.0.

## Handling of sensitive data

See [docs/SECURITY_PRIVACY.md](docs/SECURITY_PRIVACY.md).
