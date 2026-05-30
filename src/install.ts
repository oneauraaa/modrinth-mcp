import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as readline from 'node:readline';
import { fileURLToPath } from 'node:url';

// Absolute path to the built server entry (dist/index.js sits next to this file).
const SERVER_ENTRY = path.join(path.dirname(fileURLToPath(import.meta.url)), 'index.js');

// Choose the command written into client configs based on how we're running.
// From an npm/npx/global install the entry lives under node_modules, and the
// absolute path is ephemeral (npx wipes its cache) — so target the package name
// via npx. From a local clone, point at this build's absolute path.
function launchCommand(): { command: string; args: string[] } {
  const fromInstall = SERVER_ENTRY.split(path.sep).includes('node_modules');
  return fromInstall
    ? { command: 'npx', args: ['-y', 'modrinth-mcp'] }
    : { command: 'node', args: [SERVER_ENTRY] };
}

// --- Client registry -------------------------------------------------------

interface ClientDef {
  id: string;
  label: string;
  /** Absolute config path, or null if the client is unsupported on this platform. */
  configPath: () => string | null;
  format: 'json' | 'toml';
  /** Key under which servers live in a JSON config (default: mcpServers). */
  serversKey?: string;
}

const home = os.homedir();

function claudeDesktopPath(): string | null {
  switch (process.platform) {
    case 'darwin':
      return path.join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
    case 'win32':
      return process.env.APPDATA
        ? path.join(process.env.APPDATA, 'Claude', 'claude_desktop_config.json')
        : null;
    default:
      return path.join(home, '.config', 'Claude', 'claude_desktop_config.json');
  }
}

const CLIENTS: ClientDef[] = [
  { id: 'claude-code', label: 'Claude Code (CLI)', format: 'json', configPath: () => path.join(home, '.claude.json') },
  { id: 'claude-desktop', label: 'Claude Desktop', format: 'json', configPath: claudeDesktopPath },
  { id: 'cursor', label: 'Cursor', format: 'json', configPath: () => path.join(home, '.cursor', 'mcp.json') },
  { id: 'windsurf', label: 'Windsurf', format: 'json', configPath: () => path.join(home, '.codeium', 'windsurf', 'mcp_config.json') },
  { id: 'gemini', label: 'Gemini CLI', format: 'json', configPath: () => path.join(home, '.gemini', 'settings.json') },
  { id: 'codex', label: 'Codex (OpenAI)', format: 'toml', configPath: () => path.join(home, '.codex', 'config.toml') },
];

// --- Config writers --------------------------------------------------------

const SERVER_NAME = 'modrinth';

