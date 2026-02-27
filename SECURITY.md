# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Currently supported versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via one of the following methods:

### 1. GitHub Security Advisories (Preferred)

Report vulnerabilities through GitHub's security advisory feature:
https://github.com/nexusclawdev/nexusclaw/security/advisories/new

### 2. Email

Send an email to: security@nexusclaw.dev (if available)

### What to Include

Please include the following information in your report:

- Type of vulnerability
- Full paths of source file(s) related to the vulnerability
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity
  - Critical: 1-7 days
  - High: 7-30 days
  - Medium: 30-90 days
  - Low: Best effort

## Security Best Practices

When using NexusClaw, follow these security best practices:

### API Keys

- Never commit API keys to version control
- Use environment variables or secure vaults
- Rotate keys regularly
- Use separate keys for development and production

### Configuration

- Enable `restrictToWorkspace` in production
- Review and limit allowed users for channels
- Use strong OAuth encryption secrets
- Keep dependencies updated

### Network Security

- Use HTTPS in production
- Implement rate limiting
- Use firewall rules to restrict access
- Monitor for unusual activity

### Data Protection

- Encrypt sensitive data at rest
- Use secure communication channels
- Implement proper access controls
- Regular security audits

## Known Security Considerations

### Browser Automation

- Playwright browser automation has access to system resources
- Only enable browser features if needed
- Review browser automation scripts carefully
- Consider running in sandboxed environments

### LLM Providers

- API keys grant access to paid services
- Monitor usage and set billing limits
- Be aware of data sent to third-party APIs
- Review provider security policies

### Multi-Channel Access

- Telegram/WhatsApp channels can expose your agent
- Use `allowFrom` to restrict access
- Implement proper authentication
- Monitor channel activity

## Disclosure Policy

When we receive a security bug report, we will:

1. Confirm the problem and determine affected versions
2. Audit code to find similar problems
3. Prepare fixes for all supported versions
4. Release patches as soon as possible
5. Credit the reporter (unless they prefer anonymity)

## Security Updates

Security updates will be announced via:

- GitHub Security Advisories
- Release notes
- Project README
- Community discussions (for non-critical issues)

## Bug Bounty Program

We currently do not have a bug bounty program. However, we deeply appreciate security researchers who responsibly disclose vulnerabilities and will publicly acknowledge their contributions.

## Contact

For any security-related questions or concerns:

- GitHub Security: https://github.com/nexusclawdev/nexusclaw/security
- Discussions: https://github.com/nexusclawdev/nexusclaw/discussions

---

Thank you for helping keep NexusClaw and its users safe! 🔒
