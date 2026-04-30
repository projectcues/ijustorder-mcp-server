/**
 * Section tools for iJustOrder MCP Server.
 */
const { z } = require('zod');
const { apiCall } = require('../api');

function registerSectionTools(server) {

  server.tool('list_sections', 'List seating sections for a venue.',
    { venue_id: z.string().describe('Filter by venue UUID') },
    async ({ venue_id }) => {
      const result = await apiCall('GET', `api-sections?venue_id=${venue_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    });

  server.tool('create_section', 'Create a new seating section.',
    {
      venue_id: z.string().describe('The venue UUID'),
      name: z.string().describe('Section name'),
      code: z.string().describe('Short section code'),
      pickup_location: z.string().describe('Pickup location description'),
    },
    async (args) => {
      const result = await apiCall('POST', 'api-sections', args);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    });

  server.tool('update_section', 'Update an existing section.',
    {
      section_id: z.string().describe('The section UUID'),
      name: z.string().optional().describe('New name'),
      code: z.string().optional().describe('New code'),
      pickup_location: z.string().optional().describe('New pickup location'),
    },
    async ({ section_id, ...updates }) => {
      const result = await apiCall('PATCH', `api-sections/${section_id}`, updates);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    });

  server.tool('delete_section', 'Delete a section by ID.',
    { section_id: z.string().describe('The section UUID to delete') },
    async ({ section_id }) => {
      const result = await apiCall('DELETE', `api-sections/${section_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    });
}

module.exports = { registerSectionTools };
