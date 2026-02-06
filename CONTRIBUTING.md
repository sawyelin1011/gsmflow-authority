# Contributing to GSMFlow Authority

Thank you for your interest in contributing to GSMFlow Authority!

## Development Setup

### Prerequisites

- Node.js v18 or later
- npm v9 or later
- Git

### Getting Started

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd gsmflow-authority
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run tests:
   ```bash
   npm test
   ```

4. Start local development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
gsmflow-authority/
├── src/
│   ├── index.ts              # Main worker entry point
│   ├── router.ts             # HTTP routing logic
│   ├── config/
│   │   └── constants.ts      # Configuration constants
│   ├── services/
│   │   └── license-service.ts # License business logic
│   ├── types/
│   │   └── license.ts        # TypeScript type definitions
│   ├── middleware/
│   │   ├── auth.ts           # Authentication middleware
│   │   └── cors.ts           # CORS middleware
│   └── utils/
│       ├── response.ts       # Response helpers
│       └── validation.ts     # Validation utilities
├── test/
│   ├── index.spec.ts         # Integration tests
│   ├── router.spec.ts        # Router unit tests
│   └── validation.spec.ts    # Validation unit tests
├── docs/
│   ├── API.md                # API documentation
│   └── DEPLOYMENT.md         # Deployment guide
└── wrangler.jsonc            # Cloudflare Workers config
```

## Coding Standards

### TypeScript

- Use TypeScript strict mode (already configured)
- Prefer explicit types over `any`
- Use interfaces for object shapes
- Use type aliases for complex types

### Code Style

- Use tabs for indentation (configured in `.editorconfig`)
- Follow existing code patterns
- Use meaningful variable and function names
- Keep functions focused and small

### Naming Conventions

- **Files**: kebab-case (e.g., `license-service.ts`)
- **Classes**: PascalCase (e.g., `LicenseService`)
- **Functions**: camelCase (e.g., `validateLicense`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `API_VERSION`)
- **Interfaces/Types**: PascalCase (e.g., `License`, `LicenseStatus`)

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### Writing Tests

- Place tests in the `test/` directory
- Use descriptive test names
- Test both success and error cases
- Mock external dependencies

Example test:

```typescript
import { describe, it, expect } from 'vitest';

describe('Feature Name', () => {
  it('should handle valid input correctly', async () => {
    // Arrange
    const input = 'test-input';
    
    // Act
    const result = await myFunction(input);
    
    // Assert
    expect(result).toBe('expected-output');
  });

  it('should throw error for invalid input', async () => {
    // Arrange & Act & Assert
    expect(() => myFunction(null)).toThrow();
  });
});
```

## Git Workflow

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions or fixes

Examples:
- `feature/add-license-expiration`
- `fix/validation-error-handling`
- `docs/update-api-documentation`

### Commit Messages

Follow conventional commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:

```
feat(license): add license expiration checking

Add automatic expiration validation when validating licenses.
Expired licenses now return valid: false with reason.

Closes #123
```

```
fix(router): handle empty path parameters correctly

Previously, empty path parameters caused route matching to fail.
Now properly validates and handles empty segments.
```

### Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Write/update tests
4. Ensure all tests pass: `npm test`
5. Ensure TypeScript compiles: `npx tsc --noEmit`
6. Format code if needed
7. Commit your changes
8. Push to your fork
9. Create a Pull Request

### Pull Request Template

```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] All tests pass
- [ ] Added new tests
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
```

## Adding New Features

### Adding a New Endpoint

1. Define types in `src/types/`
2. Add business logic to appropriate service in `src/services/`
3. Register route in `src/index.ts`
4. Add tests in `test/`
5. Update `docs/API.md`

Example:

```typescript
// 1. Define types (src/types/license.ts)
export interface LicenseStatusRequest {
  licenseKey: string;
}

export interface LicenseStatusResponse {
  status: LicenseStatus;
  expiresAt: string | null;
}

// 2. Add to service (src/services/license-service.ts)
async getStatus(licenseKey: string): Promise<LicenseStatusResponse> {
  // Implementation
}

// 3. Register route (src/index.ts)
router.get('/api/v1/license/:key/status', async (request, params) => {
  const result = await licenseService.getStatus(params.key);
  return jsonResponse(result);
});

// 4. Add tests (test/index.spec.ts)
it('returns license status', async () => {
  // Test implementation
});
```

### Adding Middleware

1. Create middleware file in `src/middleware/`
2. Export middleware function
3. Apply in router or handler

Example:

```typescript
// src/middleware/rate-limit.ts
export async function rateLimit(request: Request): Promise<Response | null> {
  // Check rate limit
  if (isRateLimited) {
    return errorResponse('Rate limit exceeded', 429);
  }
  return null; // Allow request to proceed
}

// src/index.ts
const rateLimitResult = await rateLimit(request);
if (rateLimitResult) return rateLimitResult;
```

## Code Review Guidelines

### As a Reviewer

- Be respectful and constructive
- Focus on code quality and maintainability
- Check for test coverage
- Verify documentation is updated
- Test locally if needed

### As an Author

- Respond to all comments
- Make requested changes or explain reasoning
- Keep PRs focused and reasonably sized
- Be patient and professional

## Documentation

### API Documentation

Update `docs/API.md` when:
- Adding new endpoints
- Changing request/response formats
- Modifying error responses
- Adding new status codes

### Code Comments

Add comments for:
- Complex algorithms
- Non-obvious business logic
- Workarounds or hacks
- TODOs (with issue references)

Avoid comments for:
- Self-explanatory code
- Restating what the code does

## Performance Considerations

- Keep worker execution time under 10ms when possible
- Minimize CPU-intensive operations
- Use async operations appropriately
- Consider caching for frequently accessed data

## Security Considerations

- Never log sensitive data
- Validate all user input
- Use parameterized queries (when database is added)
- Sanitize error messages sent to clients
- Follow principle of least privilege

## Questions?

If you have questions or need help:
- Check existing documentation
- Review similar existing code
- Open an issue for discussion
- Reach out to maintainers

Thank you for contributing!
