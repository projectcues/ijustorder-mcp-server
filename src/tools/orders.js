/**
 * Order, Cart, and Payment tools for iJustOrder MCP Server.
 *
 * Covers the full customer ordering lifecycle:
 *   Cart → Order → Payment → Status tracking
 */
const { z } = require('zod');
const { apiCall } = require('../api');

// ── Cart Tools ─────────────────────────────────────────────────────
function registerCartTools(server) {

  server.tool('get_cart', 'Get the current user cart contents including items, subtotal, fees, and total.', {},
    async () => {
      const result = await apiCall('GET', 'api-cart');
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    });

  server.tool('set_cart', 'Create or replace the cart. Sets the event, section, and items for an order.',
    {
      event_id: z.string().describe('The event UUID the order is for'),
      items: z.array(z.object({
        menu_item_id: z.string().describe('Menu item UUID'),
        quantity: z.number().describe('Quantity to order'),
      })).describe('Array of items to add to cart'),
      section_id: z.string().optional().describe('Section UUID for delivery'),
      seat_number: z.string().optional().describe('Seat number (e.g. "12A")'),
      fulfillment_type: z.string().optional().describe('delivery or pickup (default: delivery)'),
      promo_code: z.string().optional().describe('Promo code to apply'),
      notes: z.string().optional().describe('Special instructions'),
    },
    async (args) => {
      const result = await apiCall('PUT', 'api-cart', args);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    });

  server.tool('clear_cart', 'Clear all items from the cart.', {},
    async () => {
      const result = await apiCall('DELETE', 'api-cart');
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    });
}

// ── Order Tools ────────────────────────────────────────────────────
function registerOrderTools(server) {

  server.tool('list_orders', 'List all orders. Optionally filter by event_id or status.',
    {
      event_id: z.string().optional().describe('Filter by event UUID'),
      status: z.string().optional().describe('Filter by status: pending, confirmed, preparing, ready, delivered, cancelled'),
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Items per page'),
    },
    async ({ event_id, status, page, limit }) => {
      const params = {};
      if (event_id) params.event_id = event_id;
      if (status) params.status = status;
      if (page) params.page = String(page);
      if (limit) params.limit = String(limit);
      const qs = new URLSearchParams(params);
      const result = await apiCall('GET', `api-orders?${qs}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    });

  server.tool('get_order', 'Get a specific order by ID, including order items and status.',
    { order_id: z.string().describe('The order UUID') },
    async ({ order_id }) => {
      const result = await apiCall('GET', `api-orders/${order_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    });

  server.tool('create_order', 'Place a new order. Provide the event, section, seat, and items. Returns order with subtotal, fees, and total.',
    {
      event_id: z.string().describe('The event UUID'),
      section_id: z.string().describe('Section UUID for delivery location'),
      items: z.array(z.object({
        menu_item_id: z.string().describe('Menu item UUID'),
        quantity: z.number().describe('Quantity to order'),
      })).describe('Array of items to order'),
      seat_number: z.string().optional().describe('Seat number (e.g. "12A")'),
      fulfillment_type: z.string().optional().describe('delivery or pickup (default: delivery)'),
      notes: z.string().optional().describe('Special instructions (e.g. "no onions")'),
      guest_name: z.string().optional().describe('Guest name for the order'),
      guest_phone: z.string().optional().describe('Guest phone number'),
      promo_code: z.string().optional().describe('Promo code to apply'),
    },
    async (args) => {
      const result = await apiCall('POST', 'api-orders', args);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    });

  server.tool('update_order', 'Update an order status or details. Use this to confirm, prepare, deliver, or cancel orders.',
    {
      order_id: z.string().describe('The order UUID to update'),
      status: z.string().optional().describe('New status: pending, confirmed, preparing, ready, delivered, cancelled'),
      runner_id: z.string().optional().describe('Assign a runner to the order'),
      estimated_minutes: z.number().optional().describe('Estimated delivery time in minutes'),
      notes: z.string().optional().describe('Updated notes'),
    },
    async ({ order_id, ...updates }) => {
      const result = await apiCall('PATCH', `api-orders/${order_id}`, updates);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    });

  server.tool('cancel_order', 'Cancel an order by ID.',
    { order_id: z.string().describe('The order UUID to cancel') },
    async ({ order_id }) => {
      const result = await apiCall('PATCH', `api-orders/${order_id}`, { status: 'cancelled' });
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    });
}

// ── Payment Tools ──────────────────────────────────────────────────
function registerPaymentTools(server) {

  server.tool('list_payments', 'List all payments. Optionally filter by order_id.',
    {
      order_id: z.string().optional().describe('Filter by order UUID'),
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Items per page'),
    },
    async ({ order_id, page, limit }) => {
      const params = {};
      if (order_id) params.order_id = order_id;
      if (page) params.page = String(page);
      if (limit) params.limit = String(limit);
      const qs = new URLSearchParams(params);
      const result = await apiCall('GET', `api-payments?${qs}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    });

  server.tool('get_payment', 'Get a specific payment by ID.',
    { payment_id: z.string().describe('The payment UUID') },
    async ({ payment_id }) => {
      const result = await apiCall('GET', `api-payments/${payment_id}`);
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    });
}

module.exports = { registerCartTools, registerOrderTools, registerPaymentTools };
