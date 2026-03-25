# Quinn

Local LLM coding agent CLI — like Claude Code, but fully offline via [Ollama](https://ollama.ai).

Quinn is an interactive terminal agent that can read, write, and edit files, run shell commands, search codebases, fetch web pages, and automate a browser — all powered by local models running on your machine.

## Features

- **Fully offline** — runs against Ollama, no API keys or cloud calls required
- **Agentic tool use** — the model decides when to read files, run commands, edit code, etc.
- **Built-in tools** — file read/write/edit, shell, glob, grep, web fetch, browser automation
- **Interactive REPL** or one-shot mode
- **Model selection** — use any model available in your Ollama instance

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [Ollama](https://ollama.ai) running locally with at least one model pulled

```bash
# Install Ollama, then pull a model
ollama pull gemma3:4b
```

## Installation

```bash
git clone https://github.com/<your-username>/quinn.git
cd quinn
npm install
npm run build
```

To make the `quinn` command available globally:

```bash
npm link
```

## Usage

```bash
# Start the interactive REPL
quinn

# Run a single prompt
quinn "explain this codebase"

# Use a specific model
quinn -m codellama "fix the bug in auth.ts"

# List available Ollama models
quinn --list-models
```

### Options

| Flag | Description |
|---|---|
| `-h, --help` | Show help |
| `-m, --model <name>` | Choose a model (default: first available or `gemma3:4b`) |
| `-s, --system <text>` | Add custom system prompt text |
| `--list-models` | List available Ollama models |

## Development

```bash
npm run dev          # Watch mode (recompile on change)
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
npm run lint         # Type-check without emitting
```

## Project Structure

```
src/
├── index.ts          # Entry point & argument parsing
├── cli.ts            # Interactive REPL
├── agent/            # Agent loop (tool-use orchestration)
├── llm/              # Ollama client & system prompt
├── tools/            # Built-in tools (file, shell, grep, browser, …)
├── types/            # Shared type definitions
└── ui/               # Terminal rendering
```

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)
