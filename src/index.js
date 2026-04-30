#!/usr/bin/env node
/**
 * iJustOrder MCP Server
 *
 * Exposes the iJustOrder in-venue ordering platform API as MCP tools
 * for LLMs and AI agents to manage venues, events, menus, sections,
 * tickets, promotions, orders, carts, and payments.
 *
 * Supports two transports:
 *   - stdio  (default, for local MCP clients like Claude Desktop)
 *   - http   (set TRANSPORT=http, for remote hosting on Hostinger)
 *
 * Additional REST endpoints:
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

const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');
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
        // Clean up the converted schema
        delete inputSchema[key]['$schema'];
        delete inputSchema[key]['$ref'];
      } catch {
        inputSchema[key] = { type: 'string', description: key };
      }
    }
  }
  toolRegistry.push({ name, description, inputSchema });
}

// ── Create the MCP server ──────────────────────────────────────────
const server = new McpServer({
  name: 'ijustorder',
  version: '1.0.0',
  description: 'iJustOrder — In-venue food, beverage, and merchandise ordering platform. Manage venues, events, menus, sections, orders, carts, payments, tickets, and promotions across 14+ stadiums and arenas.',
});

// Monkey-patch server.tool to also collect schemas
const originalTool = server.tool.bind(server);
server.tool = function(name, description, schema, handler) {
  if (typeof schema === 'function') {
    // No-schema signature: tool(name, description, handler)
    collectTool(name, description, {});
    return originalTool(name, description, schema);
  }
  collectTool(name, description, schema);
  return originalTool(name, description, schema, handler);
};

// ── Register all tools ─────────────────────────────────────────────
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

const TOOL_COUNT = toolRegistry.length;

// ── Start the server ───────────────────────────────────────────────
const TRANSPORT = (process.env.TRANSPORT || 'stdio').toLowerCase();
const PORT = parseInt(process.env.PORT || '3001', 10);

async function main() {
  if (TRANSPORT === 'http' || TRANSPORT === 'sse') {
    const app = express();
    app.use(cors());

    // ── Health check ──
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', server: 'ijustorder-mcp', version: '1.0.0', tools: TOOL_COUNT });
    });

    // ── Tool schema endpoint (REST, no SSE required) ──
    app.get('/tools', (req, res) => {
      res.json({
        server: 'ijustorder',
        version: '1.0.0',
        total_tools: TOOL_COUNT,
        tools: toolRegistry,
      });
    });

    // ── SSE endpoint for MCP clients ──
    const transports = {};
    app.get('/sse', async (req, res) => {
      // Keep-alive headers for CDN/proxy compatibility
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Nginx
      
      const transport = new SSEServerTransport('/messages', res);
      transports[transport.sessionId] = transport;
      res.on('close', () => { delete transports[transport.sessionId]; });
      await server.connect(transport);
    });

    app.post('/messages', express.json(), async (req, res) => {
      const sessionId = req.query.sessionId;
      const transport = transports[sessionId];
      if (transport) {
        await transport.handlePostMessage(req, res);
      } else {
        res.status(400).json({ error: 'Invalid session. The SSE session may have expired. Reconnect to /sse first.' });
      }
    });

    app.listen(PORT, () => {
      console.log(`✅ iJustOrder MCP Server running on http://0.0.0.0:${PORT}`);
      console.log(`   Transport: SSE/HTTP`);
      console.log(`   SSE endpoint: http://0.0.0.0:${PORT}/sse`);
      console.log(`   Tools: http://0.0.0.0:${PORT}/tools`);
      console.log(`   Health: http://0.0.0.0:${PORT}/health`);
      console.log(`   Tools registered: ${TOOL_COUNT}`);
    });
  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`✅ iJustOrder MCP Server running on stdio (${TOOL_COUNT} tools)`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
