# Quinn

Local LLM coding agent CLI — like Claude Code, but fully offline via [Ollama](https://ollama.ai).

Quinn is an interactive terminal agent that can read, write, and edit files, run shell commands, search codebases, fetch web pages, and automate a browser — all powered by local models running on your machine. No data leaves your machine unless you explicitly use a network tool.

## Features

- **Fully local** — all LLM inference via Ollama; no API keys, no cloud calls, no telemetry
- **Agentic tool use** — the model decides when to read files, run commands, edit code, etc.
- **9 built-in tools** — file read/write/edit, shell, glob, grep, web fetch, headless browser
- **Interactive REPL** with slash commands, or single-prompt mode
- **Any Ollama model** — works with models that support native tool calling, and automatically falls back to prompt-based tool calling for models that don't (like `gemma3:4b`)
- **Streaming** — token-by-token output as the model generates

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [Ollama](https://ollama.ai) running locally with at least one model pulled

```bash
# Install Ollama, then pull a model
ollama pull gemma3:4b
```

## Installation

```bash
git clone <repo-url>
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

# Add a custom system prompt
quinn -s "You are an expert in Rust" "convert this Python to Rust"

# List available Ollama models
quinn --list-models
```

### CLI Options

| Flag | Description |
|---|---|
| `-h, --help` | Show help |
| `-m, --model <name>` | Choose a model (default: first available) |
| `-s, --system <text>` | Append custom text to the system prompt |
| `--list-models` | List available Ollama models |

### REPL Commands

| Command | Description |
|---|---|
| `/help` | Show available commands |
| `/clear` | Clear conversation history |
| `/model <name>` | Show or switch the active model |
| `/tools` | List all available tools |
| `/exit` | Exit Quinn (also Ctrl+C or Ctrl+D) |

## Built-in Tools

| Tool | Description |
|---|---|
| `read_file` | Read file contents with line numbers, offset/limit support |
| `write_file` | Write or create files (creates parent directories) |
| `edit_file` | Replace a unique string in a file |
| `shell` | Execute shell commands with timeout |
| `glob` | Find files by glob pattern |
| `grep` | Search file contents by regex |
| `web_fetch` | Fetch a URL (makes a network request) |
| `browser` | Headless browser via Playwright (optional dependency) |

## Configuration

| Environment Variable | Description | Default |
|---|---|---|
| `OLLAMA_HOST` | Ollama server URL | `http://localhost:11434` |

## Privacy

Quinn is designed to keep your data local:

- All LLM inference happens through Ollama on your machine
- No telemetry, analytics, or crash reporting
- No remote LLM API calls
- Network requests only happen when you use `web_fetch` or `browser` tools, and the agent is instructed to inform you before making them

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
├── agent/
│   ├── conversation.ts   # Message history management
│   └── loop.ts           # Core agent loop (tool call/execute/feedback cycle)
├── llm/
│   ├── types.ts          # Shared TypeScript types
│   ├── ollama.ts         # Ollama HTTP client (streaming, model listing)
│   ├── tool-call-parser.ts   # Fallback parser for prompt-based tool calling
│   └── system-prompt.ts  # System prompt construction
├── tools/
│   ├── base.ts           # Tool interface
│   ├── registry.ts       # Tool registry
│   ├── read-file.ts      # read_file
│   ├── write-file.ts     # write_file
│   ├── edit-file.ts      # edit_file
│   ├── shell.ts          # shell
│   ├── glob-tool.ts      # glob
│   ├── grep-tool.ts      # grep
│   ├── web-fetch.ts      # web_fetch
│   ├── browser.ts        # browser (Playwright)
│   └── index.ts          # Tool registration
└── ui/
    └── renderer.ts       # Terminal output & markdown rendering
```

## License

MIT
