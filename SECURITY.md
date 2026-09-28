# Security Policy

## Supported Versions

We actively maintain and provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security and privacy of this application seriously, particularly regarding sensitive employee personal data and biometric records.

If you discover a security vulnerability, please **DO NOT** create a public issue on GitHub. Instead, follow responsible disclosure:

1. Submit a private vulnerability report via [GitHub Security Advisories](https://github.com/Rin111124/EmployeeManagement-Full/security/advisories/new) or contact the project maintainer directly.
2. Include the following information:
   - A detailed description of the vulnerability.
   - Steps to reproduce or proof-of-concept (PoC) code.
   - Potential impact on confidentiality, integrity, or availability.
   - Suggested mitigations (if known).

You will receive an initial response within **48 hours**. We will coordinate a fix and release a security advisory before public disclosure.

---

## Security & Privacy Architecture

This repository adheres to strict security and privacy standards:

### 1. Biometric Data & PII Cryptography
- **AES-256-GCM Authentication Encryption**: All 512-dimensional facial embeddings and sensitive employee identifiers (such as Citizen ID numbers) are encrypted at rest using AES-256-GCM with randomized initialization vectors (`iv`) and cryptographic authentication tags (`authTag`).
- **PII Masking**: Logs, audit trails, and client APIs automatically mask national ID cards, phone numbers, and raw facial vectors.

### 2. Device Zero-Trust Architecture
- **Challenge-Response Kiosk Enrollment**: Edge devices and kiosks authenticate using HMAC-SHA256 challenge proofs.
- **Instant Revocation**: If a kiosk device is compromised, an administrator can instantly revoke its cryptographic token, invalidating all subsequent API and WebSocket connections in realtime.

### 3. Biometric Governance & Legal Compliance
- **Data Retention & Right to Erasure**: Fully compliant with Vietnamese Decree 13/2023/ND-CP and international standards for biometric data processing. Facial templates of terminated employees are purged automatically via scheduled retention workers.
- **No Raw Biometric Storage**: The system only processes and stores mathematical vector embeddings, never raw unencrypted facial images.

### 4. API & Infrastructure Hardening
- **Multi-layer Defense**: All external endpoints are guarded with `helmet`, strict CORS origin whitelisting, CSRF origin verification, and rate limiters.
- **Input Sanitization**: Native request sanitizers automatically neutralize NoSQL injection operators (`$gt`, `$where`) and XSS script tags.
- **Token Family Protection**: Refresh tokens enforce reuse detection, invalidating the entire token family upon anomalous concurrent exchanges.
