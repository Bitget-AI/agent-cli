import {
  loadConfig,
  buildTools,
  BitgetRestClient,
  toToolErrorPayload,
  SERVER_VERSION,
  MODULES,
} from "@bitget-ai/bitget-agent-sdk";

/**
 * bgc — the Bitget Agent CLI, a thin shell over the v3 SDK's intent surface.
 *
 * Grammar:  bgc <tool> [--action <name>] [--<param> <value> ...] [global flags]
 *
 * The SDK owns every decision that matters — action dispatch, input coercion,
 * write-safety (dryRun/confirm/readOnly/paperTrading), normalization, and the
 * discover/raw escape hatches. This file only parses argv, builds the configured
 * tool surface, forwards the call, and prints the result. There is deliberately
 * no per-verb logic here: a spec/SDK change is picked up for free.
 */

// Flags the CLI consumes itself; everything else `--key value` becomes a tool arg.
const GLOBAL_VALUE_FLAGS = new Set(["modules", "surface", "base-url", "timeout"]);
const GLOBAL_BOOL_FLAGS = new Set([
  "read-only",
  "paper-trading",
  "full",
  "pretty",
  "help",
  "version",
]);

interface ParsedArgs {
  positionals: string[];
  toolArgs: Record<string, unknown>;
  globals: Record<string, string | boolean>;
  parseError?: string;
}

/**
 * Coerce a CLI string to its natural type so the SDK's validators see the right
 * shape: `true`/`false` → boolean, a value opening with `[`/`{` → parsed JSON
 * (e.g. `--orders '[{...}]'`), everything else stays a string (the SDK coerces
 * numerics itself, so numeric orderIds are never mis-typed).
 */
function coerceValue(
  raw: string,
): { ok: true; value: unknown } | { ok: false } {
  if (raw === "true") return { ok: true, value: true };
  if (raw === "false") return { ok: true, value: false };
  if (raw.startsWith("[") || raw.startsWith("{")) {
    try {
      return { ok: true, value: JSON.parse(raw) };
    } catch {
      return { ok: false };
    }
  }
  return { ok: true, value: raw };
}

function parseArgs(argv: string[]): ParsedArgs {
  const positionals: string[] = [];
  const toolArgs: Record<string, unknown> = {};
  const globals: Record<string, string | boolean> = {};

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }
    const key = arg.slice(2);

    if (GLOBAL_BOOL_FLAGS.has(key)) {
      globals[key] = true;
      continue;
    }
    if (GLOBAL_VALUE_FLAGS.has(key)) {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        return { positionals, toolArgs, globals, parseError: `Flag --${key} requires a value.` };
      }
      globals[key] = next;
      i++;
      continue;
    }

    // Tool argument. The single kebab→camel remap is the safety control --dry-run.
    const toolKey = key === "dry-run" ? "dryRun" : key;
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith("--")) {
      const coerced = coerceValue(next);
      if (!coerced.ok) {
        return {
          positionals,
          toolArgs,
          globals,
          parseError: `--${key} value is not valid JSON: ${next}`,
        };
      }
      toolArgs[toolKey] = coerced.value;
      i++;
    } else {
      // Bare flag (e.g. --confirm, --dry-run) → boolean true.
      toolArgs[toolKey] = true;
    }
  }

  return { positionals, toolArgs, globals };
}

function firstLine(text: string, max = 88): string {
  const line = (text.split("\n")[0] ?? "").trim();
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}

