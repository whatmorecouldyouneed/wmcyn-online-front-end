# Admin Interface Setup

This document explains how to set up and use the Product Sets & Claims admin interface.

## Environment Configuration

Create a `.env.local` file in your project root with the following variables:

```bash
# Admin authentication credentials
NEXT_PUBLIC_ADMIN_USERNAME=wmcyn_admin
NEXT_PUBLIC_ADMIN_PASSWORD=your_secure_password_here

# Admin API token for backend authentication (optional)
NEXT_PUBLIC_ADMIN_API_TOKEN=your_admin_api_token_here

# Backend API base URL - Your deployed Firebase Functions
NEXT_PUBLIC_API_BASE=https://api-rrm3u3yaba-uc.a.run.app
```

## Security Notes

- **Never commit `.env.local` to version control**
- Use strong, unique passwords for production
- Consider using environment-specific credentials
- The admin interface uses session storage for authentication (expires in 24 hours)

## Accessing the Admin Interface

1. Navigate to `/admin/login` in your browser
2. Enter the username and password from your environment variables
3. You'll be redirected to `/admin` upon successful login

## Features

### Product Set Management
- **Create** new product sets with items, quantities, and checkout configuration
- **Edit** existing product sets
- **Delete** product sets (with confirmation)
- **View** detailed information and statistics

### QR Code Generation
- Generate QR codes for any product set
- Configure redeem policies:
  - **Geofence**: Restrict claims to specific locations
  - **Time Window**: Set claim periods
  - **Per-user Limits**: Control how many times a user can claim
  - **Max Claims**: Set total claim limits
  - **Expiration**: Set QR code expiration dates

### Dashboard
- View all product sets with statistics
- Search and filter product sets
- Real-time claim and inventory tracking
- Summary statistics

## API Endpoints

The admin interface uses the following deployed backend endpoints:

### Product Sets
- `GET /v1/productSets` - List all product sets
- `GET /v1/productSets/:id` - Get specific product set
- `POST /v1/productSets/create` - Create new product set
- `PUT /v1/productSets/:id` - Update product set
- `DELETE /v1/productSets/:id` - Delete product set

### QR Codes
- `GET /v1/qrcodes` - List QR codes (optionally filtered by productSetId)
- `GET /v1/qrcodes/:id` - Get specific QR code
- `POST /v1/qrcodes/generate` - Generate new QR code
- `DELETE /v1/qrcodes/:id` - Delete QR code

## Authentication

The admin interface uses Firebase authentication for API calls:

1. Username/password are stored in environment variables for admin login
2. Successful login creates a session stored in `sessionStorage`
3. Sessions expire after 24 hours
4. All admin API calls use Firebase Bearer tokens (same as regular user API calls)
5. API calls go directly to the deployed Firebase Cloud Functions (no proxy needed)

## Troubleshooting

### Login Issues
- Verify environment variables are set correctly
- Check browser console for errors
- Ensure the admin interface is accessible at `/admin/login`

### API Issues
- Verify `NEXT_PUBLIC_API_BASE` is set correctly
- Check that backend endpoints are implemented
- Review browser network tab for failed requests

### Styling Issues
- Ensure `Admin.module.scss` is properly imported
- Check that base styles from `Index.module.scss` are available
- Verify responsive breakpoints work on your device

## Development

To extend the admin interface:

1. **Add new types** in `src/types/productSets.ts`
2. **Extend API client** in `src/lib/apiClient.ts`
3. **Create components** in `src/components/admin/`
4. **Add pages** in `pages/admin/`
5. **Update styles** in `src/styles/Admin.module.scss`

## Production Deployment

Before deploying to production:

1. Set secure environment variables
2. Ensure backend API endpoints are implemented
3. Test all functionality thoroughly
4. Consider adding additional security measures (rate limiting, IP restrictions, etc.)
5. Set up monitoring and logging for admin actions
 