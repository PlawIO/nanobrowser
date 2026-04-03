<h1 align="center">
    <img src="https://github.com/user-attachments/assets/ec60b0c4-87ba-48f4-981a-c55ed0e8497b" height="100" width="375" alt="veto-browse" /><br>
</h1>

<div align="center">

[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/PlawIO/veto-browse)
[![Twitter](https://img.shields.io/badge/Twitter-000000?style=for-the-badge&logo=x&logoColor=white)](https://x.com/yazcal)
[![Discord](https://img.shields.io/badge/Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/NN3ABHggMK)
[![Docs](https://img.shields.io/badge/Docs-0F172A?style=for-the-badge&logo=gitbook&logoColor=white)](https://docs.veto.so)
[![Website](https://img.shields.io/badge/Website-2563EB?style=for-the-badge&logo=googlechrome&logoColor=white)](https://veto.so)
[![License](https://img.shields.io/badge/License-Apache_2.0-green?style=for-the-badge)](LICENSE)

</div>

**veto-browse** is a free, open-source AI browser automation extension with built-in policy enforcement. Type what you want automated. Set rules in plain English. The agents run — and stay within bounds.

Part of the [Veto](https://veto.so) ecosystem: the open policy layer for AI agents.

<div align="center">
<img src="https://github.com/user-attachments/assets/112c4385-7b03-4b81-a352-4f348093351b" width="640" alt="veto-browse in action" />
<p><em>Multi-agent system running locally in the browser — Planner, Navigator, and Veto SDK enforcing policies in real-time.</em></p>
</div>

---

## Install

**Manual install (always latest):**

1. Download `veto-browse.zip` from the [releases page](https://github.com/PlawIO/veto-browse/releases)
2. Unzip it
3. Open `chrome://extensions/`, enable **Developer mode**, click **Load unpacked**
4. Select the unzipped folder

Then click the veto-browse icon, open Settings, add your LLM API key, and go.

---

## What makes it different

Most browser agents are black boxes. veto-browse ships with the [Veto SDK](https://github.com/PlawIO/veto) built in — a policy enforcement layer that intercepts every agent action before it executes.

**You write policies in plain English:**

> "Don't purchase anything over $150 without my approval."
> "Never visit our top 3 competitors' pricing pages."
> "Block all social media after I've spent 20 minutes there today."

veto-browse converts these into typed Veto rules, enforces them locally at sub-millisecond speed, and shows you each enforcement decision in the side panel. The agent adapts when blocked. Approvals pause execution and wait for you.

This isn't a filter bolted on after the fact. It's the enforcement layer running inside the agent loop.

---

## Architecture

Three components collaborate on every task:

| Component | Role |
|-----------|------|
| **Planner** | Breaks down the task, decides strategy, recovers from failures |
| **Navigator** | Executes DOM interactions — clicks, forms, scrolls, extracts |
| **Veto SDK** | Intercepts every agent action against your policy rules before it fires |

Each agent uses its own model. Run Sonnet for planning and Flash for navigation — tune cost vs. capability per role.

---

## How it connects to Veto

```
veto-browse (this repo)
    └── Veto Browser SDK  ──▶  veto-sdk (npm)  ──▶  Veto Platform (veto.so)
```

- **[veto-sdk](https://github.com/PlawIO/veto)** — open policy SDK, Apache-2.0, runs anywhere
- **[Veto Platform](https://veto.so)** — manage policies, view audit trails, share rules across agents
- **veto-browse** — browser automation layer, runs agents locally, enforces via the SDK

Run veto-browse standalone with local-only policies. Or connect to the Veto Platform for persistent rule management and cross-session audit logs.

---

## LLM support

Your keys, your models, your data. Supported providers:

- **Anthropic** — Claude Sonnet, Haiku
- **OpenAI** — GPT-4o, GPT-4o-mini
- **Google** — Gemini 2.5 Flash/Pro
- **Ollama** — fully local, zero API cost
- **Groq, Cerebras, Llama, OpenRouter** — any OpenAI-compatible endpoint

Nothing is proxied. Keys stay in your browser. Traffic goes directly to your provider.

**Recommended configs:**

| Goal | Planner | Navigator |
|------|---------|-----------|
| Best performance | Claude Sonnet 4 | Claude Haiku 3.5 |
| Cost-efficient | GPT-4o or Claude Haiku | Gemini 2.5 Flash |
| Fully local | Qwen3-30B (Ollama) | Mistral-Small-24B (Ollama) |

---

## Build from source

```bash
git clone https://github.com/PlawIO/veto-browse.git
cd veto-browse
pnpm install
pnpm build
```

Load `dist/` as an unpacked extension via `chrome://extensions/`.

**Dev mode with hot reload:**

```bash
pnpm dev
```

**Requirements:** Node.js v22.12.0+, pnpm v9.15.1+

---

## Contributing

PRs welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Most useful areas:
- Local model compatibility and prompt tuning
- Veto policy templates for common automation use cases
- Agent action coverage (new DOM interactions, edge cases)
- Tests for agent behaviors

Join [Discord](https://discord.gg/NN3ABHggMK) before building a large feature — coordinate first.

---

## Community

- [Discord](https://discord.gg/NN3ABHggMK) — talk to the team and other builders
- [X / Twitter](https://x.com/yazcal) — updates and announcements
- [GitHub Discussions](https://github.com/PlawIO/veto-browse/discussions) — ideas and questions

---

## Security

Don't open a public issue for vulnerabilities. Use [GitHub Security Advisories](https://github.com/PlawIO/veto-browse/security/advisories/new) to report responsibly.

---

## License

Apache License 2.0. See [LICENSE](LICENSE).

Built on [chrome-extension-boilerplate-react-vite](https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite), [LangChain.js](https://github.com/langchain-ai/langchainjs), and [Puppeteer](https://github.com/puppeteer/puppeteer).

---

<div align="center">

Made by [PlawIO](https://github.com/PlawIO) · [veto.so](https://veto.so) · [docs.veto.so](https://docs.veto.so)

</div>
