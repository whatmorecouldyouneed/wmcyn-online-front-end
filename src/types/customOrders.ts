export const CUSTOM_ORDER_PRODUCT_TYPES = [
  { value: 'T_SHIRT', label: 'T-Shirt', sized: true },
  { value: 'HOODIE', label: 'Hoodie', sized: true },
  { value: 'HAT', label: 'Hat', sized: false },
  { value: 'BAG', label: 'Bag', sized: false },
  { value: 'BOTTOMS', label: 'Pants / Bottoms', sized: true },
  { value: 'ACCESSORY', label: 'Accessory', sized: false },
  { value: 'OTHER', label: 'Other', sized: false }
] as const;

export const CUSTOM_ORDER_SIZES = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', 'Custom'] as const;

export type CustomOrderProductType = typeof CUSTOM_ORDER_PRODUCT_TYPES[number]['value'];

export type CustomOrderReferenceImage = {
  name: string;
  contentType: string;
  data: string;
};

export type CustomOrderRequest = {
  idempotencyKey: string;
  customer: {
    name: string;
    email: string;
    phone?: string;
  };
  productTitle: string;
  description: string;
  productType: CustomOrderProductType;
  customProductType?: string;
  size?: string;
  quantity: number;
  budgetCents: number;
  budgetOption: string;
  additionalNotes?: string;
  referenceImages: CustomOrderReferenceImage[];
};

export type CustomOrderResponse = {
  requestNumber: string;
  status: 'REQUESTED';
  submittedAt: string;
  duplicate?: boolean;
};
