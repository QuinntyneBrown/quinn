export type { Tool } from './base.js';
export { ToolRegistry } from './registry.js';

import type { Tool } from './base.js';
import { readFileTool } from './read-file.js';
import { writeFileTool } from './write-file.js';
import { editFileTool } from './edit-file.js';
import { shellTool } from './shell.js';
import { globTool } from './glob-tool.js';
import { grepTool } from './grep-tool.js';
import { webFetchTool } from './web-fetch.js';
import { browserTool } from './browser.js';

/**
 * Instantiate and return all built-in tools.
 */
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
  ];
}
