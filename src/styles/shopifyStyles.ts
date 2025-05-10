import { ShopifyBuyButtonOptions } from '@/hooks/useShopifyBuyButton'; // Adjust path as needed

export const defaultShopifyButtonStyles: ShopifyBuyButtonOptions = {
  product: {
    styles: {
      product: {
        '@media (min-width: 601px)': {
          'max-width': '100%',
          'margin-left': '0',
          'margin-bottom': '50px',
        },
        'text-align': 'center',
      },
      title: { 'font-size': '26px' },
      button: {
        'font-family': 'Montserrat, sans-serif',
        'font-weight': 'bold',
        'font-size': '14px',
        'padding-top': '15px',
        'padding-bottom': '15px',
        ':hover': { 'background-color': '#000000' },
        'background-color': '#000000',
        ':focus': { 'background-color': '#000000' },
        'border-radius': '4px',
        'padding-left': '30px',
        'padding-right': '30px',
      },
      quantityInput: { 'font-size': '14px', 'padding-top': '15px', 'padding-bottom': '15px' },
      price: { 'font-size': '18px' },
      compareAt: { 'font-size': '15.3px' },
      unitPrice: { 'font-size': '15.3px' },
    },
    buttonDestination: 'checkout',
    layout: 'horizontal',
    contents: { img: false, imgWithCarousel: true, description: true },
    width: '100%',
    text: { button: 'Buy now' },
    googleFonts: ['Montserrat'],
  },
  cart: {
    styles: {
      button: {
        'font-family': 'Montserrat, sans-serif',
        'font-weight': 'bold',
        'font-size': '14px',
        'padding-top': '15px',
        'padding-bottom': '15px',
        ':hover': { 'background-color': '#000000' },
        'background-color': '#000000',
        ':focus': { 'background-color': '#000000' },
        'border-radius': '4px',
      },
    },
    text: { total: 'Subtotal', button: 'Checkout' },
    googleFonts: ['Montserrat'],
  },
}; 