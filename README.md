# RunCodingPlan

> **"Run Claude Code with any plan."** — Switch Claude Code between alternative AI providers in one command.

```
  ╦═╗╦ ╦╔╗╔╔═╗╔═╗╔╦╗╦╔╗╔╔═╗╔═╗╦  ╔═╗╔╗╔
  ╠╦╝║ ║║║║║  ║ ║ ║║║║║║║ ╦╠═╝║  ╠═╣║║║
  ╩╚═╚═╝╝╚╝╚═╝╚═╝═╩╝╩╝╚╝╚═╝╩  ╩═╝╩ ╩╝╚╝   v1.0.0
```

`runcodingplan` is a zero-dependency NPX CLI that manages per-session Claude Code settings for alternative AI providers. Pick a provider (ZAI / Kimi / MiniMax / Alibaba / custom), pick a model, and launch Claude Code with the right `ANTHROPIC_*` env vars — without ever touching your original `~/.claude/settings.json`.

## Quick Start

```bash
# 1) Interactive menu
npx runcodingplan

# 2) Save a provider API key
npx runcodingplan -p zai -a sk-xxx...

# 3) Launch with a specific model
npx runcodingplan -p zai -m glm-5.1

# 4) Sync the model registry from GitHub
npx runcodingplan -u
```

## Built-in Providers

| ID | Provider | Signup |
|----|----------|--------|
| `zai` | ZAI (Zhipu AI) | https://z.ai/subscribe |
| `kimi` | Kimi (Moonshot AI) | https://kimi.com/code |
| `minimax` | MiniMax | https://platform.minimax.io/subscribe/token-plan |
| `alibaba` | Alibaba DashScope Coding Plan | https://www.alibabacloud.com/en/campaign/ai-scene-coding |

Run `npx runcodingplan -l` to see all models.

## 🎁 Referral / Affiliate Links

**Full disclosure:** the links below are my personal referral codes. If you subscribe through them **you get a discount / signup bonus, and I get a small referral credit** at no extra cost to you. Using the plain signup URLs in the table above works exactly the same — use whichever you prefer.

