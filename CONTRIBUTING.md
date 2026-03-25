# Contributing to Quinn

Thanks for your interest in contributing! Here's how to get started.

## Getting Started

1. Fork the repository and clone your fork
2. Install dependencies: `npm install`
3. Build the project: `npm run build`
4. Run tests to make sure everything works: `npm test`

## Development Workflow

```bash
npm run dev          # Watch mode — recompiles on change
npm test             # Run the test suite
npm run test:watch   # Run tests in watch mode
npm run lint         # Type-check without emitting
```

## Making Changes

1. Create a branch from `main` for your work
2. Make your changes in small, focused commits
3. Add or update tests for any new functionality
4. Make sure all tests pass and `npm run lint` reports no errors
5. Open a pull request against `main`

## Pull Requests

- Keep PRs focused on a single change
- Write a clear title and description explaining what and why
- Link any related issues
- Make sure CI passes before requesting review

## Adding a New Tool

Quinn's tool system is in `src/tools/`. To add a new tool:

1. Create a new file in `src/tools/` (see existing tools for the pattern)
2. Implement the `Tool` interface from `src/tools/base.ts`
3. Register it in `src/tools/index.ts`
4. Add tests in `tests/`

## Reporting Bugs

Open an issue with:

- Steps to reproduce
- Expected vs actual behavior
- Your Node.js version, OS, and Ollama version

## Code Style

- TypeScript strict mode is enabled — fix all type errors
- Keep dependencies minimal
- Prefer simple, readable code over clever abstractions

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
