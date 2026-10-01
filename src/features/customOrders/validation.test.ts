import { describe, expect, it } from 'vitest';
import {
  EMPTY_CUSTOM_ORDER,
  budgetCents,
  productTypeUsesSize,
  toCustomOrderRequest,
  validateCustomOrder
} from './validation';

const validValues = {
  ...EMPTY_CUSTOM_ORDER,
  name: 'Crash',
  email: 'crash@example.com',
  productTitle: 'Crash World Hoodie',
  description: 'Black heavyweight hoodie with a larger mark across the back.',
  productType: 'HOODIE' as const,
  size: 'L',
  quantity: '1',
  budgetOption: '100'
};

describe('custom order validation', () => {
  it('accepts a complete request and maps it to the API contract', () => {
    expect(validateCustomOrder(validValues)).toEqual({});
    const request = toCustomOrderRequest(validValues, [], 'request_key_123456789');
    expect(request.customer.email).toBe('crash@example.com');
    expect(request.budgetCents).toBe(10000);
    expect(request.quantity).toBe(1);
  });

  it('requires core fields and an applicable size', () => {
    const errors = validateCustomOrder({
      ...EMPTY_CUSTOM_ORDER,
      productType: 'HOODIE'
    });
    expect(errors.name).toBeTruthy();
    expect(errors.email).toBeTruthy();
    expect(errors.productTitle).toBeTruthy();
    expect(errors.description).toBeTruthy();
    expect(errors.size).toBeTruthy();
  });

  it('validates custom budgets and quantity boundaries', () => {
    expect(budgetCents({ ...validValues, budgetOption: 'custom', customBudget: '87.50' })).toBe(8750);
    expect(validateCustomOrder({ ...validValues, quantity: '0' }).quantity).toBeTruthy();
    expect(validateCustomOrder({
      ...validValues,
      budgetOption: 'custom',
      customBudget: '0'
    }).customBudget).toBeTruthy();
  });

  it('keeps size rules scoped to applicable product types', () => {
    expect(productTypeUsesSize('T_SHIRT')).toBe(true);
    expect(productTypeUsesSize('BAG')).toBe(false);
  });
});
