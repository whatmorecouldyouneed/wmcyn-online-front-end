import {
  CUSTOM_ORDER_PRODUCT_TYPES,
  CustomOrderProductType,
  CustomOrderRequest,
  CustomOrderReferenceImage
} from '@/types/customOrders';

export type CustomOrderFormValues = {
  name: string;
  email: string;
  phone: string;
  productTitle: string;
  description: string;
  productType: CustomOrderProductType | '';
  customProductType: string;
  size: string;
  quantity: string;
  budgetOption: string;
  customBudget: string;
  additionalNotes: string;
};

export type CustomOrderErrors = Partial<Record<keyof CustomOrderFormValues | 'referenceImages', string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EMPTY_CUSTOM_ORDER: CustomOrderFormValues = {
  name: '',
  email: '',
  phone: '',
  productTitle: '',
  description: '',
  productType: '',
  customProductType: '',
  size: '',
  quantity: '1',
  budgetOption: '',
  customBudget: '',
  additionalNotes: ''
};

export function productTypeUsesSize(productType: string): boolean {
  return CUSTOM_ORDER_PRODUCT_TYPES.some((option) => option.value === productType && option.sized);
}

export function validateCustomOrder(values: CustomOrderFormValues, images: File[] = []): CustomOrderErrors {
  const errors: CustomOrderErrors = {};
  if (values.name.trim().length < 2) errors.name = 'tell us your name';
  if (!EMAIL_PATTERN.test(values.email.trim())) errors.email = 'enter a valid email';
  if (values.productTitle.trim().length < 2) errors.productTitle = 'name what you are imagining';
  if (values.description.trim().length < 10) errors.description = 'tell us a little more about the idea';
  if (!values.productType) errors.productType = 'choose a product type';
  if (values.productType === 'OTHER' && !values.customProductType.trim()) {
    errors.customProductType = 'tell us the product type';
  }
  if (productTypeUsesSize(values.productType) && !values.size) errors.size = 'choose a size';

  const quantity = Number(values.quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
    errors.quantity = 'quantity must be between 1 and 100';
  }

  const budget = values.budgetOption === 'custom'
    ? Number(values.customBudget)
    : values.budgetOption === '200_plus'
      ? 200
      : Number(values.budgetOption);
  if (!Number.isFinite(budget) || budget < 1 || budget > 100000) {
    errors.customBudget = 'give us a budget between $1 and $100,000';
  }

  if (images.length > 3) errors.referenceImages = 'choose no more than 3 images';
  if (images.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) {
    errors.referenceImages = 'images must be jpeg, png, or webp';
  }
  if (images.some((file) => file.size > 2 * 1024 * 1024)) {
    errors.referenceImages = 'each image must be 2MB or smaller';
  }
  return errors;
}

export function budgetCents(values: CustomOrderFormValues): number {
  const amount = values.budgetOption === 'custom'
    ? Number(values.customBudget)
    : values.budgetOption === '200_plus'
      ? 200
      : Number(values.budgetOption);
  return Math.round(amount * 100);
}

export function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replaceAll('-', '_');
  }
  return `custom_order_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function fileToReferenceImage(file: File): Promise<CustomOrderReferenceImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`could not read ${file.name}`));
    reader.onload = () => resolve({
      name: file.name,
      contentType: file.type,
      data: String(reader.result || '').split(',')[1] || ''
    });
    reader.readAsDataURL(file);
  });
}

export function toCustomOrderRequest(
  values: CustomOrderFormValues,
  referenceImages: CustomOrderReferenceImage[],
  idempotencyKey: string
): CustomOrderRequest {
  return {
    idempotencyKey,
    customer: {
      name: values.name.trim(),
      email: values.email.trim().toLowerCase(),
      phone: values.phone.trim() || undefined
    },
    productTitle: values.productTitle.trim(),
    description: values.description.trim(),
    productType: values.productType as CustomOrderProductType,
    customProductType: values.customProductType.trim() || undefined,
    size: values.size || undefined,
    quantity: Number(values.quantity),
    budgetCents: budgetCents(values),
    budgetOption: values.budgetOption,
    additionalNotes: values.additionalNotes.trim() || undefined,
    referenceImages
  };
}
