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

## Available Tools (37)

### Venues (5)
| Tool | Description |
|------|-------------|
| `list_venues` | List all venues |
| `get_venue` | Get venue by ID |
| `create_venue` | Create a venue |
| `update_venue` | Update a venue |
| `delete_venue` | Delete a venue |

### Events (5)
| Tool | Description |
|------|-------------|
| `list_events` | List events (filterable by venue) |
| `get_event` | Get event by ID |
| `create_event` | Create an event |
| `update_event` | Update an event |
| `delete_event` | Delete an event |

### Sections (4)
| Tool | Description |
|------|-------------|
| `list_sections` | List sections by venue |
| `create_section` | Create a section |
| `update_section` | Update a section |
| `delete_section` | Delete a section |

### Menu (7)
| Tool | Description |
|------|-------------|
| `list_menu_categories` | List menu categories |
| `create_menu_category` | Create a category |
| `list_menu_items` | List menu items (filterable) |
| `get_menu_item` | Get item by ID |
| `create_menu_item` | Create a menu item |
| `update_menu_item` | Update a menu item |
| `delete_menu_item` | Delete a menu item |

### Tickets & Promotions (3)
| Tool | Description |
|------|-------------|
| `list_ticket_types` | List ticket types |
| `list_promotions` | List promotions |
| `create_promotion` | Create a promotion |

### Cart (3)
| Tool | Description |
|------|-------------|
| `get_cart` | Get current cart contents |
| `set_cart` | Create/replace cart with items |
| `clear_cart` | Clear the cart |

### Orders (5)
| Tool | Description |
|------|-------------|
| `list_orders` | List orders (filter by event/status) |
| `get_order` | Get order by ID with items |
| `create_order` | Place an order |
| `update_order` | Update order status (confirm, prepare, deliver) |
| `cancel_order` | Cancel an order |

### Payments (2)
| Tool | Description |
|------|-------------|
| `list_payments` | List payments (filter by order) |
| `get_payment` | Get payment by ID |

### Utility (3)
| Tool | Description |
|------|-------------|
| `get_platform_summary` | Platform-wide overview |
| `get_venue_detail` | Full venue detail with events |
| `search_menu_items` | Search menu items by name |

## REST Endpoints

In addition to the MCP SSE transport, the server exposes REST endpoints:

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Server health & tool count |
| `/tools` | GET | Full JSON tool schema (no SSE required) |
| `/sse` | GET | MCP SSE transport endpoint |
| `/messages` | POST | MCP message handler |

## Architecture

```
src/
├── index.js          # Server entry (stdio + HTTP/SSE + REST)
├── api.js            # API client with retry & pagination
└── tools/
    ├── venues.js     # Venue CRUD (5 tools)
    ├── events.js     # Event CRUD (5 tools)
    ├── sections.js   # Section CRUD (4 tools)
    ├── menu.js       # Menu categories & items (7 tools)
    ├── tickets.js    # Tickets & promotions (3 tools)
    ├── orders.js     # Cart, orders, payments (10 tools)
    └── utility.js    # Summaries & search (3 tools)
```

## License

MIT — iJustOrder, Inc.

