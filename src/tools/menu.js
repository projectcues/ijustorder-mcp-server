/**
 * Menu tools for iJustOrder MCP Server.
 */
const { z } = require('zod');
const { apiCall } = require('../api');

function registerMenuTools(server) {

  server.tool('list_menu_categories', 'List menu categories for an event.',
    { event_id: z.string().optional().describe('Filter by event UUID') },
    async ({ event_id }) => {
      const qs = event_id ? `?event_id=${event_id}` : '';
      const result = await apiCall('GET', `api-menu/categories${qs}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    });

  server.tool('create_menu_category', 'Create a menu category for an event.',
    {
      event_id: z.string().describe('The event UUID'),
      name: z.string().describe('Category name'),
      sort_order: z.number().optional().describe('Display order'),
    },
    async (args) => {
      const result = await apiCall('POST', 'api-menu/categories', args);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    });

  server.tool('list_menu_items', 'List menu items. Filter by event_id or get all.',
    {
      event_id: z.string().optional().describe('Filter by event UUID'),
      category: z.string().optional().describe('Filter by category name'),
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Items per page'),
    },
    async ({ event_id, category, page, limit }) => {
      const params = {};
      if (event_id) params.event_id = event_id;
      if (category) params.category = category;
      if (page) params.page = String(page);
      if (limit) params.limit = String(limit);
      const qs = new URLSearchParams(params);
      const result = await apiCall('GET', `api-menu/items?${qs}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    });

  server.tool('get_menu_item', 'Get a single menu item by ID.',
    { item_id: z.string().describe('The menu item UUID') },
    async ({ item_id }) => {
      const result = await apiCall('GET', `api-menu/items/${item_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    });

  server.tool('create_menu_item', 'Create a new menu item for an event.',
    {
      event_id: z.string().describe('The event UUID'),
      name: z.string().describe('Item name'),
      price: z.number().describe('Price in dollars'),
      category: z.string().describe('Category name'),
      description: z.string().optional().describe('Item description'),
      image_url: z.string().optional().describe('Image URL'),
    },
    async (args) => {
      const result = await apiCall('POST', 'api-menu/items', args);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    });

  server.tool('update_menu_item', 'Update an existing menu item.',
    {
      item_id: z.string().describe('The menu item UUID'),
      name: z.string().optional().describe('New name'),
      price: z.number().optional().describe('New price'),
      category: z.string().optional().describe('New category'),
      description: z.string().optional().describe('New description'),
      image_url: z.string().optional().describe('New image URL'),
    },
    async ({ item_id, ...updates }) => {
      const result = await apiCall('PATCH', `api-menu/items/${item_id}`, updates);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    });

  server.tool('delete_menu_item', 'Delete a menu item by ID.',
    { item_id: z.string().describe('The menu item UUID to delete') },
    async ({ item_id }) => {
      const result = await apiCall('DELETE', `api-menu/items/${item_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    });
}

module.exports = { registerMenuTools };