async function printHelp(): Promise<void> {
  let verbs = "";
  try {
    // Derive the verb list from the live surface (all modules, incl. the hidden
    // to-B ones) so help can never drift from what the SDK actually exposes.
    const config = loadConfig({ modules: MODULES.join(",") });
    verbs = buildTools(config)
      .map((t) => `  ${t.name.padEnd(18)}${firstLine(t.description)}`)
      .join("\n");
  } catch {
    // Help must still print if surface construction ever fails.
  }

  process.stdout.write(`bgc — Bitget Agent CLI (Unified Trading Account / v3)

Usage:
  bgc <tool> [--action <name>] [--<param> <value> ...] [global flags]
  bgc discover [--domain <d> | --tool <t> [--action <a>] | --search <q>]
  bgc raw --operationId <id> [--args '<json>']

Tools (intent verbs + meta, shown with --modules all):
${verbs}

Global flags:
  --action <name>    Action for an action-routed verb (forwarded as the tool's action)
  --modules <list>   Modules to enable (default: all); name a hidden one, e.g. --modules broker
  --surface <mode>   intent (default) | full (also expose the 1:1 generated operations)
  --full             Shorthand for --surface full
  --read-only        Block all writes (mutually exclusive with --paper-trading)
  --paper-trading    Route writes to the Bitget demo environment (needs demo credentials)
  --dry-run          Preview a write without sending it (maps to dryRun)
  --confirm          Required to execute destructive (high-risk) writes
  --base-url <url>   Override API base URL (else BITGET_API_BASE_URL)
  --timeout <ms>     Per-request timeout in ms (else BITGET_TIMEOUT_MS, default 15000)
  --pretty           Pretty-print JSON output
  --help             Show this help
  --version          Show version

Auth (environment variables):
  BITGET_API_KEY, BITGET_SECRET_KEY, BITGET_PASSPHRASE

Examples:
  bgc market --action tickers --category SPOT --symbol BTCUSDT
  bgc order --action place --category SPOT --symbol BTCUSDT --side buy --orderType market --qty 0.001 --dry-run
  bgc order --action cancelAll --category SPOT --symbol BTCUSDT --confirm
  bgc account_overview --coin USDT
  bgc discover --tool order --action place
  bgc raw --operationId getTickers --args '{"category":"SPOT","symbol":"BTCUSDT"}'

Explore the live surface with \`bgc discover\`, then \`bgc discover --tool <verb>\` for a verb's exact params.
`);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const { positionals, toolArgs, globals, parseError } = parseArgs(argv);

  if (globals.help || argv.length === 0) {
    await printHelp();
    return;
  }

  if (globals.version) {
    process.stdout.write(
      `bgc (bitget-agent-cli) using bitget-agent-sdk ${SERVER_VERSION}\n`,
    );
    return;
  }

  if (parseError) {
    process.stderr.write(`Error: ${parseError}\n`);
    process.exitCode = 1;
    return;
  }

  if (positionals.length === 0) {
    process.stderr.write(
      "Error: provide a tool, e.g. `bgc market --action tickers --category SPOT --symbol BTCUSDT`. Run `bgc discover` to list tools.\n",
    );
    process.exitCode = 1;
    return;
  }

  if (positionals.length > 1) {
    process.stderr.write(
      `Error: unexpected extra arguments [${positionals
        .slice(1)
        .join(", ")}]. The v3 grammar is \`bgc <tool> --action <name> --<param> <value>\` (it replaced \`bgc <module> <tool>\`). Run \`bgc discover\`.\n`,
    );
    process.exitCode = 1;
    return;
  }

  const toolName = positionals[0]!;
  const surface = globals.full ? "full" : (globals.surface as string | undefined);

  try {
    const config = loadConfig({
      modules: (globals.modules as string | undefined) ?? "all",
      readOnly: globals["read-only"] === true,
      paperTrading: globals["paper-trading"] === true,
      ...(surface ? { surface } : {}),
      ...(globals["base-url"] ? { baseUrl: globals["base-url"] as string } : {}),
      ...(globals.timeout ? { timeoutMs: Number(globals.timeout) } : {}),
    });
    const client = new BitgetRestClient(config);
    const tools = buildTools(config);
    const tool = tools.find((t) => t.name === toolName);

    if (!tool) {
      const available = tools.map((t) => t.name).join(", ");
      process.stderr.write(
        `Error: tool "${toolName}" not found in the active surface.\nAvailable: ${available}\nRun \`bgc discover\` to explore, or widen the surface with --modules / --full.\n`,
      );
      process.exitCode = 1;
      return;
    }

    const result = await tool.handler(toolArgs, { config, client });
    const output = globals.pretty
      ? JSON.stringify(result, null, 2)
      : JSON.stringify(result);
    process.stdout.write(output + "\n");
  } catch (err: unknown) {
    process.stderr.write(JSON.stringify(toToolErrorPayload(err), null, 2) + "\n");
    process.exitCode = 1;
  }
}

main().catch((err) => {
  process.stderr.write(String(err) + "\n");
  process.exitCode = 1;
});
