<p align="center">
  <img src="assets/logo.png" alt="Bitget Agent CLI — terminal-native trading tool for Claude Code, Codex CLI, and OpenClaw" width="120" />
</p>

<h1 align="center">bitget-agent-cli — the agent-native CLI for Bitget</h1>

<p align="center">
  <strong>The shell surface of the <a href="https://github.com/Bitget-AI/agent_hub">Bitget Agent Hub</a>. Drive Bitget's Unified Trading Account (UTA / v3) API from Claude Code, Codex CLI, OpenClaw, or any shell-based AI assistant — through a small set of intent verbs and a self-describing surface the agent explores at runtime.</strong>
</p>

<p align="center">
  <a href="https://github.com/Bitget-AI/agent-cli/actions/workflows/ci.yml"><img src="https://github.com/Bitget-AI/agent-cli/actions/workflows/ci.yml/badge.svg" alt="Bitget Agent CLI continuous integration build status" /></a>
  <a href="https://www.npmjs.com/package/@bitget-ai/bitget-agent-cli"><img src="https://img.shields.io/npm/v/%40bitget-ai%2Fbitget-agent-cli.svg?style=flat-square&color=0070f3&label=npm" alt="npm package version for @bitget-ai/bitget-agent-cli" /></a>
  <a href="https://www.npmjs.com/package/@bitget-ai/bitget-agent-cli"><img src="https://img.shields.io/npm/dm/%40bitget-ai%2Fbitget-agent-cli.svg?style=flat-square&color=026e00&label=downloads" alt="npm monthly downloads for @bitget-ai/bitget-agent-cli" /></a>
  <img src="https://img.shields.io/badge/Node.js-%E2%89%A520-026e00?style=flat-square" alt="Requires Node.js 20 or higher" />
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey?style=flat-square" alt="Cross-platform: macOS, Linux, Windows" />
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square" alt="MIT License" /></a>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> ·
  <a href="#why-agent-native">Why agent-native</a> ·
  <a href="#progressive-disclosure--the-core-idea">Progressive disclosure</a> ·
  <a href="#installation">Installation</a> ·
  <a href="#commands">Commands</a> ·
  <a href="#write-safety">Write-safety</a> ·
  <a href="#security">Security</a> ·
  <a href="#troubleshooting">Troubleshooting</a> ·
  <a href="#faq">FAQ</a>
</p>

---

## Overview

`bitget-agent-cli` (binary: **`bgc`**) is Bitget's **official terminal trading tool**, built to be driven by a shell-based AI assistant — Claude Code, Codex CLI, OpenClaw, or anything else that lives in your terminal — with a human reading the result.

Most CLIs are built for humans and merely tolerate automation. `bgc` is built the other way around: every design choice optimizes for an **AI assistant driving it from a shell**. A small set of **intent verbs**, a **self-describing surface** the agent walks at runtime, and **deterministic write-safety** that makes it safe to hand the keys to an autonomous agent.

