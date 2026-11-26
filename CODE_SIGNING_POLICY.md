# Code Signing Policy — Sapira Media Player

Free code signing on Windows is provided by [SignPath.io](https://signpath.io/), certificate by [SignPath Foundation](https://signpath.org/).

---

## Purpose

This document describes the code signing governance and build integrity controls for **Sapira Media Player**, an open-source desktop media player licensed under the [MIT License](./LICENSE).

## Team Roles

- **Committers & Reviewers**:
  - **Valentin Borșan** — Creator & Lead Maintainer (reviews all pull requests and maintains repository branch protection).
- **Approvers**:
  - **Valentin Borșan** — Authorized to approve release signing requests in SignPath.

All team members with repository write access or SignPath signing privileges are required to enforce **Multi-Factor Authentication (MFA / 2FA)** on both their GitHub and SignPath accounts.

## Build & Signing Integrity

1. **GitHub-Hosted CI Only**: All official Windows executables (`Sapira Media Player.exe`, `Sapira-Media-Player-Setup-*-x64.exe`, and `Sapira-Media-Player-Portable-*-x64.exe`) are compiled exclusively from public source code on clean, ephemeral GitHub-hosted runners via [`.github/workflows/release.yml`](./.github/workflows/release.yml).
2. **Verified Origin**: Signing requests are submitted directly from the GitHub Actions workflow artifact using `signpath/github-action-submit-signing-request@v3`, allowing SignPath to cryptographically verify repository origin, commit SHA, and workflow execution metadata before signing.
3. **Artifact Configuration**: Strict SignPath XML artifact configurations ([`build/signpath-app-binaries.xml`](./build/signpath-app-binaries.xml) and [`build/signpath-installers.xml`](./build/signpath-installers.xml)) restrict Authenticode signing solely to verified Sapira Media Player PE binaries.

## Privacy Guarantee

This program will not transfer any information to other networked systems unless specifically requested by the user or the person installing or operating it. See [PRIVACY.md](./PRIVACY.md) for complete details.
