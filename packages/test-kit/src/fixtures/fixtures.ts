export const testUser = {
  id: 'usr_01hqfixture',
  email: 'patient@example.com',
  name: 'Alex Rivera',
  role: 'patient' as const,
  dateOfBirth: '1990-04-12',
  phone: '+1-555-0100',
  address: {
    line1: '100 Health Way',
    city: 'Austin',
    region: 'TX',
    postalCode: '78701',
    country: 'US',
  },
  hipaaAuthorizationVersion: '2025-01',
};

export const testProduct = {
  id: 'prd_01hqfixture',
  sku: 'GLU-STRIP-100',
  name: 'Glucose test strips (100 ct)',
  category: 'diabetes-care',
  priceCents: 2499,
  currency: 'USD',
  requiresPrescription: false,
  sellerId: 'sel_01hqfixture',
  fdaListingNumber: 'K123456',
  lotTrackingEnabled: true,
};

export const testOrder = {
  id: 'ord_01hqfixture',
  userId: testUser.id,
  status: 'paid' as const,
  placedAt: new Date('2025-04-01T15:30:00.000Z'),
  lineItems: [
    {
      productId: testProduct.id,
      quantity: 2,
      unitPriceCents: testProduct.priceCents,
    },
  ],
  shippingAddress: testUser.address,
  phiAccessLogged: true,
};
