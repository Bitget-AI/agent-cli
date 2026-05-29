# bitget-agent-cli (`bgc`)

[![npm](https://img.shields.io/npm/v/bitget-agent-cli.svg)](https://www.npmjs.com/package/bitget-agent-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

The **shell surface** of the [Bitget Agent Hub](https://github.com/bitget/agent-hub) — invoke any of 56+ Bitget API tools straight from your terminal or your shell-based AI assistant (Claude Code, Codex CLI, OpenClaw).

```bash
npm install -g bitget-agent-cli
```

The binary is **`bgc`**.

## Quick start

```bash
export BITGET_API_KEY=...
export BITGET_SECRET_KEY=...
export BITGET_PASSPHRASE=...

bgc spot spot_get_ticker --symbol BTCUSDT
bgc futures futures_get_positions
bgc account account_get_balance
```

```
Usage: bgc <module> <tool> [--param value ...]
Modules: spot, futures, account, margin, copytrading, convert, earn, p2p, broker
Options:
  --read-only       Only allow read/query tools
  --paper-trading   Use Bitget Demo Trading environment
  --pretty          Pretty-print JSON output
  --help            Show this help
  --version         Show version
```

## Demo Trading

`bgc` supports Bitget's Demo (paper-trading) environment:

```bash
bgc --paper-trading spot spot_place_order --symbol BTCUSDT --side buy --orderType market --size 10
```

Use a Bitget **Demo API Key** for `BITGET_API_KEY` etc. when running with `--paper-trading`.

## Why a CLI

`bgc` exists so that AI assistants **that already live in your shell** (Claude Code, Codex CLI, OpenClaw) can drive Bitget without any extra integration — the LLM writes a `bgc ...` command, the shell runs it, the JSON comes back.

If your assistant talks **MCP** (Claude Desktop, Cursor, Continue), use [`bitget-agent-mcp`](https://github.com/bitget/agent-mcp) instead.
If you want Claude Code / Codex / OpenClaw to know how to *use* `bgc` semantically (without you teaching it each command), install [`bitget-agent-skill`](https://github.com/bitget/agent-skill).

## License

MIT

---

Part of the **[Bitget Agent Hub](https://github.com/bitget/agent-hub)** — Trading Stack · Surface.
Foundation: [agent-sdk](https://github.com/bitget/agent-sdk) · Other surfaces: [agent-mcp](https://github.com/bitget/agent-mcp) · [agent-skill](https://github.com/bitget/agent-skill)
