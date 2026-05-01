#!/usr/bin/env node
/**
 * iJustOrder MCP Server
 *
 * Exposes the iJustOrder in-venue ordering platform API as MCP tools
 * for LLMs and AI agents to manage venues, events, menus, sections,
 * tickets, promotions, orders, carts, and payments.
 *
 * Transports:
 *   - Streamable HTTP  POST /mcp   (modern, works through CDN/proxies)
 *   - Legacy SSE       GET  /sse   (deprecated, kept for compatibility)
 *   - stdio                        (local MCP clients)
 *
 * REST endpoints:
 *   GET /health       — Server health & tool count
 *   GET /tools        — Full tool schema (JSON) for external integrations
 */
require('dotenv').config?.() || (() => {
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) process.env[match[1].trim()] = match[2].trim();
    });
  }
})();

const { randomUUID } = require('crypto');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');
const { StreamableHTTPServerTransport } = require('@modelcontextprotocol/sdk/server/streamableHttp.js');
const { isInitializeRequest } = require('@modelcontextprotocol/sdk/types.js');
const express = require('express');
const cors = require('cors');
const { zodToJsonSchema } = require('zod-to-json-schema');

const { registerVenueTools } = require('./tools/venues');
const { registerEventTools } = require('./tools/events');
const { registerSectionTools } = require('./tools/sections');
const { registerMenuTools } = require('./tools/menu');
const { registerTicketTools, registerPromotionTools } = require('./tools/tickets');
const { registerCartTools, registerOrderTools, registerPaymentTools } = require('./tools/orders');
const { registerUtilityTools } = require('./tools/utility');

// ── Tool schema registry (for /tools endpoint) ────────────────────
const toolRegistry = [];
function collectTool(name, description, schema) {
  const inputSchema = {};
  if (schema && typeof schema === 'object') {
    for (const [key, zodType] of Object.entries(schema)) {
      try {
        inputSchema[key] = zodToJsonSchema(zodType);
        delete inputSchema[key]['$schema'];
        delete inputSchema[key]['$ref'];
      } catch {
        inputSchema[key] = { type: 'string', description: key };
      }
    }
  }
  toolRegistry.push({ name, description, inputSchema });
}

// ── Factory: create a fresh MCP server with all tools ─────────────
function createServer() {
  const server = new McpServer({
    name: 'ijustorder',
    version: '1.0.0',
    description: 'iJustOrder — In-venue food, beverage, and merchandise ordering platform. Manage venues, events, menus, sections, orders, carts, payments, tickets, and promotions across 14+ stadiums and arenas.',
  });

  // Monkey-patch to collect schemas (only on first call)
  if (toolRegistry.length === 0) {
    const originalTool = server.tool.bind(server);
    server.tool = function(name, description, schema, handler) {
      if (typeof schema === 'function') {
        collectTool(name, description, {});
        return originalTool(name, description, schema);
      }
      collectTool(name, description, schema);
      return originalTool(name, description, schema, handler);
    };
  }

  registerVenueTools(server);
  registerEventTools(server);
  registerSectionTools(server);
  registerMenuTools(server);
  registerTicketTools(server);
  registerPromotionTools(server);
  registerCartTools(server);
  registerOrderTools(server);
  registerPaymentTools(server);
  registerUtilityTools(server);
  return server;
}

// Create initial server to collect tool registry
createServer();
const TOOL_COUNT = toolRegistry.length;

// ── Start ──────────────────────────────────────────────────────────
const TRANSPORT = (process.env.TRANSPORT || 'stdio').toLowerCase();
const PORT = parseInt(process.env.PORT || '3001', 10);

async function main() {
  if (TRANSPORT === 'http' || TRANSPORT === 'sse') {
    const app = express();
    app.use(cors());
    app.use(express.json());

    // Store all active transports
    const transports = {};

    // ── Health check ──
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', server: 'ijustorder-mcp', version: '1.0.0', tools: TOOL_COUNT });
    });

    // ── Tool schema endpoint (REST, no MCP handshake needed) ──
    app.get('/tools', (req, res) => {
      res.json({
        server: 'ijustorder',
        version: '1.0.0',
        total_tools: TOOL_COUNT,
        tools: toolRegistry,
      });
    });

    // ================================================================
    // STREAMABLE HTTP TRANSPORT — /mcp (modern, CDN-compatible)
    // ================================================================
    app.all('/mcp', async (req, res) => {
      try {
        const sessionId = req.headers['mcp-session-id'];
        let transport;

        if (sessionId && transports[sessionId]) {
          const existing = transports[sessionId];
          if (existing instanceof StreamableHTTPServerTransport) {
            transport = existing;
          } else {
            res.status(400).json({
              jsonrpc: '2.0',
              error: { code: -32000, message: 'Session uses a different transport protocol' },
              id: null,
            });
            return;
          }
        } else if (!sessionId && req.method === 'POST' && isInitializeRequest(req.body)) {
          // New session — create transport and connect
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            onsessioninitialized: (sid) => {
              transports[sid] = transport;
            },
          });
          transport.onclose = () => {
            const sid = transport.sessionId;
            if (sid && transports[sid]) delete transports[sid];
          };
          const server = createServer();
          await server.connect(transport);
        } else if (!sessionId) {
          res.status(400).json({
            jsonrpc: '2.0',
            error: { code: -32000, message: 'Bad Request: Missing session ID. Send an initialize request first.' },
            id: null,
          });
          return;
        } else {
          res.status(404).json({
            jsonrpc: '2.0',
            error: { code: -32000, message: 'Session not found. It may have expired.' },
            id: null,
          });
          return;
        }

        await transport.handleRequest(req, res, req.body);
      } catch (error) {
        console.error('Error handling /mcp request:', error);
        if (!res.headersSent) {
          res.status(500).json({
            jsonrpc: '2.0',
            error: { code: -32603, message: 'Internal server error' },
            id: null,
          });
        }
      }
    });

    // ================================================================
    // LEGACY SSE TRANSPORT — /sse + /messages (kept for compatibility)
    // ================================================================
    app.get('/sse', async (req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      const transport = new SSEServerTransport('/messages', res);
      transports[transport.sessionId] = transport;
      res.on('close', () => { delete transports[transport.sessionId]; });
      const server = createServer();
      await server.connect(transport);
    });

    app.post('/messages', async (req, res) => {
      const sessionId = req.query.sessionId;
      const existing = transports[sessionId];
      if (existing && existing instanceof SSEServerTransport) {
        await existing.handlePostMessage(req, res, req.body);
      } else {
        res.status(400).json({ error: 'Invalid or expired session. Reconnect to /sse first.' });
      }
    });

    // ── Start listening ──
    app.listen(PORT, () => {
      console.log(`✅ iJustOrder MCP Server running on http://0.0.0.0:${PORT}`);
      console.log(`   Streamable HTTP: http://0.0.0.0:${PORT}/mcp  (recommended)`);
      console.log(`   Legacy SSE:      http://0.0.0.0:${PORT}/sse`);
      console.log(`   Tools schema:    http://0.0.0.0:${PORT}/tools`);
      console.log(`   Health:          http://0.0.0.0:${PORT}/health`);
      console.log(`   Tools registered: ${TOOL_COUNT}`);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      for (const sid in transports) {
        try { await transports[sid].close(); } catch {}
        delete transports[sid];
      }
      process.exit(0);
    });

  } else {
    // stdio transport for local MCP clients
    const server = createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`✅ iJustOrder MCP Server running on stdio (${TOOL_COUNT} tools)`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
