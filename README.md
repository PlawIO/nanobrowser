<div align="center">

# veto-browse

**AI browser automation with built-in policy enforcement**

Free. Open source. Runs locally. Enforces your rules.

[![License](https://img.shields.io/badge/License-Apache_2.0-green?style=flat-square)](LICENSE)
[![GitHub](https://img.shields.io/badge/PlawIO%2Fveto--browse-181717?style=flat-square&logo=github)](https://github.com/PlawIO/veto-browse)
[![Discord](https://img.shields.io/badge/Discord-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.gg/NN3ABHggMK)
[![Docs](https://img.shields.io/badge/docs.veto.so-0F172A?style=flat-square)](https://docs.veto.so)
[![Website](https://img.shields.io/badge/veto.so-2563EB?style=flat-square)](https://veto.so)

</div>

---

veto-browse is a Chrome extension that runs a multi-agent AI system locally in your browser. A free alternative to OpenAI Operator — bring your own API keys, keep your data local.

What sets it apart: it ships with the **[Veto SDK](https://github.com/PlawIO/veto)** built in. Before any agent action fires, Veto checks it against your rules. You write policies in plain English. The agent stays within bounds.

```
"Don't purchase anything over $150 without my approval."
"Never visit our top 3 competitors' pricing pages."
"Block all social media after I've spent 20 minutes there today."
```

These become typed, enforced rules — not just prompts.

---

## Install

1. Download `veto-browse.zip` from the [releases page](https://github.com/PlawIO/veto-browse/releases)
2. Unzip it
3. Open `chrome://extensions/` → enable **Developer mode** → click **Load unpacked**
4. Select the unzipped folder

Open the extension, go to Settings, add your API key, and start automating.

---

## How it works

Three components run on every task:

| Component | What it does |
|-----------|-------------|
| **Planner** | Breaks down tasks, builds a strategy, recovers from failures |
| **Navigator** | Executes DOM actions — clicks, forms, scrolls, extraction |
| **Veto SDK** | Intercepts every action against your rules before it fires |

Each agent uses its own model. Mix Sonnet for planning and Flash for navigation to balance cost and capability.

The enforcement happens inside the agent loop, not as a post-hoc filter. When a rule triggers `require_approval`, execution pauses and waits for you. When it triggers `block`, the action is stopped and the agent adapts.

---

## LLM support

Bring your own keys. Supported providers:

| Provider | Models |
|----------|--------|
| Anthropic | Claude Sonnet 4, Haiku 3.5 |
| OpenAI | GPT-4o, GPT-4o-mini |
| Google | Gemini 2.5 Flash, Gemini 2.5 Pro |
| Ollama | Any local model — zero cost, fully private |
| Groq / Cerebras / OpenRouter | Any OpenAI-compatible endpoint |

Your keys stay in your browser. Nothing is proxied.

**Recommended setup:** Planner on Claude Sonnet 4, Navigator on Gemini 2.5 Flash.

---

## Veto ecosystem

```
veto-browse
    └── veto-sdk (npm, Apache-2.0)  ──▶  Veto Platform (veto.so)
```

- **[veto-sdk](https://github.com/PlawIO/veto)** — the open policy SDK. Runs anywhere, sub-ms evaluation.
- **[Veto Platform](https://veto.so)** — manage rules, view audit trails, sync policies across agents.
- **veto-browse** — browser automation layer. Works standalone or connected to the platform.

---

## Build from source

```bash
git clone https://github.com/PlawIO/veto-browse.git
cd veto-browse
pnpm install
pnpm build
# load dist/ as unpacked extension in chrome://extensions/
```

Dev mode with hot reload:

```bash
pnpm dev
```

Requires Node.js v22.12.0+, pnpm v9.15.1+

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Join [Discord](https://discord.gg/NN3ABHggMK) before building a large feature.

Most useful areas: local model tuning, Veto policy templates, agent action coverage, tests.

---

## Security

Use [GitHub Security Advisories](https://github.com/PlawIO/veto-browse/security/advisories/new) for vulnerabilities — not public issues.

---

## License

Apache 2.0. See [LICENSE](LICENSE).

Built on [chrome-extension-boilerplate-react-vite](https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite), [LangChain.js](https://github.com/langchain-ai/langchainjs), and [Puppeteer](https://github.com/puppeteer/puppeteer).

---

<div align="center">
<a href="https://veto.so">veto.so</a> · <a href="https://docs.veto.so">docs</a> · <a href="https://x.com/yazcal">@yazcal</a>
</div>
