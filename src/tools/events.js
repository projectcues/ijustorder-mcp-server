/**
 * Event tools for iJustOrder MCP Server.
 */
const { z } = require('zod');
const { apiCall } = require('../api');

function registerEventTools(server) {

  server.tool('list_events', 'List events. Optionally filter by venue_id.',
    {
      venue_id: z.string().optional().describe('Filter events by venue UUID'),
      page: z.number().optional().describe('Page number (default 1)'),
      limit: z.number().optional().describe('Items per page (default 100)'),
    },
    async ({ venue_id, page, limit }) => {
      const params = {};
      if (venue_id) params.venue_id = venue_id;
      if (page) params.page = String(page);
      if (limit) params.limit = String(limit);
      const qs = new URLSearchParams(params);
      const result = await apiCall('GET', `api-events?${qs}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    });

  server.tool('get_event', 'Get a single event by its ID.',
    { event_id: z.string().describe('The event UUID') },
    async ({ event_id }) => {
      const result = await apiCall('GET', `api-events/${event_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    });

  server.tool('create_event', 'Create a new event at a venue.',
    {
      venue_id: z.string().describe('The venue UUID'),
      name: z.string().describe('Event name'),
      date: z.string().describe('Event date (YYYY-MM-DD)'),
      time: z.string().optional().describe('Event time (e.g. "19:00")'),
      description: z.string().optional().describe('Event description'),
      image_url: z.string().optional().describe('Event image URL'),
      status: z.string().optional().describe('Event status'),
    },
    async (args) => {
      const result = await apiCall('POST', 'api-events', args);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    });

  server.tool('update_event', 'Update an existing event.',
    {
      event_id: z.string().describe('The event UUID to update'),
      name: z.string().optional().describe('New event name'),
      date: z.string().optional().describe('New date (ISO)'),
      time: z.string().optional().describe('New time'),
      description: z.string().optional().describe('New description'),
      image_url: z.string().optional().describe('New image URL'),
      status: z.string().optional().describe('New status'),
    },
    async ({ event_id, ...updates }) => {
      const result = await apiCall('PATCH', `api-events/${event_id}`, updates);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    });

  server.tool('delete_event', 'Delete an event by ID. Destructive.',
    { event_id: z.string().describe('The event UUID to delete') },
    async ({ event_id }) => {
      const result = await apiCall('DELETE', `api-events/${event_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    });
}

module.exports = { registerEventTools };
