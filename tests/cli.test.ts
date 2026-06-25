import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawnSync, execFile } from "node:child_process";
import { promisify } from "node:util";
import { MockServer } from "@bitget-ai/bitget-agent-sdk/testing";

const execFileAsync = promisify(execFile);

const nodeBin = process.execPath;
const cliEntry = new URL("../lib/index.js", import.meta.url).pathname;

/** Credentials cleared so private-endpoint tests can't reach the real network. */
const NO_CREDS = {
  BITGET_API_KEY: "",
  BITGET_SECRET_KEY: "",
  BITGET_PASSPHRASE: "",
};

function runCli(args: string[], env?: Record<string, string>) {
  return spawnSync(nodeBin, [cliEntry, ...args], {
    encoding: "utf8",
    env: { ...process.env, NODE_NO_WARNINGS: "1", ...env },
    timeout: 15000,
  });
}

async function runCliAsync(
  args: string[],
  env?: Record<string, string>,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const { stdout, stderr } = await execFileAsync(nodeBin, [cliEntry, ...args], {
      encoding: "utf8",
      env: { ...process.env, NODE_NO_WARNINGS: "1", ...env },
      timeout: 15000,
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; code?: number };
    return {
      stdout: e.stdout ?? "",
      stderr: e.stderr ?? "",
      exitCode: typeof e.code === "number" ? e.code : 1,
    };
  }
}

describe("bgc CLI (UTA / v3)", () => {
  it("--version exits 0 and prints the SDK version string", () => {
    const result = runCli(["--version"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/bgc.*bitget-agent-sdk/i);
  });

  it("--help exits 0 and lists verbs, flags, and discover", () => {
    const result = runCli(["--help"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/usage/i);
    expect(result.stdout).toContain("bgc");
    // Intent verbs derived from the live surface.
    expect(result.stdout).toContain("market");
    expect(result.stdout).toContain("order");
    // Meta tool + safety flags advertised.
    expect(result.stdout).toContain("discover");
    expect(result.stdout).toContain("paper-trading");
  });

  it("unknown tool exits non-zero and points at discover", () => {
    const result = runCli(["bogus_verb_xyz"]);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("bogus_verb_xyz");
    expect(result.stderr).toContain("discover");
  });

  it("old <module> <tool> grammar is rejected with guidance", () => {
    const result = runCli(["spot", "spot_get_ticker"]);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/discover/i);
  });

  it("private verb without credentials exits non-zero with ConfigError", () => {
    const result = runCli(["order", "--action", "open"], NO_CREDS);
    expect(result.status).not.toBe(0);
    const payload = JSON.parse(result.stderr);
    expect(payload.ok).toBe(false);
    expect(payload.error.type).toBe("ConfigError");
  });

  describe("with mock server", () => {
    let server: MockServer;
    let baseUrl: string;

    beforeAll(async () => {
      server = new MockServer();
      const port = await server.start();
      baseUrl = `http://127.0.0.1:${port}`;
    });

    afterAll(async () => {
      await server.stop();
    });

    const mockEnv = (extra?: Record<string, string>) => ({
      BITGET_API_BASE_URL: baseUrl,
      BITGET_TIMEOUT_MS: "5000",
      ...extra,
    });

    it("market --action tickers returns a ToolResult with endpoint + data", async () => {
      const result = await runCliAsync(
        ["market", "--action", "tickers", "--category", "SPOT", "--symbol", "BTCUSDT"],
        mockEnv(),
      );
      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output).toHaveProperty("endpoint");
      expect(output.endpoint).toContain("/api/v3/market/tickers");
      expect(Array.isArray(output.data)).toBe(true);
      expect(output.data.length).toBeGreaterThan(0);
      expect(output.data[0]).toHaveProperty("symbol", "BTCUSDT");
    });

    it("numeric --limit is accepted (string passthrough, SDK coerces)", async () => {
      const result = await runCliAsync(
        [
          "market",
          "--action",
          "candles",
          "--category",
          "SPOT",
          "--symbol",
          "BTCUSDT",
          "--interval",
          "1m",
          "--limit",
          "5",
        ],
        mockEnv(),
      );
      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(Array.isArray(output.data)).toBe(true);
    });

    it("--paper-trading is accepted on a public read", async () => {
      const result = await runCliAsync(
        ["--paper-trading", "market", "--action", "tickers", "--category", "SPOT", "--symbol", "BTCUSDT"],
        mockEnv(),
      );
      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(Array.isArray(output.data)).toBe(true);
    });

    it("--read-only blocks a write before it reaches the network", async () => {
      const result = await runCliAsync(
        [
          "--read-only",
          "order",
          "--action",
          "place",
          "--category",
          "SPOT",
          "--symbol",
          "BTCUSDT",
          "--side",
          "buy",
          "--orderType",
          "market",
          "--qty",
          "0.001",
        ],
        mockEnv(NO_CREDS),
      );
      expect(result.exitCode).not.toBe(0);
      const payload = JSON.parse(result.stderr);
      expect(payload.ok).toBe(false);
      expect(payload.error.type).toBe("ValidationError");
    });

    it("--dry-run previews a write (exit 0, data.dryRun === true)", async () => {
      const result = await runCliAsync(
        [
          "order",
          "--action",
          "place",
          "--category",
          "SPOT",
          "--symbol",
          "BTCUSDT",
          "--side",
          "buy",
          "--orderType",
          "market",
          "--qty",
          "0.001",
          "--dry-run",
        ],
        mockEnv(NO_CREDS),
      );
      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.data.dryRun).toBe(true);
    });

    it("high-risk cancelAll without --confirm returns confirmationRequired (exit 0)", async () => {
      const result = await runCliAsync(
        ["order", "--action", "cancelAll", "--category", "SPOT", "--symbol", "BTCUSDT"],
        mockEnv(NO_CREDS),
      );
      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.data.confirmationRequired).toBe(true);
    });

    it("cancelAll --confirm proceeds to the (mock) endpoint", async () => {
      const result = await runCliAsync(
        ["order", "--action", "cancelAll", "--category", "SPOT", "--symbol", "BTCUSDT", "--confirm"],
        mockEnv({
          BITGET_API_KEY: "test-key",
          BITGET_SECRET_KEY: "test-secret",
          BITGET_PASSPHRASE: "test-pass",
        }),
      );
      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.endpoint).toContain("/api/v3/trade/cancel-symbol-order");
      expect(output).toHaveProperty("data");
    });

    it("discover (no args) lists domains", async () => {
      const result = await runCliAsync(["discover"], mockEnv());
      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(Array.isArray(output.data.domains)).toBe(true);
      expect(output.data.domains.length).toBeGreaterThan(0);
    });

    it("discover --tool market --action tickers projects the action contract", async () => {
      const result = await runCliAsync(
        ["discover", "--tool", "market", "--action", "tickers"],
        mockEnv(),
      );
      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(output.data.tool).toBe("market");
      expect(output.data.action).toBe("tickers");
      expect(output.data.operationId).toBe("getTickers");
    });

    it("raw --operationId getTickers returns data by operationId", async () => {
      const result = await runCliAsync(
        ["raw", "--operationId", "getTickers", "--args", '{"category":"SPOT","symbol":"BTCUSDT"}'],
        mockEnv(),
      );
      expect(result.exitCode).toBe(0);
      const output = JSON.parse(result.stdout);
      expect(Array.isArray(output.data)).toBe(true);
      expect(output.data[0]).toHaveProperty("symbol", "BTCUSDT");
    });
  });
});
