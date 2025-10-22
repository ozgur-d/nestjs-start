---
inclusion: always
---

## Tech Stack

- **Framework**: NestJS 11.x with Fastify (NOT Express)
- **Runtime**: Node.js 22.19.0 LTS
- **Language**: TypeScript 5.9.x (strict mode, isolatedModules enabled)
- **Database**: PostgreSQL 18 + TypeORM 0.3.x
  - CRITICAL: `synchronize: true` enabled - NO migrations, schema auto-syncs
- **Cache**: Redis with Keyv library
  - NestJS Cache Module integrated with Keyv for Redis connection
  - Use `@UseInterceptors(CacheInterceptor)` on controllers for 1-minute caching
- **Authentication**: JWT with Passport.js
- **Validation**: class-validator + class-transformer
- **API Docs**: Swagger/OpenAPI
- **Date/Time**: Luxon
- **HTTP Requests**: Native Node.js `fetch()` API (NO axios)

## Development Workflow

**Before completing any code changes:**

1. Run `npm run build` to verify TypeScript compilation
2. Fix all ESLint/TypeScript errors
3. Run `npm run format` for consistent formatting

**Available Commands:**

```bash
npm run start:debug    # Dev server with hot-reload
npm run build        # Compile TypeScript (REQUIRED before completion)
npm run lint         # ESLint with auto-fix
npm run format       # Prettier formatting
```

## Build Configuration

- NestJS CLI handles building and scaffolding
- Output: CommonJS in `dist/` directory
- Source maps enabled
- Auto-discovery: entities and modules load automatically
