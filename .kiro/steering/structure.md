---
inclusion: always
---

## Project Structure

```
src/
├── main.ts                    # Entry point
├── app.module.ts              # Root module
├── common/                    # Shared code
│   ├── dto/                   # ResponseDto (standard API wrapper)
│   └── enums/                 # Role enum
├── auth/                      # Authentication & authorization
│   ├── guards/                # JWT guard (global)
│   ├── strategies/            # Passport JWT strategy
│   ├── lib/                   # @CurrentUser, @Roles decorators
│   ├── dto/                   # Login, register DTOs
│   ├── entities/              # SessionTokens
│   └── interfaces/            # JwtPayload
├── users/                     # User management
├── utils/                     # Static helper classes (DtoMapper, StringHelper)
│   ├── index.ts               # Barrel export
│   ├── utils.service.ts       # Static helper classes
│   └── utils.module.ts        # Empty module (for consistency)
└── [feature]/                 # Feature modules follow pattern below
    ├── dto/
    ├── entities/
    ├── [feature].controller.ts
    ├── [feature].service.ts
    └── [feature].module.ts
```

## Module Pattern

Every feature module MUST follow this structure:

**Required Files:**

- `*.module.ts` - NestJS module definition with imports/providers
- `*.controller.ts` - HTTP endpoints only, no business logic
- `*.service.ts` - Business logic, database operations

**Required Folders:**

- `dto/` - Request/response DTOs with validation
- `entities/` - TypeORM entities (if module uses database)

**Optional:**

- `interfaces/` - TypeScript type definitions
- `guards/` - Custom guards
- `lib/` - Utilities, decorators

## Separation of Concerns

- **Controllers**: HTTP layer, routing, decorators only
- **Services**: Business logic, database queries, external API calls
- **Entities**: Database schema with TypeORM decorators
- **DTOs**: Input validation and response mapping
- **Utils**: Static helper classes (NO dependency injection needed)