function ensureDir(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function backup(filePath: string, raw: string): void {
  if (raw) fs.writeFileSync(`${filePath}.bak`, raw);
}

function writeJsonConfig(filePath: string, token: string | undefined, serversKey: string): void {
  ensureDir(filePath);
  let raw = '';
  let data: Record<string, any> = {};
  if (fs.existsSync(filePath)) {
    raw = fs.readFileSync(filePath, 'utf8');
    if (raw.trim()) {
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(`existing config is not valid JSON — left untouched: ${filePath}`);
      }
    }
  }
  backup(filePath, raw);

  if (typeof data[serversKey] !== 'object' || data[serversKey] === null) {
    data[serversKey] = {};
  }
  const entry: Record<string, unknown> = { ...launchCommand() };
  if (token) entry.env = { MODRINTH_TOKEN: token };
  data[serversKey][SERVER_NAME] = entry;

  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function writeTomlConfig(filePath: string, token: string | undefined): void {
  ensureDir(filePath);
  let content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  backup(filePath, content);

  const { command, args } = launchCommand();
  const argsToml = args.map((a) => JSON.stringify(a)).join(', ');
  const envLine = token ? `\nenv = { MODRINTH_TOKEN = ${JSON.stringify(token)} }` : '';
  const block = `[mcp_servers.${SERVER_NAME}]\ncommand = ${JSON.stringify(command)}\nargs = [${argsToml}]${envLine}\n`;

  const sectionRe = /\[mcp_servers\.modrinth\][\s\S]*?(?=\n\[|$)/;
  if (sectionRe.test(content)) {
    content = content.replace(sectionRe, block.trimEnd());
  } else {
    if (content && !content.endsWith('\n')) content += '\n';
    content += `${content ? '\n' : ''}${block}`;
  }
  fs.writeFileSync(filePath, content);
}

function installToClient(client: ClientDef, token: string | undefined): string {
  const filePath = client.configPath();
  if (!filePath) throw new Error(`not supported on ${process.platform}`);
  if (client.format === 'toml') writeTomlConfig(filePath, token);
  else writeJsonConfig(filePath, token, client.serversKey ?? 'mcpServers');
  return filePath;
}

// --- Interactive prompts ---------------------------------------------------

const C = {
  reset: '\x1b[0m', dim: '\x1b[90m', cyan: '\x1b[36m',
  green: '\x1b[32m', red: '\x1b[31m', bold: '\x1b[1m',
};

function isDetected(client: ClientDef): boolean {
  const filePath = client.configPath();
  if (!filePath) return false;
  return fs.existsSync(filePath) || fs.existsSync(path.dirname(filePath));
}

function multiSelect(title: string, items: { label: string; hint?: string; checked?: boolean }[]): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    readline.emitKeypressEvents(stdin);
    stdin.setRawMode(true);
    stdin.resume();

    let index = 0;
    const checked = new Set<number>(items.flatMap((it, i) => (it.checked ? [i] : [])));
    let rendered = 0;

    const render = () => {
      if (rendered > 0) stdout.write(`\x1b[${rendered}A`);
      const lines = [title];
      items.forEach((it, i) => {
        const pointer = i === index ? `${C.cyan}❯${C.reset}` : ' ';
        const box = checked.has(i) ? `${C.green}◉${C.reset}` : '◯';
        const label = i === index ? `${C.cyan}${it.label}${C.reset}` : it.label;
        const hint = it.hint ? `  ${C.dim}${it.hint}${C.reset}` : '';
        lines.push(`${pointer} ${box} ${label}${hint}`);
      });
      lines.push(`${C.dim}  ↑/↓ move · space toggle · a all · enter confirm · esc cancel${C.reset}`);
      stdout.write(lines.map((l) => `\x1b[2K${l}`).join('\n') + '\n');
      rendered = lines.length;
    };

    const cleanup = () => {
      stdin.removeListener('keypress', onKey);
      stdin.setRawMode(false);
      stdin.pause();
    };

    const onKey = (_str: string, key: readline.Key) => {
      if (!key) return;
      if (key.name === 'up') index = (index - 1 + items.length) % items.length;
      else if (key.name === 'down') index = (index + 1) % items.length;
      else if (key.name === 'space') checked.has(index) ? checked.delete(index) : checked.add(index);
      else if (key.name === 'a') {
        if (checked.size === items.length) checked.clear();
        else items.forEach((_, i) => checked.add(i));
      } else if (key.name === 'return') {
        cleanup();
        stdout.write('\n');
        resolve([...checked].sort((a, b) => a - b));
        return;
      } else if (key.name === 'escape' || (key.ctrl && key.name === 'c')) {
        cleanup();
        stdout.write('\n');
        reject(new Error('cancelled'));
        return;
      }
      render();
    };

    stdin.on('keypress', onKey);
    render();
  });
}

function question(query: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(query, (answer) => {
    rl.close();
    resolve(answer.trim());
  }));
}

// --- Entry point -----------------------------------------------------------

