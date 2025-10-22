---
inclusion: fileMatch
fileMatchPattern: ['**/*.ts', '**/*.js']
---

## Naming Conventions

**MANDATORY:**

- **DTOs & Entities**: Use snake_case for all properties (`mime_type`, `file_name`, `created_at`)
- **Class Names**: Use PascalCase (`UserService`, `AuthController`, `ResponseDto`)
- **Function Names & Parameters**: Use camelCase (`userRepository`, `getUserById`, `isValidToken`)

## TypeScript Requirements

**MANDATORY:**

- Explicit return types on ALL functions
- NO `any` types - use proper typing
- Use `async/await` (no floating promises)
- Prefer `const` over `let`
- Strict TypeScript mode enabled
- NEVER use `process.env` - ALWAYS use `ConfigService.getOrThrow<T>()` for required values or `get<T>(key, default)` for optional values
- Use `import type` for types in decorator parameters (e.g., `import type { FastifyReply } from 'fastify'`)
- Use NestJS Logger instead of console.log - inject `private readonly logger = new Logger(ClassName.name)` and use `this.logger.log()`, `this.logger.error()`, etc.

**Verification:**

- ALWAYS run `npm run build` after writing code
- Fix ALL TypeScript/ESLint errors before completion

## NestJS Controller Patterns

**Decorators:**

- `@ApiBearerAuth()` - Add at CLASS level (not per route)
- `@ApiOperation({ summary: Role.Admin + ', ' + Role.User })` - Must be include permission name, use public if its public. On every route
- `@ApiResponse({ status: 200, type: ResponseDto })` - Document responses
- `@UseInterceptors(CacheInterceptor)` - Add at CLASS level for 1-minute caching
- `@UseGuards(CustomThrottlerGuard)` - Add at ROUTE level for rate limiting (proxy-aware IP detection)

**Authorization:**

- Global JWT guard is ACTIVE on all routes
- Routes WITHOUT `@Roles()` = PUBLIC (authenticated but no role check)
- Routes WITH `@Roles(Role.Admin)` = Role-restricted

**Caching:**

- Use `@UseInterceptors(CacheInterceptor)` at controller class level for automatic caching
- Default TTL: 1 minute (configured in app.module.ts)
- Best for: Read-heavy endpoints (hero sliders, pricing, products)
- Avoid for: User-specific data, write operations, real-time data

**Response Pattern:**

```typescript
// Always wrap in ResponseDto
return new ResponseDto(data);
return new ResponseDto(data, 'Custom message');

// Map DTOs before returning using static helper
import { DtoMapper } from '../utils';
const result = DtoMapper.toDto(user, MeResponseDto);
return new ResponseDto(result);
```

**Access User:**

```typescript
@Get('me')
async getMe(@CurrentUser() user: Users): Promise<ResponseDto<MeResponseDto>> {
  // user is automatically injected from JWT
}
```

## NestJS Service Patterns

- Inject dependencies via constructor
- Use `@InjectRepository(Entity)` for database access
- Throw NestJS exceptions: `NotFoundException`, `BadRequestException`, etc.
- Wrap multi-step database operations in transactions

## DTO Requirements

**Input DTOs (request body/query/params):**

- Create for ALL inputs in `dto/` folder
- Use class-validator: `@IsString()`, `@IsNotEmpty()`, `@IsEmail()`, etc.
- Include `@ApiProperty()` for Swagger

**Response DTOs:**

- Naming: `*.response.dto.ts` (e.g., `login.response.dto.ts`)
- Use `@Expose()` on ALL properties
- Use `@Type(() => NestedDto)` for nested objects
- ALWAYS map using `DtoMapper.toDto(data, ResponseDto)` or `DtoMapper.toDtos(array, ResponseDto)`

**Example:**

```typescript
export class UserResponseDto {
  @Expose()
  @ApiProperty()
  id: number;

  @Expose()
  @ApiProperty()
  email: string;

  @Expose()
  @Type(() => SubscriptionDto)
  @ApiProperty({ type: SubscriptionDto })
  subscription: SubscriptionDto;
}
```

## Authentication Architecture

- JWT access tokens: 15 minute expiry
- Refresh tokens: HTTP-only cookies
- Session tracking: Database-persisted in `session_tokens` table
- Global guard: All routes require valid JWT unless explicitly public

## HTTP Requests

**MANDATORY:**

- ALWAYS use Node.js native `fetch()` API for HTTP requests
- NEVER use axios or other HTTP libraries
- Node.js 22.x has built-in fetch support (no imports needed)

**Example:**

```typescript
// Simple GET request
const response = await fetch('https://api.example.com/data');
const data = await response.json();

// POST with JSON body
const response = await fetch('https://api.example.com/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ name: 'John' }),
});

// Error handling
if (!response.ok) {
  throw new BadRequestException(`API error: ${response.statusText}`);
}
```

## Code Quality Checklist

1. Write code with explicit types
2. Run `npm run build` - verify compilation
3. Fix all errors
4. Run `npm run format` - apply Prettier
5. Verify Swagger docs are complete
