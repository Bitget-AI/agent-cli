# Changelog

All notable changes to `bitget-agent-cli` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-05-29

### Added
- **Provenance attestations** on published artefacts (`publishConfig.provenance: true`) for supply-chain verification on npm.

### Changed
- **Renamed package: `bitget-client` → `bitget-agent-cli`.** The new name aligns with the `bitget-agent-*` family naming convention. The previous `bitget-client` name is no longer maintained on npm.
- **Now depends on `bitget-agent-sdk`** (was `bitget-core`). All 56+ Bitget API tools and the typed REST client come from the new SDK package.
- **Minimum Node.js version: 20.0.0** (was 18). Node 18 reached end-of-life in April 2025.
- **Pure ESM distribution.** Consumers must use `import` (or `npx`/binary invocation); `require()` is not supported.
- **Repository moved** from monorepo `agent_hub/packages/bitget-client/` to standalone repo [`bitget/agent-cli`](https://github.com/bitget/agent-cli).
- **`--version` output** now reports the new package name: `bgc (bitget-agent-cli) using bitget-agent-sdk <version>`.

### Unchanged
- The `bgc` binary name and command-line interface — same modules, same flags, same JSON output format. Existing scripts continue to work after `npm install -g bitget-agent-cli`.

[1.2.0]: https://github.com/bitget/agent-cli/releases/tag/v1.2.0
