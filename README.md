# iJustOrder MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server that exposes the iJustOrder in-venue ordering platform API to LLMs and AI agents.

## What Is This?

This server allows any MCP-compatible AI client (Claude Desktop, Cursor, Gemini, custom agents) to programmatically manage iJustOrder's operational data:

- **Venues** — Create, read, update, delete stadiums and arenas
- **Events** — Manage games, concerts, and events at each venue
- **Sections** — Configure seating sections with codes and pickup locations
- **Menu Items** — Full menu management (food, beverages, merchandise)
- **Tickets** — View ticket types
- **Promotions** — Create and manage promo codes
- **Utility** — Platform-wide summaries and menu search

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your API keys
```

### 3. Run Locally (stdio)

```bash
npm start
```

### 4. Run as Remote Server (HTTP/SSE)

```bash
TRANSPORT=http PORT=3001 npm start
```

## MCP Client Configuration

### Claude Desktop / Cursor (Local stdio)

Add to your MCP config (`~/.gemini/antigravity/mcp_config.json` or Claude Desktop settings):

```json
{
  "mcpServers": {
    "ijustorder": {
      "command": "node",
      "args": ["/path/to/ijustorder-mcp-server/src/index.js"],
      "env": {
        "SUPABASE_ANON_KEY": "your_key",
        "IJUSTORDER_API_KEY": "your_key"
      }
    }
  }
}
```

### Remote (SSE/HTTP — Live at mcp.ijustorder.com)

```json
{
  "mcpServers": {
    "ijustorder": {
      "url": "https://mcp.ijustorder.com/sse"
    }
  }
}
```

## Available Tools (20)

| Tool | Description |
|------|-------------|
| `list_venues` | List all venues |
| `get_venue` | Get venue by ID |
| `create_venue` | Create a venue |
| `update_venue` | Update a venue |
| `delete_venue` | Delete a venue |
| `list_events` | List events (filterable) |
| `get_event` | Get event by ID |
| `create_event` | Create an event |
| `update_event` | Update an event |
| `delete_event` | Delete an event |
| `list_sections` | List sections by venue |
| `create_section` | Create a section |
| `update_section` | Update a section |
| `delete_section` | Delete a section |
| `list_menu_items` | List menu items (filterable) |
| `get_menu_item` | Get item by ID |
| `create_menu_item` | Create a menu item |
| `update_menu_item` | Update a menu item |
| `delete_menu_item` | Delete a menu item |
| `list_menu_categories` | List categories |
| `create_menu_category` | Create a category |
| `list_ticket_types` | List ticket types |
| `list_promotions` | List promotions |
| `create_promotion` | Create a promotion |
| `get_platform_summary` | Platform overview |
| `get_venue_detail` | Full venue detail |
| `search_menu_items` | Search menu items |

## Architecture

```
src/
├── index.js          # Server entry (stdio + HTTP/SSE)
├── api.js            # API client with retry & pagination
└── tools/
    ├── venues.js     # Venue CRUD
    ├── events.js     # Event CRUD
    ├── sections.js   # Section CRUD
    ├── menu.js       # Menu categories & items
    ├── tickets.js    # Tickets & promotions
    └── utility.js    # Summaries & search
```

## License

MIT — iJustOrder, Inc.
