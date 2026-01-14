---
trigger: glob
globs: **/*.service.ts
---

# NestJS Service Patterns

- Inject dependencies via constructor
- Use `@InjectRepository(Entity)` for database access
- Throw NestJS exceptions: `NotFoundException`, `BadRequestException`, etc.
- Wrap multi-step database operations in transactions
