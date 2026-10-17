#!/usr/bin/env node
// Local MCP server over stdio (MCP 2026-07-28, official TypeScript SDK v2).
//   node mcp/stdio.mjs        or        npm run mcp
// stdout carries the protocol; anything else goes to stderr. Register it in a
// client with, for example: claude mcp add agentic-ai-lens -- node mcp/stdio.mjs
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { buildServer } from '../lib/mcp/server.mjs';

serveStdio(() => buildServer());
