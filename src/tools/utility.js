/**
 * Utility / aggregate tools for iJustOrder MCP Server.
 */
const { z } = require('zod');
const { apiCall, fetchAllPages } = require('../api');

function registerUtilityTools(server) {

  server.tool('get_platform_summary', 'Get a high-level summary of the entire iJustOrder platform: total venues, events, menu items, and sections.', {}, async () => {
    const [venues, events, items, sections] = await Promise.all([
      fetchAllPages('api-venues'),
      fetchAllPages('api-events'),
      apiCall('GET', 'api-menu/items?limit=1'),
      apiCall('GET', 'api-sections'),
    ]);
    const summary = {
      total_venues: venues.data ? venues.data.length : 0,
      total_events: events.data ? events.data.length : 0,
      total_menu_items: items.meta ? items.meta.total : 0,
      total_sections: sections.data ? sections.data.length : 0,
      venues: (venues.data || []).map(v => ({ id: v.id, name: v.name, city: v.city, state: v.state, capacity: v.capacity })),
    };
    return { content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }] };
  });

  server.tool('get_venue_detail', 'Get comprehensive detail for a venue: info, events, sections, and menu item counts.',
    { venue_id: z.string().describe('The venue UUID') },
    async ({ venue_id }) => {
      const [venue, events, sections] = await Promise.all([
        apiCall('GET', `api-venues/${venue_id}`),
        apiCall('GET', `api-events?venue_id=${venue_id}&limit=100`),
        apiCall('GET', `api-sections?venue_id=${venue_id}`),
      ]);
      const eventSummaries = [];
      if (events.data) {
        for (const evt of events.data) {
          const items = await apiCall('GET', `api-menu/items?event_id=${evt.id}&limit=1`);
          eventSummaries.push({ id: evt.id, name: evt.name, date: evt.date, time: evt.time, menu_items: items.meta ? items.meta.total : 0 });
        }
      }
      return { content: [{ type: 'text', text: JSON.stringify({ venue: venue.data || venue, sections: sections.data || [], events: eventSummaries }, null, 2) }] };
    });

  server.tool('search_menu_items', 'Search menu items by name across all events.',
    {
      query: z.string().describe('Search term (e.g. "nachos", "Cavs", "IPA")'),
      limit: z.number().optional().describe('Max results (default 25)'),
    },
    async ({ query, limit }) => {
      const maxResults = limit || 25;
      const allItems = await fetchAllPages('api-menu/items');
      if (!allItems.data) return { content: [{ type: 'text', text: 'No items found.' }] };
      const q = query.toLowerCase();
      const matches = allItems.data
        .filter(item => {
          const n = (item.name || '').toLowerCase();
          const d = (item.description || '').toLowerCase();
          const c = (item.category || '').toLowerCase();
          return n.includes(q) || d.includes(q) || c.includes(q);
        })
        .slice(0, maxResults)
        .map(item => ({ id: item.id, name: item.name, price: item.price, category: item.category, event_id: item.event_id }));
      return { content: [{ type: 'text', text: JSON.stringify({ query, matches_found: matches.length, results: matches }, null, 2) }] };
    });
}

module.exports = { registerUtilityTools };