Built on the [Bitget Unified Trading Account (UTA / v3) API](https://www.bitget.com/api-doc/common/intro), `bgc` exposes **89 operations across 7 domains** (market, trade, account, funds, subaccount, loan, tax) — fronted by **14 intent verbs** plus the `discover` / `raw` meta tools. No host application config, no plugins: install and tell your AI what to trade.

Learn more on the [bitget-agent-cli product page](https://www.bitget.com/campaigns/bitget-agent-cli).

> **Part of [Bitget Agent Hub](https://github.com/Bitget-AI/agent_hub)** — the official open-source AI ecosystem. See the hub for desktop AI tools (MCP), the foundation SDK, and market-analysis skills.

---

## Quick Start

### Prerequisites

- **Node.js ≥ 20** ([download](https://nodejs.org/))
- **Bitget API Key** ([create here](https://www.bitget.com/en/api-management)) — enable Read + Trade permissions. Only required for private (account / trade) calls; market data is public.

### One-line install

```bash
npm install -g @bitget-ai/bitget-agent-cli
npx @bitget-ai/bitget-agent-skill --target all
```

Then set your credentials:

```bash
export BITGET_API_KEY="your-api-key"
export BITGET_SECRET_KEY="your-secret-key"
export BITGET_PASSPHRASE="your-passphrase"
```

> **Why install both?** `bitget-agent-cli` is the execution tool (`bgc`); `bitget-agent-skill` teaches your AI *when* and *how* to use it. Without the skill file, your AI has the tool but lacks the reasoning to reach for it. Without the CLI, the skill has nothing to call. You need both.
>
> **Why `npm install -g` and not `npx`?** `bgc` is a persistent CLI — your AI assistant calls it dozens of times per session, so you want it on `$PATH` with zero per-call overhead. The other Bitget AI packages (`bitget-agent-skill`, `bitget-signal`, `bitget-agent-mcp`) are one-shot or subprocess-launched, so they use `npx`.

### Verify installation

```bash
bgc --version
bgc discover
```

Expected: `discover` lists the 7 domains (market, trade, account, funds, subaccount, loan, tax) and the `raw` / `discover` meta tools.

---

## Why agent-native

| What an AI agent needs | How `bgc` answers it |
|---|---|
| **Learn the API at runtime** — an LLM can't read your docs, and a 100-operation catalog won't fit in its context | **Progressive disclosure** via `discover`: drill domains → verbs → actions → exact params, loading only the slice the task needs |
| **A surface it can reason about** | **14 intent verbs** (`order`, `position`, `market`…) map to *what you want to do*; any operation outside the curated verbs is one `raw` / `--full` away |
| **Calls it can assemble without guessing** | Every parameter's **type, enum, auth, and read/write flag is queryable live** — no hand-maintained schema to drift from the SDK |
| **Safety when running unattended** | **Deterministic gates** — `--dry-run`, `--read-only`, `--confirm`, `--paper-trading` are pure flags, no interactive prompts |
| **Output a program can parse** | **Unix-clean I/O** — JSON result on stdout (exit `0`), structured error on stderr (exit `1`); pipe to `jq`, branch on the exit code |

The rest of this README expands on each. The first one is the heart of it.

---

## Progressive disclosure — the core idea

An AI agent has a finite context window. Pre-loading every Bitget operation and its parameters wastes that budget and goes stale the moment the API changes. `bgc` instead exposes a **self-describing surface** the agent walks top-down, paying only for what it's about to use:

```
bgc discover                               →  7 domains          market, trade, account, funds, subaccount, loan, tax
bgc discover --domain trade                →  3 verbs            order, position, strategy_order
bgc discover --tool order                  → 10 actions          place, cancel, modify, cancelAll, countdownCancel, open, detail, history, fills, maxOpen
bgc discover --tool order --action place   →  the exact contract  required + optional params · types · enums · auth · read/write
```

The last rung is the payoff — the precise, machine-readable contract for one action:

```bash
bgc discover --tool order --action place --pretty
```
```jsonc
{
  "tool": "order", "action": "place",
  "operationId": "placeOrder", "method": "POST", "path": "/api/v3/trade/place-order",
  "auth": "private", "isWrite": true,
  "required": [
    { "name": "category",  "type": "string", "enum": ["SPOT","MARGIN","USDT-FUTURES","COIN-FUTURES","USDC-FUTURES"] },
    { "name": "symbol",    "type": "string" },
    { "name": "side",      "type": "string", "enum": ["buy","sell"] },
    { "name": "orderType", "type": "string", "enum": ["limit","market"] },
    { "name": "qty",       "type": "string" }
  ],
  "optional": [
    { "name": "price", "type": "string" },
    { "name": "timeInForce", "type": "string", "enum": ["ioc","fok","gtc","post_only"] },
    { "name": "clientOid", "type": "string" },
    { "name": "takeProfit", "type": "string" }, { "name": "stopLoss", "type": "string" }
    /* … tp/sl trigger & limit params … */
  ]
}
```

With that in hand, the agent assembles the call directly — same camelCase field names, no translation layer:

```bash
bgc order --action place --category SPOT --symbol BTCUSDT \
    --side buy --orderType market --qty 0.001 --dry-run
```

Two properties make this work for agents specifically:

- **Self-guiding.** Every `discover` response carries a `hint` field that names the next rung, so an agent with *zero* prior knowledge can navigate the whole surface from `bgc discover` alone.
- **Zero-drift.** The disclosed schema is derived live from the SDK — there is no static catalog in this repo to fall out of sync. What `discover` says is, by construction, exactly what the CLI does.

And when the agent only has a fuzzy idea, it can keyword-search the entire surface:

```bash
bgc discover --search funding
# → matches: market (actions: fundingRate, fundingRateHistory), account_overview, …
```

---

## Installation

### Step 1 — Install the CLI

```bash
npm install -g @bitget-ai/bitget-agent-cli
```

This adds `bgc` to your system PATH.

### Step 2 — Deploy the skill file

```bash
npx @bitget-ai/bitget-agent-skill --target all
```

Deploys to Claude Code, Codex, and OpenClaw simultaneously. Use `--target claude` or `--target codex` for a specific tool.

### Step 3 — Set credentials

```bash
# Add to ~/.bashrc, ~/.zshrc, or similar
export BITGET_API_KEY="your-api-key"
export BITGET_SECRET_KEY="your-secret-key"
export BITGET_PASSPHRASE="your-passphrase"
```

Reload your shell:

```bash
source ~/.bashrc  # or source ~/.zshrc
```

### Step 4 — Test the connection

```bash
# Public data (no auth needed)
bgc market --action tickers --category SPOT --symbol BTCUSDT

# Private data (requires auth)
bgc account_overview --coin USDT
```

---

## Commands

### Grammar

```
bgc <tool> [--action <name>] [--<param> <value> ...] [global flags]
bgc discover [--domain <d> | --tool <t> [--action <a>] | --search <q>]
bgc raw --operationId <id> [--args '<json>']
```

- **`<tool>`** is an **intent verb** (`market`, `order`, `position`, …), one of the meta tools `discover` / `raw`, or — with `--full` — any 1:1 generated operation.
- **`--action <name>`** picks the action on an action-routed verb (e.g. `order --action place`, `order --action cancelAll`) and is forwarded to the SDK verbatim. (`account_overview`, `discover`, and `raw` take no `--action`.)
- **Business params** forward as-is using the SDK's exact **camelCase** field names: `--symbol BTCUSDT --side buy --orderType market --qty 0.001`. Values are coerced naturally — `true`/`false` → boolean, a value starting with `[`/`{` → parsed JSON (e.g. `--orders '[{...}]'`), everything else stays a string (the SDK coerces numerics, so numeric ids are never mistyped).

You never need a command reference in your head — `bgc discover` *is* the reference, and it can't go stale.

### Intent verbs (14, across 7 domains)

The default (`intent`) surface exposes **14 intent verbs** across **7 domains** — 13 are action-routed (pick the operation with `--action`), plus the single-shot `account_overview` — alongside the `discover` / `raw` meta tools.

| Domain | Verb | Auth | Description | Example |
|---|---|:---:|---|---|
| `market` | `market` | public | Tickers, orderbook, candles, funding rate, open interest, recent fills | `bgc market --action tickers --symbol BTCUSDT` |
| `trade` | `order` | private | Place, cancel, modify, cancelAll, countdown, open/detail/history/fills | `bgc order --action place --side buy --qty 0.1` |
| `trade` | `position` | private | Position info, history, adl rank, close, closeAll | `bgc position --action info --category USDT-FUTURES` |
| `trade` | `strategy_order` | private | Strategy (trigger/plan) orders: place, cancel, modify, open, history | `bgc strategy_order --action open` |
| `account` | `account_overview` | private | One-call account snapshot (assets + settings + funding assets + positions + fee) | `bgc account_overview --coin USDT` |
| `account` | `account_config` | private | Account settings & API key info | `bgc account_config --action info` |
| `account` | `repayment` | private | Cross-margin / isolated-margin repayment | `bgc repayment --action repay --coin USDT` |
| `funds` | `transfer_funds` | private | Move funds between accounts | `bgc transfer_funds --fromAccountType spot --toAccountType futures --amount 100` |
| `funds` | `deposit` | private | Deposit address & records | `bgc deposit --action address --coin USDT` |
| `funds` | `withdraw` | private | Request withdrawals (high-risk, `--confirm`) | `bgc withdraw --action submit --coin USDT --amount 100` |
| `funds` | `funds_records` | private | Transfer / deposit / withdraw history | `bgc funds_records --action list` |
| `subaccount` | `subaccount` | private | Manage subaccounts & their deposits | `bgc subaccount --action list` |
| `loan` | `loan` | private | Borrow / repay crypto loans | `bgc loan --action borrow --coin USDT` |
| `tax` | `tax` | private | Query transaction tax records | `bgc tax --action history --year 2024` |

Use `raw --operationId <id>` for any operation not covered by the curated verbs.

### Global flags

| Flag | Purpose | Example |
|---|---|---|
| `--action <name>` | Action on an action-routed verb | `bgc order --action place` |
| `--modules <list>` | Modules to enable (default: all to-C modules) | `bgc --modules account,trade ...` |
| `--surface <mode>` | `intent` (default) \| `full` (also expose 1:1 operations) | `bgc --surface full discover` |
| `--full` | Shorthand for `--surface full` | `bgc --full discover` |
| `--read-only` | Block all writes (mutually exclusive with `--paper-trading`) | `bgc --read-only market ...` |
| `--paper-trading` | Route writes to Bitget's demo environment (needs demo credentials) | `bgc --paper-trading order ...` |
| `--dry-run` | Preview a write without sending it | `bgc order --action place ... --dry-run` |
| `--confirm` | Required for destructive (high-risk) writes | `bgc order --action cancelAll ... --confirm` |
| `--base-url <url>` | Override API base URL (else `BITGET_API_BASE_URL`) | |
| `--timeout <ms>` | Per-request timeout in ms (else `BITGET_TIMEOUT_MS`, default 15000) | |
| `--pretty` | Pretty-print JSON output | `bgc market ... --pretty` |
| `--help` | Show help (verb list derived live from the SDK) | `bgc --help` |
| `--version` | Show version | `bgc --version` |

### Environment variables

```
BITGET_API_KEY        API key      ┐
BITGET_SECRET_KEY     API secret   ├─ required only for private (account / trade) calls
BITGET_PASSPHRASE     passphrase   ┘
BITGET_API_BASE_URL   override the API base URL (else --base-url, else Bitget default)
BITGET_TIMEOUT_MS     per-request timeout in ms (else --timeout, default 15000)
```

Credentials are read from the environment only — never logged, never written to disk.

### Real-world examples

```bash
# Get BTC live price (no auth)
bgc market --action tickers --category SPOT --symbol BTCUSDT

# Check USDT balance (one-call snapshot)
bgc account_overview --coin USDT

# Preview a limit buy (dry run — nothing leaves the process)
bgc order --action place --category SPOT --symbol BTCUSDT \
  --side buy --orderType limit --price 60000 --qty 0.001 --dry-run

# Execute the order
bgc order --action place --category SPOT --symbol BTCUSDT \
  --side buy --orderType limit --price 60000 --qty 0.001

# Cancel a specific order
bgc order --action cancel --category SPOT --orderId 123456789

# Check futures positions
bgc position --action info --category USDT-FUTURES

# Set leverage to 10x
bgc position --action setLeverage --category USDT-FUTURES \
  --symbol BTCUSDT --leverage 10 --marginCoin USDT

# High-risk: cancel all orders (requires confirmation)
bgc order --action cancelAll --category SPOT --symbol BTCUSDT --confirm

# Pipe to jq for processing
bgc market --action tickers --category SPOT --symbol BTCUSDT | jq '.data[0].lastPr'

# Explore available actions for a tool
bgc discover --tool order --action place

# Escape hatch: call any operation by ID
bgc raw --operationId getTickers --args '{"category":"SPOT","symbol":"BTCUSDT"}'
```

---

## Write-safety

`bgc` inherits the SDK's layered write-safety gate. Every safety decision happens **before** any request leaves the process, and every control is a deterministic flag — no interactive prompt — so it is safe in unattended and AI-driven shells.

| Control | Effect |
|---|---|
| `--dry-run` | Previews a write and returns the exact payload that *would* be sent (`data.dryRun: true`). No network call. |
| `--read-only` | Blocks every write at validation time — a write verb returns a `ValidationError` and never reaches the network. |
| `--confirm` | Required for **destructive / high-risk** actions (`order --action cancelAll`, `position --action closeAll`, `withdraw --action submit`, …). Without it the call returns `data.confirmationRequired: true` and does nothing. |
| `--paper-trading` | Routes writes to Bitget's demo environment (needs demo credentials). Mutually exclusive with `--read-only`. |

```bash
# Dry-run: see what would be sent, send nothing
bgc order --action place --category SPOT --symbol BTCUSDT \
    --side buy --orderType market --qty 0.001 --dry-run

# Read-only: writes are refused before the network
bgc --read-only order --action place --category SPOT --symbol BTCUSDT --side buy ...
# → ValidationError: Operation "placeOrder" is a write and readOnly mode is enabled.

# High-risk gate: cancelAll does nothing until you confirm
bgc order --action cancelAll --category SPOT --symbol BTCUSDT
# → { data: { confirmationRequired: true, ... } }     (stdout, exit 0 — not an error)
bgc order --action cancelAll --category SPOT --symbol BTCUSDT --confirm
# → executes
```

---

## Output contract

- **Success** → the resolved `ToolResult` (`{ endpoint, requestTime, data }`) is printed to **stdout**; exit code `0`. `dryRun` previews and `confirmationRequired` gates are normal results (stdout, exit `0`) — they are not errors.
- **Failure** → a structured error payload (`{ ok: false, error: { type, category, message, suggestion, retryable }, timestamp }`) is printed to **stderr**; exit code `1`.

Success output is compact JSON (add `--pretty` for 2-space indentation); error payloads are always pretty-printed. The split is unix-clean: pipe stdout to `jq`, branch on the exit code, read `error.retryable` to decide whether to back off and retry.

---

## How `bgc` is built

`bgc` is a thin, **zero-business-logic** shell wrapper around the [Bitget Agent SDK](https://github.com/Bitget-AI/agent-sdk). All routing, validation, write-safety, normalization — and the discovery surface itself — live in the SDK. The CLI only parses argv, builds the configured surface, forwards the call, and prints the result:

```
Terminal AI (Claude Code / Codex / OpenClaw)
        │  natural language → bgc … command
        ▼
bgc CLI  (argv → tool call → JSON on stdout / error on stderr)
        │
        ▼
@bitget-ai/bitget-agent-sdk  (intent verbs, action dispatch, progressive
        │                      discovery, write-safety, REST client, HMAC
        │                      signing, rate limiting)
        ▼
Bitget UTA (v3) REST API   (api.bitget.com)
```

Because the discovery and safety logic live in the SDK, the CLI picks up new operations, parameters, and gates for free — a spec change is reflected in `bgc discover` with no code change here. Every command translates into a single signed HTTPS request. No telemetry, no proxy, no remote dependencies.

---

## Where `bgc` fits

`bgc` exists so AI assistants **that already live in your shell** — Claude Code, Codex CLI, OpenClaw — can drive Bitget with no extra integration wiring. The LLM writes a `bgc …` command, the shell runs it, the JSON comes back.

- **Speak MCP instead?** (Claude Desktop, Cursor, Continue, ChatGPT Desktop, Windsurf) → [`@bitget-ai/bitget-agent-mcp`](https://github.com/Bitget-AI/agent-mcp) — same intent surface, MCP-shaped.
- **Want your assistant to know *when* to reach for `bgc`** without teaching it each command? Install the [Bitget Agent Skill](https://github.com/Bitget-AI/agent-skill) on top:

  ```bash
  npx @bitget-ai/bitget-agent-skill --target all
  ```

  Then say *"buy 0.1 BTC at market on Bitget"* or *"show my open futures positions"* and it composes the right `bgc` invocation.

---

## Security

### Credential protection

- ✅ **Environment variables only**: API keys read from `BITGET_API_KEY`, `BITGET_SECRET_KEY`, `BITGET_PASSPHRASE` — never parsed from `.env` files, never logged, never written to disk.
- ✅ **Local signing**: all authenticated requests are signed with **HMAC-SHA256** in-process before reaching Bitget's API.
- ✅ **No telemetry, no proxy**: every command translates into a single signed HTTPS request straight to `api.bitget.com`. No third-party server is involved.

### Safety features

- **`--read-only` mode**: strips all write tools at validation time. A write verb returns a `ValidationError` and never reaches the network — the AI can neither see nor call order placement, transfers, or cancellations.
- **`--dry-run`**: previews the exact payload that *would* be sent. No network call.
- **`--confirm` gate**: high-risk operations (`cancelAll`, `closeAll`, `withdraw`, …) return `confirmationRequired: true` and do nothing until `--confirm` is passed.
- **`--paper-trading`**: routes writes to Bitget's demo environment.
- **Client-side rate limiting**: protects against accidental AI loops hitting Bitget's API limits.

### Best practices

1. **Use a Demo API Key first** — create one at [bitget.com/api-management](https://www.bitget.com/en/api-management) and test with `--paper-trading`.
2. **Start with `--read-only`** — verify queries work before enabling writes.
3. **Never commit credentials** — add `BITGET_*` vars to your shell profile outside the repo, or use a secrets manager. Do not put them in `.env` files committed to the project.
4. **Rotate keys regularly** — regenerate API keys every 90 days.

---

## Troubleshooting

### "bgc: command not found"

**Cause**: CLI not installed globally, or npm's global bin not on `$PATH`.

**Fix**:
```bash
npm install -g @bitget-ai/bitget-agent-cli
which bgc
```

If still not found, add npm's global bin to `PATH`:
```bash
# macOS / Linux
export PATH="$(npm config get prefix)/bin:$PATH"
# Add to ~/.bashrc or ~/.zshrc
```

### "Authentication failed" or "Invalid signature"

**Possible causes**:
1. API key has insufficient permissions (needs Read + Trade for private calls).
2. Passphrase is incorrect (copy exactly — it's case-sensitive).
3. System clock is out of sync (HMAC requires an accurate timestamp).

**Fix**:
- Verify Read + Trade permissions at [bitget.com/api-management](https://www.bitget.com/en/api-management).
- Double-check all three credential values.
- Sync the system clock: `sudo sntp -sS pool.ntp.org` (macOS) / `sudo ntpdate -s pool.ntp.org` (Linux).

### "Skill not recognized by AI"

**Cause**: skill file not deployed, or the AI tool wasn't restarted after deploy.

**Fix**:
1. Re-deploy the skill: `npx @bitget-ai/bitget-agent-skill --target all`
2. Restart your AI tool (Claude Code / Codex CLI).
3. Ask the AI: *"What Bitget trading modules are available?"* — it should list the domains `bgc discover` reports.

### "Rate limit exceeded"

**Cause**: too many rapid API calls. The CLI throttles client-side, but Bitget's server-side limit can still kick in.

**Fix**: wait 60 seconds, then retry. Avoid asking the AI to execute hundreds of orders in a tight loop.

### "Module not loaded" error

**Cause**: trying to use a module not enabled in the active config.

**Fix**:
```bash
# Load specific modules
bgc --modules account,trade,market ...

# Or load every module
bgc --modules all ...
```

---

## Updates

Update to the latest version:

```bash
npm install -g @bitget-ai/bitget-agent-cli@latest
npx @bitget-ai/bitget-agent-skill@latest --target all
```

See [CHANGELOG.md](CHANGELOG.md) for release history.

---

## Related projects

| Package | Purpose | Best for |
|---|---|---|
| **[bitget-agent-cli](https://github.com/Bitget-AI/agent-cli)** (this repo) | Shell CLI (`bgc`) — 14 intent verbs over 89 UTA v3 operations | Claude Code, Codex CLI, OpenClaw |
| **[bitget-agent-mcp](https://github.com/Bitget-AI/agent-mcp)** | MCP server — same intent surface, MCP-shaped | Claude Desktop, Cursor, Continue, Windsurf |
| **[bitget-agent-skill](https://github.com/Bitget-AI/agent-skill)** | AI reasoning guide — teaches the AI when to use `bgc` | Pairs with `bgc` or the MCP server |
| **[bitget-agent-sdk](https://github.com/Bitget-AI/agent-sdk)** | TypeScript foundation SDK | Developers building custom integrations |
| **[bitget-signal](https://github.com/Bitget-AI/bitget-signal)** | Market-analysis skills (macro, on-chain, sentiment) | No API key needed |
| **[agent_hub](https://github.com/Bitget-AI/agent_hub)** | Central ecosystem entry point | Overview of all Bitget AI tools |

---

## FAQ

### What is bitget-agent-cli?

`bitget-agent-cli` is Bitget's **official terminal AI trading tool**, providing a command-line interface (`bgc`) for Claude Code, Codex CLI, OpenClaw, and other shell-based AI assistants to operate a Bitget account. Built on the Bitget Unified Trading Account (UTA / v3) API, it exposes **89 operations across 7 domains** through **14 intent verbs** covering market data, spot/futures trading, account, funds, subaccount, loans, and tax.

### Do I need both bitget-agent-cli and bitget-agent-skill?

**Yes.** Terminal AI users should install both:

- **`bitget-agent-cli`** is the execution tool — it signs requests and sends them to Bitget's API.
- **`bitget-agent-skill`** is the AI's instruction manual — it tells the AI *when* and *how* to compose the right `bgc` invocation.

Without the skill, your AI has the tool but won't reliably reach for it. Without the CLI, the skill has nothing to call.

### I use Claude Desktop / Cursor — should I install this?

**No.** Claude Desktop and Cursor are desktop AI tools. Install [`bitget-agent-mcp`](https://github.com/Bitget-AI/agent-mcp) instead. `bitget-agent-cli` is designed for terminal AI (Claude Code, Codex CLI, OpenClaw).

### How do I confirm the skill loaded correctly?

Ask your AI: *"What Bitget trading modules does bitget-agent-cli support?"* If it lists the domains `bgc discover` reports (market, trade, account, funds, subaccount, loan, tax), the skill is active. You can also run `bgc discover` directly to see the live surface.

### How do I prevent the AI from placing orders by mistake?

Add `--read-only`:

```bash
bgc --read-only market --action tickers --symbol BTCUSDT
```

Writes are blocked at validation time — a write verb returns a `ValidationError` and never reaches the network.

### Is my API key safe?

Yes. Credentials are:

- Read from environment variables only — never parsed from `.env` files, never logged, never written to disk.
- Signed locally with **HMAC-SHA256**.
- Sent directly to `api.bitget.com` — no third-party proxy, no telemetry.

### Can I practice without risking real funds?

Yes. Use **paper trading**:

1. Create a [Demo API Key](https://www.bitget.com/en/api-management) on Bitget.
2. Set the Demo credentials as your environment variables.
3. Add `--paper-trading` to your `bgc` calls.

All writes route to Bitget's sandbox environment.

### What's the difference between this and calling the Bitget API directly?

`bgc` provides:

- **14 curated intent verbs** instead of raw endpoints.
- **Progressive disclosure** via `discover` — the agent learns the exact contract for one action without loading the whole catalog.
- **Automatic HMAC signing** and client-side rate limiting.
- **Natural-language integration** via the skill file.
- **Deterministic write-safety** (`--dry-run`, `--read-only`, `--confirm`, `--paper-trading`) — no interactive prompts, safe for unattended shells.
- **Unix-clean I/O** — JSON on stdout (exit `0`), structured error on stderr (exit `1`).

You could call the API directly, but you'd need to implement all of the above yourself.

### What is `bgc discover` for?

It's the **self-describing surface**. Run `bgc discover` to list domains, `bgc discover --domain trade` to list a domain's verbs, `bgc discover --tool order` to list a verb's actions, `bgc discover --tool order --action place` to see the exact required/optional params for one action. The schema is derived live from the SDK — what `discover` says is, by construction, exactly what the CLI does.

### Is it free?

Yes. MIT-licensed and free to use. Maintained by Bitget at no cost.

### How do I update?

See [Updates](#updates) above.

---

## Contributing

Issues and pull requests welcome! Please read our [Contributing Guide](CONTRIBUTING.md) before submitting.

- **Report bugs**: [GitHub Issues](https://github.com/Bitget-AI/agent-cli/issues)
- **Request features**: [GitHub Discussions](https://github.com/Bitget-AI/agent-cli/discussions)
- **Security issues**: Email security@bitget.com (do not post publicly)

---

## License

[MIT License](LICENSE) — free for personal and commercial use. Attribution appreciated but not required.

---

<sub>⚠️ **Risk Disclaimer**: Trading cryptocurrency carries substantial risk. You are solely responsible for any orders your AI agent places on your behalf. Always use `--read-only` and `--paper-trading` to rehearse safely before going live. Past performance does not guarantee future results.</sub>

<sub>Part of the **[Bitget Agent Hub](https://github.com/Bitget-AI/agent_hub)** ecosystem · Trading Stack · Surface.<br/>
Foundation: [agent-sdk](https://github.com/Bitget-AI/agent-sdk) · Other surfaces: [agent-mcp](https://github.com/Bitget-AI/agent-mcp) · [agent-skill](https://github.com/Bitget-AI/agent-skill) · Market signals: [bitget-signal](https://github.com/Bitget-AI/bitget-signal)</sub>
