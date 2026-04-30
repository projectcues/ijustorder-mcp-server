/**
 * Venue tools for iJustOrder MCP Server.
 */
const { z } = require('zod');
const { apiCall, fetchAllPages } = require('../api');

function registerVenueTools(server) {

  server.tool('list_venues', 'List all venues on the iJustOrder platform. Returns venue name, address, capacity, and configuration.', {}, async () => {
    const result = await fetchAllPages('api-venues');
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('get_venue', 'Get a single venue by its ID, including full details.',
    { venue_id: z.string().describe('The venue UUID') },
    async ({ venue_id }) => {
      const result = await apiCall('GET', `api-venues/${venue_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    });

  server.tool('create_venue', 'Create a new venue on the platform.',
    {
      name: z.string().describe('Venue name'),
      address: z.string().describe('Street address'),
      city: z.string().describe('City'),
      state: z.string().describe('State abbreviation (e.g. OH, TX)'),
      zip: z.string().describe('ZIP code'),
      capacity: z.number().optional().describe('Seating capacity'),
      type: z.string().optional().describe('Venue type (stadium, arena, restaurant)'),
    },
    async (args) => {
      const result = await apiCall('POST', 'api-venues', args);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    });

  server.tool('update_venue', 'Update an existing venue. Only include fields you want to change.',
    {
      venue_id: z.string().describe('The venue UUID to update'),
      name: z.string().optional().describe('New venue name'),
      address: z.string().optional().describe('New address'),
      city: z.string().optional().describe('New city'),
      state: z.string().optional().describe('New state'),
      zip: z.string().optional().describe('New ZIP'),
      capacity: z.number().optional().describe('New capacity'),
      type: z.string().optional().describe('New venue type'),
    },
    async ({ venue_id, ...updates }) => {
      const result = await apiCall('PATCH', `api-venues/${venue_id}`, updates);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    });

  server.tool('delete_venue', 'Delete a venue by ID. This is destructive and cannot be undone.',
    { venue_id: z.string().describe('The venue UUID to delete') },
    async ({ venue_id }) => {
      const result = await apiCall('DELETE', `api-venues/${venue_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    });
}

module.exports = { registerVenueTools };
