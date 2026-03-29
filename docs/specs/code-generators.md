# Design: Predetermined Code Generators for Python, Blazor, and React

## 1. Overview

### Problem

When Quinn receives a coding task, the agent loop sends it to the LLM, which reasons through the entire code structure token-by-token — class declarations, boilerplate, import statements, standard patterns — all consuming inference time and producing inconsistent results. For well-understood code structures (classes, interfaces, components, services, full project scaffolds), this reasoning is unnecessary overhead.

### Solution

Introduce a **Code Generator Tool System** — a set of deterministic, template-driven tools that the LLM can invoke to instantly produce code artifacts without reasoning through every line. When the agent receives a task like "create a React component called UserProfile," it matches the intent to a code generator tool and calls it with structured parameters. The tool returns fully-formed, idiomatic code immediately — no token-by-token generation of boilerplate.

### How It Works

1. The LLM receives a user request (e.g., "create a Python dataclass called Order with fields: id, customer_name, total")
2. Instead of generating the code character-by-character, the LLM recognizes this matches a code generator tool
3. The LLM calls `python_generate_class` with `{ "name": "Order", "fields": [...], "style": "dataclass" }`
4. The tool returns the complete, correct Python file instantly
5. The LLM presents the result to the user, optionally writing it to disk via `write_file`

### Benefits

- **Speed**: Template expansion is instant vs. hundreds of tokens of LLM inference
- **Consistency**: Every generated artifact follows the same conventions and style
- **Correctness**: Templates are pre-validated; no hallucinated syntax or missing imports
- **Composability**: Generators can be chained — generate a service, then its interface, then its tests
- **Local-first**: Generators run entirely in-process with zero network calls

---

## 2. Architecture

### 2.1 Component Diagram

```
┌──────────────────────────────────────────────────────┐
│                     Agent Loop                       │
│                    (loop.ts)                          │
└──────────────┬───────────────────────────────────────┘
               │ tool call
               ▼
┌──────────────────────────────────────────────────────┐
│                  Tool Registry                       │
│                (registry.ts)                         │
│                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐             │
│  │ read_file│ │write_file│ │  shell   │  ...        │
│  └──────────┘ └──────────┘ └──────────┘             │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │           Code Generator Tools                  │ │
│  │                                                 │ │
│  │  ┌──────────────┐ ┌──────────────┐              │ │
│  │  │ python_gen_* │ │ blazor_gen_* │              │ │
│  │  └──────┬───────┘ └──────┬───────┘              │ │
│  │         │                │                      │ │
│  │  ┌──────┴───────┐ ┌─────┴────────┐             │ │
│  │  │ react_gen_*  │ │scaffold_gen_*│             │ │
│  │  └──────┬───────┘ └──────┬───────┘              │ │
│  │         │                │                      │ │
│  │         ▼                ▼                      │ │
│  │  ┌──────────────────────────────────┐           │ │
│  │  │       Template Engine            │           │ │
│  │  │     (template-engine.ts)         │           │ │
│  │  └──────────────────────────────────┘           │ │
│  └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### 2.2 File Structure

```
src/tools/
├── generators/
│   ├── index.ts                    # Registers all generator tools
│   ├── template-engine.ts          # Core template rendering engine
│   ├── types.ts                    # Shared types for generators
│   │
│   ├── python/
│   │   ├── index.ts                # Registers Python generator tools
│   │   ├── python-class.ts         # python_generate_class tool
│   │   ├── python-function.ts      # python_generate_function tool
│   │   ├── python-module.ts        # python_generate_module tool
│   │   ├── python-test.ts          # python_generate_test tool
│   │   ├── python-api.ts           # python_generate_api tool
│   │   └── templates/
│   │       ├── class.ts
│   │       ├── dataclass.ts
│   │       ├── pydantic-model.ts
│   │       ├── function.ts
│   │       ├── module.ts
│   │       ├── pytest.ts
│   │       ├── fastapi-router.ts
│   │       └── flask-blueprint.ts
│   │
│   ├── blazor/
│   │   ├── index.ts                # Registers Blazor generator tools
│   │   ├── blazor-component.ts     # blazor_generate_component tool
│   │   ├── blazor-service.ts       # blazor_generate_service tool
│   │   ├── blazor-page.ts          # blazor_generate_page tool
│   │   ├── blazor-model.ts         # blazor_generate_model tool
│   │   └── templates/
│   │       ├── component.ts
│   │       ├── service.ts
│   │       ├── page.ts
│   │       ├── model.ts
│   │       ├── interface.ts
│   │       └── solution.ts
│   │
│   └── react/
│       ├── index.ts                # Registers React generator tools
│       ├── react-component.ts      # react_generate_component tool
│       ├── react-hook.ts           # react_generate_hook tool
│       ├── react-context.ts        # react_generate_context tool
│       ├── react-page.ts           # react_generate_page tool
│       ├── react-store.ts          # react_generate_store tool
│       └── templates/
│           ├── functional-component.ts
│           ├── hook.ts
│           ├── context.ts
│           ├── page.ts
│           ├── store-slice.ts
│           └── test.ts
```

---

## 3. Core Components

### 3.1 TemplateEngine

**File**: `src/tools/generators/template-engine.ts`

The central rendering engine that all generators delegate to. It takes a template string with placeholders and a data context, and produces the final code string.

```typescript
export interface TemplateContext {
  [key: string]: string | string[] | boolean | TemplateContext | TemplateContext[];
}

