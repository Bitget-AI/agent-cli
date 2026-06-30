# Changelog

All notable changes to `bitget-agent-cli` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2026-06-17

Rebuilt on **`@bitget-ai/bitget-agent-sdk` v3**, which redesigned the API surface for the
Bitget **Unified Trading Account (UTA / v3)**. This is a **breaking** release: the command
grammar, tool names, and dependency all change. Version jumps to `3.0.0` to track the SDK
major.

### Changed (BREAKING)
- **New grammar: `bgc <tool> [--action <name>] [--<param> <value> ...]`.** Replaces the old
  `bgc <module> <tool> --param value`. The legacy two-positional form (e.g.
  `bgc spot spot_get_ticker`) is now rejected with a pointer to `bgc discover`.
- **Intent verbs replace the 59 flat `<module>_<verb>` tools.** The default (`intent`)
  surface is 14 intent verbs across 7 domains (13 action-routed, plus the single-shot
  `account_overview`) — `market`, `order`, `position`,
  `strategy_order`, `account_overview`, `account_config`, `repayment`, `transfer_funds`,
  `deposit`, `withdraw`, `funds_records`, `subaccount`, `loan`, `tax` — plus hidden
  `broker` / `inst_loan` (enable with `--modules`). Old names like `spot_place_order` /
  `futures_get_positions` no longer exist.
- **Now depends on `@bitget-ai/bitget-agent-sdk@^3.0.0`** (was `^1.2.0`).

### Added
- **`discover` meta-tool** — introspect the live surface at runtime: domains, a verb's
  actions, and the exact params/types/auth/risk for any action (`bgc discover`,
  `bgc discover --tool order --action place`, `bgc discover --search funding`).
- **`raw` escape hatch** — invoke any generated operation directly by `operationId`
  (`bgc raw --operationId getTickers --args '{"category":"SPOT","symbol":"BTCUSDT"}'`).
- **Write-safety gates** surfaced as flags: `--dry-run` (preview, no network),
  `--read-only` (refuse writes before the network), and `--confirm` (required for
  destructive / high-risk actions, which otherwise return `confirmationRequired`).
- **Surfaces:** `--surface full` / `--full` exposes the 100+ generated 1:1 operations
  alongside the intent verbs; `--modules <list>` selects which modules are enabled.
- **Self-describing `--help`** — the verb list is derived live from the SDK surface, so it
  can never drift from what the CLI actually exposes.

### Unchanged
- The `bgc` binary name, the stdout/stderr + exit-code output contract (success →
  `ToolResult` on stdout exit 0; failure → error payload on stderr exit 1), `--pretty`,
  `--paper-trading`, env-var auth (`BITGET_API_KEY` / `BITGET_SECRET_KEY` /
  `BITGET_PASSPHRASE`), Node ≥ 20, and the pure-ESM distribution.

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

[3.0.0]: https://github.com/bitget/agent-cli/releases/tag/v3.0.0
[1.2.0]: https://github.com/bitget/agent-cli/releases/tag/v1.2.0
