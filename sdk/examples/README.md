# SDK Examples

This directory contains comprehensive examples demonstrating how to use the Almona Industrial API SDKs.

## Examples

### TypeScript Examples
- **typescript-example.ts**: Complete example showing all major SDK features
  - Authentication
  - Creating different types of tickets
  - Quote management
  - Error handling
  - System monitoring

### Python Examples
- **python-example.py**: Complete example showing both sync and async usage
  - Synchronous client operations
  - Asynchronous client operations
  - Concurrent operations
  - Error handling
  - Pydantic models usage

## Running the Examples

### TypeScript Example

```bash
# Install dependencies
cd typescript
npm install

# Compile and run
npx ts-node examples/typescript-example.ts
```

### Python Example

```bash
# Install the SDK
pip install almona-industrial-api

# Run the example
python examples/python-example.py
```

## Example Features Demonstrated

### Authentication
- Email/password authentication
- Token management
- User information retrieval

### Service Tickets
- Support tickets
- Preventive maintenance tickets
- Scheduled maintenance tickets
- Emergency service tickets
- Product quote tickets
- Add-to-quote tickets

### Quote Management
- Quote creation with products and services
- Quote lookup and search
- Digital twin integration

### Advanced Features
- Error handling and exception management
- Concurrent operations (async examples)
- Pydantic model usage (Python)
- Type safety (TypeScript)
- System health and metrics

## Customization

You can customize the examples by:

1. **Changing the API endpoint**: Update the `baseURL` or `base_url` parameter
2. **Using your credentials**: Replace the example email/password with your actual credentials
3. **Modifying ticket data**: Update the ticket creation examples with your specific data
4. **Adding error handling**: Extend the error handling examples for your use case

## Environment Variables

For production use, consider using environment variables:

### TypeScript
```typescript
const client = createAlmonaAPIClient({
  baseURL: process.env.ALMONA_API_URL || 'https://api.almona.com'
});

await client.authenticate(
  process.env.ALMONA_EMAIL || 'user@example.com',
  process.env.ALMONA_PASSWORD || 'password'
);
```

### Python
```python
import os

client = AlmonaAPIClient({
    "base_url": os.getenv("ALMONA_API_URL", "https://api.almona.com")
})

client.authenticate(
    os.getenv("ALMONA_EMAIL", "user@example.com"),
    os.getenv("ALMONA_PASSWORD", "password")
)
```

## Error Handling

Both examples demonstrate comprehensive error handling:

- **Authentication errors**: Invalid credentials, expired tokens
- **Validation errors**: Invalid request data
- **API errors**: Server errors, rate limiting
- **Network errors**: Connection issues, timeouts

## Best Practices

The examples follow these best practices:

1. **Use context managers**: Python examples use `async with` for proper resource cleanup
2. **Handle errors gracefully**: Comprehensive error handling with specific exception types
3. **Use type safety**: TypeScript examples use proper typing, Python examples use Pydantic models
4. **Enable debug logging**: Examples show how to enable debug mode for development
5. **Concurrent operations**: Async examples demonstrate efficient concurrent API calls

## Troubleshooting

### Common Issues

1. **Authentication failures**: Check your credentials and API endpoint
2. **Network errors**: Verify your internet connection and API availability
3. **Validation errors**: Check that your request data matches the expected format
4. **Rate limiting**: Implement proper retry logic for rate-limited requests

### Debug Mode

Enable debug mode to see detailed request/response information:

```typescript
const client = createAlmonaAPIClient({
  baseURL: 'https://api.almona.com',
  debug: true
});
```

```python
client = AlmonaAPIClient({
    "base_url": "https://api.almona.com",
    "debug": True
})
```

## Support

If you encounter issues with the examples:

1. Check the SDK documentation
2. Review the error messages in debug mode
3. Contact support at api-support@almona.com
4. Open an issue on the GitHub repository