function parseArgs(argv: string[]): { clients?: string[]; token?: string; help: boolean } {
  const out: { clients?: string[]; token?: string; help: boolean } = { help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') out.help = true;
    else if (arg === '--client' || arg === '-c') out.clients = (argv[++i] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    else if (arg.startsWith('--client=')) out.clients = arg.slice('--client='.length).split(',').map((s) => s.trim()).filter(Boolean);
    else if (arg === '--token' || arg === '-t') out.token = argv[++i];
    else if (arg.startsWith('--token=')) out.token = arg.slice('--token='.length);
  }
  return out;
}

function printHelp(): void {
  const ids = CLIENTS.map((c) => c.id).join(', ');
  process.stdout.write(`
${C.bold}modrinth-mcp install${C.reset} — add the Modrinth MCP server to your AI agents

${C.bold}Usage${C.reset}
  npx -y modrinth-mcp install                 interactive wizard
  npx -y modrinth-mcp install -c cursor,codex non-interactive
  npx -y modrinth-mcp install -t <PAT>        also write your Modrinth token

${C.bold}Options${C.reset}
  -c, --client <ids>   comma-separated client ids (skips the picker)
  -t, --token <pat>    Modrinth personal access token to embed
  -h, --help           show this help

${C.bold}Clients${C.reset}
  ${ids}
`);
}

export async function runInstall(argv: string[]): Promise<void> {
  const args = parseArgs(argv);
  if (args.help) {
    printHelp();
    return;
  }

  process.stdout.write(`\n${C.bold}🧩 Modrinth MCP installer${C.reset}\n`);

  // 1. Pick clients
  let selected: ClientDef[];
  if (args.clients) {
    selected = [];
    for (const id of args.clients) {
      const client = CLIENTS.find((c) => c.id === id);
      if (!client) {
        process.stderr.write(`${C.red}Unknown client: ${id}${C.reset} (known: ${CLIENTS.map((c) => c.id).join(', ')})\n`);
        process.exitCode = 1;
        return;
      }
      selected.push(client);
    }
  } else {
    if (!process.stdin.isTTY) {
      process.stderr.write(`${C.red}No TTY — pass --client <ids> for non-interactive install.${C.reset}\n`);
      process.exitCode = 1;
      return;
    }
    const picks = await multiSelect('\nSelect the agents to install into:', CLIENTS.map((c) => ({
      label: c.label,
      hint: isDetected(c) ? 'detected' : undefined,
      checked: isDetected(c),
    }))).catch(() => null);
    if (picks === null) {
      process.stdout.write(`${C.dim}Cancelled.${C.reset}\n`);
      return;
    }
    selected = picks.map((i) => CLIENTS[i]);
  }

  if (selected.length === 0) {
    process.stdout.write(`${C.dim}No agents selected — nothing to do.${C.reset}\n`);
    return;
  }

  // 2. Token
  let token = args.token;
  if (token === undefined && process.stdin.isTTY) {
    process.stdout.write(`${C.dim}A Modrinth token unlocks the authenticated tools (create/update/delete).${C.reset}\n`);
    process.stdout.write(`${C.dim}Leave blank to skip — you can set MODRINTH_TOKEN in your environment instead.${C.reset}\n`);
    const answer = await question('Modrinth PAT (optional): ');
    token = answer || undefined;
  }

  // 3. Write configs
  process.stdout.write('\n');
  let ok = 0;
  for (const client of selected) {
    try {
      const filePath = installToClient(client, token);
      process.stdout.write(`  ${C.green}✔${C.reset} ${client.label}  ${C.dim}${filePath}${C.reset}\n`);
      ok++;
    } catch (err) {
      process.stdout.write(`  ${C.red}✘${C.reset} ${client.label}  ${C.dim}${(err as Error).message}${C.reset}\n`);
    }
  }

  process.stdout.write(`\n${C.green}Done${C.reset} — installed into ${ok}/${selected.length} agent(s).\n`);
  if (!token) {
    process.stdout.write(`${C.dim}Tip: set MODRINTH_TOKEN in your shell to enable authenticated tools.${C.reset}\n`);
  }
  process.stdout.write(`${C.dim}Restart the agent to pick up the new server.${C.reset}\n`);
}