export class TemplateEngine {
  /**
   * Render a template string with the given context.
   * Supports: {{variable}}, {{#if cond}}...{{/if}},
   * {{#each items}}...{{/each}}, and {{#indent n}}...{{/indent}}.
   */
  render(template: string, context: TemplateContext): string;

  /**
   * Render a template and apply language-specific formatting
   * (indentation style, line endings, trailing newline).
   */
  renderFormatted(template: string, context: TemplateContext, lang: Language): string;
}
```

**Responsibilities**:
- Variable interpolation (`{{name}}`, `{{className}}`)
- Conditional blocks (`{{#if hasConstructor}}...{{/if}}`)
- Iteration blocks (`{{#each fields}}...{{/each}}`)
- Indentation control (`{{#indent 2}}...{{/indent}}`)
- Language-aware formatting (tabs vs. spaces, trailing newlines)

### 3.2 GeneratorTypes

**File**: `src/tools/generators/types.ts`

Shared type definitions used across all generators.

```typescript
export type Language = 'python' | 'csharp' | 'typescript' | 'tsx';

export interface FieldDefinition {
  name: string;
  type: string;
  default?: string;
  optional?: boolean;
  description?: string;
}

export interface MethodDefinition {
  name: string;
  parameters: FieldDefinition[];
  returnType: string;
  isAsync?: boolean;
  isStatic?: boolean;
  body?: string;
  description?: string;
}

export interface ImportDefinition {
  module: string;
  names?: string[];       // named imports
  defaultName?: string;   // default import
  isTypeOnly?: boolean;   // `import type` in TS
}

export interface GeneratorResult {
  filename: string;
  content: string;
  language: Language;
}
```

### 3.3 Generator Tool Index

**File**: `src/tools/generators/index.ts`

Collects all generator tools and exports them for registration with the ToolRegistry.

```typescript
import type { Tool } from '../base.js';
import { createPythonGeneratorTools } from './python/index.js';
import { createBlazorGeneratorTools } from './blazor/index.js';
import { createReactGeneratorTools } from './react/index.js';

export function createGeneratorTools(): Tool[] {
  return [
    ...createPythonGeneratorTools(),
    ...createBlazorGeneratorTools(),
    ...createReactGeneratorTools(),
  ];
}
```

---

## 4. Python Generators

### 4.1 `python_generate_class`

**File**: `src/tools/generators/python/python-class.ts`

Generates a Python class with fields, methods, constructor, and optional inheritance.

**Parameters (JSON Schema)**:

| Parameter | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Class name (PascalCase) |
| `style` | enum | no | `"standard"`, `"dataclass"`, `"pydantic"` — default `"standard"` |
| `fields` | array | no | Array of `{ name, type, default? }` |
| `methods` | array | no | Array of `{ name, parameters, return_type, is_async?, body? }` |
| `bases` | string[] | no | Base classes to inherit from |
| `decorators` | string[] | no | Class-level decorators |
| `docstring` | string | no | Class docstring |

**Behavior**:
- `style: "standard"` — generates a plain class with `__init__` and typed attributes
- `style: "dataclass"` — generates a `@dataclass` with field declarations
- `style: "pydantic"` — generates a `BaseModel` subclass with `Field()` declarations
- Auto-generates correct import statements based on style and types used
- Produces `__repr__`, `__eq__` for standard classes when fields are present

**Example invocation**:
```json
{
  "name": "Order",
  "style": "dataclass",
  "fields": [
    { "name": "id", "type": "int" },
    { "name": "customer_name", "type": "str" },
    { "name": "total", "type": "float", "default": "0.0" },
    { "name": "items", "type": "list[OrderItem]", "default": "field(default_factory=list)" }
  ],
  "docstring": "Represents a customer order."
}
```

**Output**:
```python
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class Order:
    """Represents a customer order."""

    id: int
    customer_name: str
    total: float = 0.0
    items: list[OrderItem] = field(default_factory=list)
```

### 4.2 `python_generate_function`

**File**: `src/tools/generators/python/python-function.ts`

Generates a standalone Python function or async function.

**Parameters**:

| Parameter | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Function name (snake_case) |
| `parameters` | array | no | Array of `{ name, type, default? }` |
| `return_type` | string | no | Return type annotation |
| `is_async` | boolean | no | Whether to generate `async def` |
| `decorators` | string[] | no | Function decorators |
| `docstring` | string | no | Function docstring |
| `body` | string | no | Function body (default: `pass`) |

### 4.3 `python_generate_module`

**File**: `src/tools/generators/python/python-module.ts`

Generates a complete Python module file with imports, constants, classes, and functions.

**Parameters**:

| Parameter | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Module filename (without `.py`) |
| `imports` | array | no | Array of `{ module, names? }` |
| `classes` | array | no | Array of class definitions (same schema as `python_generate_class`) |
| `functions` | array | no | Array of function definitions |
| `constants` | array | no | Array of `{ name, type, value }` |
| `docstring` | string | no | Module-level docstring |

### 4.4 `python_generate_test`

**File**: `src/tools/generators/python/python-test.ts`

Generates a pytest test file for a given module or class.

**Parameters**:

| Parameter | Type | Required | Description |
|---|---|---|---|
| `target_module` | string | yes | Module path to test (e.g., `app.models.order`) |
| `target_class` | string | no | Specific class to test |
| `methods` | string[] | no | Methods to generate tests for |
| `style` | enum | no | `"function"` or `"class"` — default `"function"` |
| `use_fixtures` | boolean | no | Whether to generate pytest fixtures |

### 4.5 `python_generate_api`

**File**: `src/tools/generators/python/python-api.ts`

Generates API route handlers for FastAPI or Flask.

**Parameters**:

| Parameter | Type | Required | Description |
|---|---|---|---|
| `framework` | enum | yes | `"fastapi"` or `"flask"` |
| `resource_name` | string | yes | Resource name (e.g., `"orders"`) |
| `model_name` | string | yes | Associated model class name |
| `operations` | string[] | no | CRUD operations: `["create", "read", "list", "update", "delete"]` — default all |

---

## 5. Blazor Generators

### 5.1 `blazor_generate_component`

**File**: `src/tools/generators/blazor/blazor-component.ts`

Generates a Blazor component (`.razor` + `.razor.cs` code-behind).

**Parameters**:

| Parameter | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Component name (PascalCase) |
| `parameters` | array | no | `[Parameter]` properties: `{ name, type, default? }` |
| `inject_services` | array | no | Services to inject: `{ type, name }` |
| `has_code_behind` | boolean | no | Generate separate `.razor.cs` file — default `true` |
| `lifecycle_methods` | string[] | no | e.g., `["OnInitializedAsync", "OnParametersSet"]` |
| `render_mode` | enum | no | `"Server"`, `"WebAssembly"`, `"Auto"` — default `"Server"` |

**Output** (two files):

`UserProfile.razor`:
```razor
@page "/user-profile"
@rendermode InteractiveServer
@inherits UserProfileBase

<div class="user-profile">
    <h3>@Title</h3>
    @ChildContent
</div>
```

`UserProfile.razor.cs`:
```csharp
using Microsoft.AspNetCore.Components;

public partial class UserProfileBase : ComponentBase
{
    [Parameter]
    public string Title { get; set; } = string.Empty;

    [Parameter]
    public RenderFragment? ChildContent { get; set; }

    [Inject]
    private IUserService UserService { get; set; } = default!;

    protected override async Task OnInitializedAsync()
    {
        await base.OnInitializedAsync();
    }
}
```

### 5.2 `blazor_generate_service`

**File**: `src/tools/generators/blazor/blazor-service.ts`

Generates a C# service class and its interface, following the dependency injection pattern.

**Parameters**:

| Parameter | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Service name (e.g., `"OrderService"`) |
| `methods` | array | yes | Array of `{ name, parameters, return_type, is_async? }` |
| `dependencies` | array | no | Constructor-injected dependencies: `{ type, name }` |
| `namespace` | string | no | C# namespace |
| `generate_interface` | boolean | no | Also generate `IOrderService` — default `true` |

**Output** (two files):

`IOrderService.cs` — the interface with method signatures.

`OrderService.cs` — the implementing class with constructor injection, method stubs, and XML doc comments.

### 5.3 `blazor_generate_page`

**File**: `src/tools/generators/blazor/blazor-page.ts`

Generates a Blazor page component with routing, layout, and page title.

**Parameters**:

| Parameter | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Page name |
| `route` | string | yes | Route template (e.g., `"/orders/{Id:int}"`) |
| `title` | string | no | Page title for `<PageTitle>` |
| `layout` | string | no | Layout component to use |
| `route_parameters` | array | no | Route parameters: `{ name, type, constraint? }` |
| `inject_services` | array | no | Services to inject |

### 5.4 `blazor_generate_model`

**File**: `src/tools/generators/blazor/blazor-model.ts`

Generates C# model/entity classes with properties, data annotations, and optional EF Core configuration.

**Parameters**:

| Parameter | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Model class name |
| `properties` | array | yes | `{ name, type, required?, max_length?, annotations? }` |
| `namespace` | string | no | C# namespace |
| `bases` | string[] | no | Base classes or interfaces |
| `generate_ef_config` | boolean | no | Generate a Fluent API `IEntityTypeConfiguration<T>` class |
| `generate_dto` | boolean | no | Also generate a DTO class |

---

## 6. React Generators

### 6.1 `react_generate_component`

**File**: `src/tools/generators/react/react-component.ts`

Generates a React functional component with TypeScript.

**Parameters**:

| Parameter | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Component name (PascalCase) |
| `props` | array | no | `{ name, type, required?, default? }` |
| `has_children` | boolean | no | Include `children: React.ReactNode` in props |
| `hooks` | string[] | no | Hooks to include (e.g., `["useState", "useEffect"]`) |
| `style` | enum | no | `"css-modules"`, `"styled"`, `"tailwind"`, `"none"` — default `"none"` |
| `generate_test` | boolean | no | Also generate a test file — default `false` |
| `generate_story` | boolean | no | Also generate a Storybook story — default `false` |

**Example invocation**:
```json
{
  "name": "UserCard",
  "props": [
    { "name": "user", "type": "User", "required": true },
    { "name": "onSelect", "type": "(id: string) => void", "required": false }
  ],
  "has_children": false,
  "hooks": ["useState"],
  "style": "css-modules"
}
```

**Output**:

`UserCard.tsx`:
```tsx
import { useState } from 'react';
import styles from './UserCard.module.css';

interface UserCardProps {
  user: User;
  onSelect?: (id: string) => void;
}

export function UserCard({ user, onSelect }: UserCardProps) {
  const [state, setState] = useState();

  return (
    <div className={styles.userCard}>
      {/* TODO: component content */}
    </div>
  );
}
```

`UserCard.module.css`:
```css
.userCard {
}
```

### 6.2 `react_generate_hook`

**File**: `src/tools/generators/react/react-hook.ts`

Generates a custom React hook.

**Parameters**:

| Parameter | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Hook name (must start with `use`, e.g., `"useAuth"`) |
| `parameters` | array | no | Hook parameters: `{ name, type }` |
| `return_type` | string | no | Return type |
| `state_variables` | array | no | `useState` calls: `{ name, type, initial_value }` |
| `effects` | array | no | `useEffect` blocks: `{ dependencies, description }` |
| `dependencies` | string[] | no | Other hooks this hook calls |

### 6.3 `react_generate_context`

**File**: `src/tools/generators/react/react-context.ts`

Generates a React Context with Provider component and `useContext` hook.

**Parameters**:

| Parameter | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Context name (e.g., `"Auth"` → `AuthContext`, `AuthProvider`, `useAuth`) |
| `state` | array | no | State fields: `{ name, type, initial_value }` |
| `actions` | array | no | Reducer actions or setter methods: `{ name, payload_type? }` |
| `pattern` | enum | no | `"useState"` or `"useReducer"` — default `"useState"` |

**Output** (single file `AuthContext.tsx`):
- Type definitions for the context value
- `createContext` with default value
- `AuthProvider` component with state management
- `useAuth()` hook with context access and error boundary

### 6.4 `react_generate_page`

**File**: `src/tools/generators/react/react-page.ts`

Generates a page-level component with data fetching and loading/error states.

**Parameters**:

| Parameter | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Page name |
| `route` | string | no | Route path (for comment/documentation) |
| `data_fetching` | enum | no | `"useEffect"`, `"react-query"`, `"swr"` — default `"useEffect"` |
| `has_loading_state` | boolean | no | Generate loading skeleton — default `true` |
| `has_error_state` | boolean | no | Generate error boundary — default `true` |
| `sections` | string[] | no | Named sections to scaffold in the layout |

### 6.5 `react_generate_store`

**File**: `src/tools/generators/react/react-store.ts`

Generates a state management store slice (Zustand or Redux Toolkit).

**Parameters**:

| Parameter | Type | Required | Description |
|---|---|---|---|
| `name` | string | yes | Store/slice name (e.g., `"cart"`) |
| `library` | enum | yes | `"zustand"` or `"redux-toolkit"` |
| `state` | array | yes | State fields: `{ name, type, initial_value }` |
| `actions` | array | no | Actions/mutations: `{ name, payload_type?, description? }` |
| `selectors` | array | no | Derived selectors: `{ name, return_type }` |
| `async_thunks` | array | no | (Redux only) Async thunks: `{ name, return_type, arg_type? }` |

---

## 7. Scaffold Generator (Cross-Framework)

### 7.1 `scaffold_generate_solution`

**File**: `src/tools/generators/scaffold/scaffold-solution.ts`

Generates an entire project scaffold with multiple files — the highest-level generator.

**Parameters**:

| Parameter | Type | Required | Description |
|---|---|---|---|
| `framework` | enum | yes | `"python-fastapi"`, `"python-flask"`, `"blazor-server"`, `"blazor-wasm"`, `"react-vite"`, `"react-next"` |
| `name` | string | yes | Project name |
| `features` | string[] | no | Features to include: `["auth", "database", "testing", "docker", "ci"]` |
| `entities` | array | no | Domain entities to scaffold: `{ name, fields }` |

**Behavior**:
- Generates a full directory structure with config files, entry points, and scaffolded modules
- For each entity in `entities`, generates the model, service/repository, API endpoints, and tests
- Returns a `GeneratorResult[]` array with all files and their contents
- The agent loop writes all files via `write_file` calls

---

## 8. Integration with Existing Tool System

### 8.1 Registration

Generator tools implement the existing `Tool` interface from `src/tools/base.ts`. They are registered alongside existing tools in `src/tools/index.ts`:

```typescript
import { createGeneratorTools } from './generators/index.js';

export function createDefaultTools(): Tool[] {
  return [
    readFileTool,
    writeFileTool,
    editFileTool,
    shellTool,
    globTool,
    grepTool,
    webFetchTool,
    browserTool,
    ...createGeneratorTools(),
  ];
}
```

### 8.2 Tool Definitions for LLM

Each generator tool exposes a JSON Schema `parameters` object so the LLM knows exactly what arguments to pass. The tool definitions are included in the Ollama `/api/chat` request via `ToolRegistry.getToolDefinitions()` — no changes to the registry are needed.

### 8.3 Agent Loop — No Changes Required

The generators are standard tools. The existing agent loop in `src/agent/loop.ts` already handles:
1. Sending tool definitions to the LLM
2. Parsing tool calls from the LLM response
3. Executing tools via the registry
4. Feeding results back to the LLM

The LLM naturally learns to prefer generator tools over manual code writing because the system prompt will instruct it to use generators when the task matches a known pattern.

### 8.4 System Prompt Addition

The system prompt (`src/llm/system-prompt.ts`) will include a section instructing the LLM:

> When the user asks you to create code artifacts (classes, components, services, APIs, etc.) for Python, Blazor, or React, prefer using the code generator tools over writing code manually. Generator tools produce consistent, idiomatic code instantly. Use `write_file` to save the generated output to disk.

---

## 9. Multi-File Output Handling

Some generators produce multiple files (e.g., a Blazor component produces `.razor` + `.razor.cs`, a React component with CSS modules produces `.tsx` + `.module.css`).

The generator tool's `execute()` method returns a JSON string containing an array of `GeneratorResult` objects:

```json
[
  { "filename": "UserProfile.razor", "content": "...", "language": "csharp" },
  { "filename": "UserProfile.razor.cs", "content": "...", "language": "csharp" }
]
```

The LLM then uses `write_file` for each entry. This keeps generators composable and stateless — they produce content, and the existing file tools handle persistence.

---

## 10. Extensibility

### Adding a New Generator

1. Create a new tool file implementing the `Tool` interface
2. Define a template in the corresponding `templates/` directory
3. Register the tool in the framework's `index.ts`
4. The tool appears automatically in the LLM's tool definitions

### Adding a New Framework

1. Create a new directory under `src/tools/generators/<framework>/`
2. Add templates and tool implementations
3. Export via `createGeneratorTools()` in `src/tools/generators/index.ts`
4. No changes to the agent loop, registry, or LLM integration

### Custom Templates

Future enhancement: allow users to provide custom templates via a `~/.quinn/templates/` directory that override or supplement the built-in templates.

---

## 11. Summary of All Tools

| Tool Name | Framework | Generates |
|---|---|---|
| `python_generate_class` | Python | Class (standard, dataclass, pydantic) |
| `python_generate_function` | Python | Standalone function / async function |
| `python_generate_module` | Python | Complete module with imports, classes, functions |
| `python_generate_test` | Python | Pytest test file |
| `python_generate_api` | Python | FastAPI router / Flask blueprint |
| `blazor_generate_component` | Blazor | Component (.razor + code-behind) |
| `blazor_generate_service` | Blazor | Service class + interface |
| `blazor_generate_page` | Blazor | Page component with routing |
| `blazor_generate_model` | Blazor | Model/entity + optional DTO + EF config |
| `react_generate_component` | React | Functional component + optional CSS/test/story |
| `react_generate_hook` | React | Custom hook |
| `react_generate_context` | React | Context + Provider + useContext hook |
| `react_generate_page` | React | Page with data fetching + loading/error states |
| `react_generate_store` | React | Zustand store / Redux Toolkit slice |
| `scaffold_generate_solution` | All | Full project scaffold with multiple entities |
