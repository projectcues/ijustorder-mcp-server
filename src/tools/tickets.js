/**
 * Ticket and Promotion tools for iJustOrder MCP Server.
 */
const { z } = require('zod');
const { apiCall } = require('../api');

function registerTicketTools(server) {
  server.tool('list_ticket_types', 'List ticket types available on the platform.', {}, async () => {
    const result = await apiCall('GET', 'api-tickets/types');
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });
}

function registerPromotionTools(server) {
  server.tool('list_promotions', 'List all active promotions.', {}, async () => {
    const result = await apiCall('GET', 'api-promotions');
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.tool('create_promotion', 'Create a new promotion.',
    {
      name: z.string().describe('Promotion name'),
      code: z.string().describe('Promo code'),
      discount_type: z.string().describe('Type: percentage or fixed'),
      discount_value: z.number().describe('Discount amount'),
      event_id: z.string().optional().describe('Event UUID to apply to'),
      start_date: z.string().optional().describe('Start date (ISO)'),
      end_date: z.string().optional().describe('End date (ISO)'),
    },
    async (args) => {
      const result = await apiCall('POST', 'api-promotions', args);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    });
}

module.exports = { registerTicketTools, registerPromotionTools };