| Provider | Affiliate Link | What you get |
|----------|----------------|--------------|
| **ZAI — GLM Coding Plan** | [`bit.ly/4tJ4GLP`](https://bit.ly/4tJ4GLP) | Full Claude Code / Cline support, plans from $18/mo |
| **MiniMax — Token Plan** | [`bit.ly/4tgh1rh`](https://bit.ly/4tgh1rh) | 10% off + API vouchers |

These codes are **also embedded in the app** (shown with a `🎁` icon + `(affiliate)` tag whenever a provider has no API key). They're served from [`registry/models.json`](registry/models.json) so running `npx runcodingplan -u` pulls the latest links — if a code ever expires, the repo is the source of truth.

## Usage

### Interactive

```
npx runcodingplan
```

Shows a status box of every provider, lets you pick one, optionally prompts for an API key, then asks for a model, confirms flags, writes a session file and spawns `claude` with it.

### Direct launch

```bash
npx runcodingplan -p kimi                              # default model
npx runcodingplan -p kimi -m kimi-k2.6-code-preview    # specific model
npx runcodingplan -p alibaba -m qwen3-coder-plus -sd   # with --dangerously-skip-permissions
```

### Custom providers

Any Anthropic-compatible endpoint works:

```bash
# Interactive
npx runcodingplan --add-custom

# One-shot
npx runcodingplan --add-custom \
  --name "DeepSeek" \
  --url "https://api.deepseek.com/anthropic" \
  -a sk-xxx \
  -m deepseek-r3

# Launch it
npx runcodingplan -p deepseek
```

Remove one:

```bash
npx runcodingplan --remove-custom deepseek
```

### User-added models

Add a model to any built-in provider without waiting for a registry update:

```bash
npx runcodingplan -p zai --add-model glm-6 --set-default
npx runcodingplan -p zai --remove-model glm-6
```

User-added models show with `(*)`. When you run `npx runcodingplan -u` and the registry now contains that model, it is auto-promoted out of `userModels`.

### Everything else

```bash
npx runcodingplan --list            # list providers + models
npx runcodingplan --list-custom     # only custom
npx runcodingplan --status          # config, keys, sessions
npx runcodingplan --clean           # remove session files >24h old
npx runcodingplan -p zai --remove-key
npx runcodingplan --no-launch -p zai    # write session file only
npx runcodingplan --dry-run -p zai      # print session JSON to stdout
```

### CLI flags

| Flag | Alias | Value | Description |
|------|-------|-------|-------------|
| `--provider` | `-p` | id | `zai`, `kimi`, `minimax`, `alibaba`, or custom |
| `--model` | `-m` | id | Model name |
| `--apikey` | `-a` | string | Set/update API key |
| `--skip-dangerous` | `-sd` | | Add `--dangerously-skip-permissions` |
| `--statusline` | `-sl` | | Include statusLine config |
| `--update` | `-u` | | Pull registry from GitHub |
| `--list` | `-l` | | List all providers |
| `--list-custom` | | | List only custom providers |
| `--status` | | | Show current config |
| `--remove-key` | | | Remove provider API key |
| `--add-custom` | | | Add custom provider (interactive or flags) |
| `--remove-custom` | | id | Remove custom provider |
| `--add-model` | | id | Add a model to provider |
| `--remove-model` | | id | Remove user-added model |
| `--set-default` | | | Make added/selected model the default |
| `--name` | | string | Custom provider name (with `--add-custom`) |
| `--url` | | url | Custom provider base URL (with `--add-custom`) |
| `--clean` | | | Delete stale session files |
| `--no-launch` | | | Write session file, don't launch |
| `--dry-run` | | | Print session JSON to stdout |
| `--version` | `-v` | | Show version |
| `--help` | `-h` | | Show help |

## How it works

`runcodingplan` **never** modifies `~/.claude/settings.json`. For every launch it:

1. Resolves the provider (built-in registry + user-added models, or custom).
2. Decrypts the API key from `~/.claude/.runcodingplan/keys.json`.
3. Writes a one-off `~/.claude/runcodingplan-<provider>-<timestamp>.json` with the right `ANTHROPIC_*` env vars and (optionally) a `statusLine`.
4. Spawns `claude --settings <that-file>` with your stdio attached.
5. Old session files (>24h) are cleaned up next time you run.

### File layout

```
~/.claude/
├── settings.json                    # your original settings — UNTOUCHED
├── runcodingplan-zai-<ts>.json            # per-launch session file
└── .runcodingplan/
    ├── config.json                  # provider defaults, user models, custom providers
    ├── keys.json                    # AES-256-GCM encrypted API keys
    └── registry.json                # cached model registry from GitHub
```

### Security

API keys are encrypted with **AES-256-GCM**. The key is derived with PBKDF2 from `hostname + username + salt`, so copying `keys.json` to another machine will fail to decrypt. Not a hardware-backed keystore — good enough to prevent casual plaintext exposure, and your cleartext key only lives inside the per-session JSON file (which you can purge with `--clean`).

## Requirements

- Node.js ≥ 18
- Claude Code installed (`claude` on `$PATH` / `claude.cmd` on Windows)

## Development

```bash
pnpm install
pnpm test
pnpm build
node dist/index.js --help
```

## 🔗 Also by @ersinkoc

If `runcodingplan` saved you time, you might like these too:

### 🏗️ [project-architect](https://github.com/ersinkoc/project-architect)
> **An Agent Skill for documentation-first project planning.**
> Transforms a project idea into implementation-ready blueprints and a single-shot coding agent prompt.

Describe what you want to build → get a full spec, folder layout, and an agent-ready prompt. Ship the plan, not vibes.

### 🛡️ [security-check](https://github.com/ersinkoc/security-check)
> **Your AI becomes a Security Team. Every Language. Every Layer. Zero Tools.**

```bash
npx skills add ersinkoc/security-check
```

No scanners, no subscriptions — drop the skill into your agent and it audits your codebase for OWASP, auth, crypto, injection, secrets, and config issues end-to-end.

---

## License

MIT © [Ersin Koc](https://github.com/ersinkoc)
