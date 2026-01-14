---
trigger: glob
globs: **/*.ts,**/*.js
---

## Naming Conventions

**MANDATORY:**

- **DTOs & Entities**: Use snake_case for all properties (`mime_type`, `file_name`, `created_at`)
- **Class Names**: Use PascalCase (`UserService`, `AuthController`, `ResponseDto`)
- **Function Names & Parameters**: Use camelCase (`userRepository`, `getUserById`, `isValidToken`)

# TypeScript Requirements

**MANDATORY:**

- Explicit return types on ALL functions
- NO `any` types - use proper typing
- Use `async/await` (no floating promises)
- Prefer `const` over `let`
- Strict TypeScript mode enabled
- NEVER use `process.env` - ALWAYS use `ConfigService.getOrThrow<T>()` for required values or `get<T>(key, default)` for optional values
- Use `import type` for types in decorator parameters (e.g., `import type { FastifyReply } from 'fastify'`)
- Use NestJS Logger instead of console.log - inject `private readonly logger = new Logger(ClassName.name)` and use `this.logger.log()`, `this.logger.error()`, etc.
- Create for ALL inputs in `dto/` folder
- Don't write inline dto or response.dto. always create file.(request body/query/params are included)
- Always create response dto for returning data and map data to response dto in service. - ALWAYS map using `DtoMapper.toDto(data, ResponseDto)` or `DtoMapper.toDtos(array, ResponseDto)`

**Verification:**

- ALWAYS run `npm run build` after writing code
- ALWAYS run `npm run lint` and fix ALL TypeScript/ESLint errors.
- ALWAYS run `npm run format` for consistent formatting