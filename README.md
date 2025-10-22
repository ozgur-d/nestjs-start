# Nestjs Starter

It can take time to create a new nestjs project and make all settings and install the packages. That's why I made this
starter kit.

## Features

- [x] Authentication
- [x] Role based authorization
- [x] Refresh token operations
- [x] Session verify and token management from database
- [x] Logout function for killing session
- [x] CurrentUser decorator
- [x] PostgreSQL connection with TypeORM
- [x] Auto load & sync entities
- [x] Eslint
- [x] Swagger (persistAuthorization)
- [x] Env settings (local and dev)
- [x] Debug settings
- [x] Validation setted up and contains sample codes
- [x] Response Format
- [x] Access token, username are indexed for quick access
- [x] Pagination with QueryBuilder
- [x] Static Helper Classes (DtoMapper, StringHelper)
- [x] Slugify integration for URL-friendly strings
- [x] File upload system with validation and thumbnail generation
- [x] Docker configurations for development and production

## Installation

The project is using Node.js 22.19.0 LTS and NestJS 11.x with Fastify.
First of all, if you have nvm, let's make sure you are using version 22.19.0

```bash
  nvm install 22.19.0
  nvm use 22.19.0
```

To install all packages

```bash
  npm install
```

To upgrade all packages to current versions

```bash
  npm update
  npm i -g npm-check-updates && ncu -u && npm i
```

## Usages & Examples

### Authorization

To enable bearer token sending with Swagger, you must put the following tag at the beginning of the controller

```typescript
@ApiBearerAuth()
```

Using the Roles decorator, you can specify the user roles that can access those controls.

```typescript
@Roles(Role.Admin, Role.User)
@Get('me')
async getProfile(@CurrentUser() user: Users): Promise<ResponseDto> {
  const response = await this.usersService.findOne(user.username);
  return new ResponseDto(response);
}
```

All remaining functions are public. You don't need to use @public decorator.

### Response Format

You can return `ResponseDto` when returning data in the controller to have a uniform response format

```typescript
const response = await this.authService.getAccessToken(refreshToken);
return new ResponseDto(response, 'Access token retrieved');
```

`return new ResponseDto(response);` // returns 'ok' message and statusCode:200

`return new ResponseDto(response, 'Access token retrieved');` // returns custom message and statusCode:200

`return new ResponseDto(null, 'Access token cannot retrieved', HttpStatus.BAD_REQUEST);` // returns custom message and statusCode:400

Response Example:

```json
{
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InN0cmluZyIsInN1YiI6MSwiY3JlYXRlZEF0IjoiMjAyMi0xMS0xMFQxMDo1MDo1MS41MzBaIiwiaWF0IjoxNjY4MTU1MTQ0LCJleHAiOjE2NjgyNDUxNDR9.Xf6AKBTgx6NPXtP7WsqvUJMYdvpUZ_9zZvTTfZpxJyA",
    "refresh_token": "c1cb305691112804f045af444fc39a41876bfec25aa544d4cb1ab4e94b05693f743d9c2548afc9c92a8e555777c6bbc50a97fe3bf8fab30eac581e8c42031b0f",
    "expires_at": "2022-11-12T09:25:44.918Z",
    "expires_refresh_at": "2022-12-11T08:25:44.918Z"
  },
  "message": "Login informations are retrived",
  "statusCode": 200
}
```

### Pagination

Pagination is implemented using TypeORM QueryBuilder with a standardized input DTO. The response follows the `PaginatorResponse<T>` type structure.

**Input DTO (PaginatorInputDto):**

```typescript
export class GetAllUsersDto extends PaginatorInputDto {
  // Add custom filters here if needed
}

// Base PaginatorInputDto structure:
{
  page: number;         // Default: 1
  limit: number;        // Default: 10, Max: 100
  order?: OrderDirection; // 'ASC' | 'DESC', Default: 'DESC'
}
```

**Service Implementation:**

```typescript
async getPaginatedUsers(input: GetAllUsersDto): Promise<PaginatorResponse<MeResponseDto>> {
  const queryBuilder = this.usersRepository
    .createQueryBuilder('users')
    .leftJoinAndSelect('users.session_tokens', 'session_tokens')
    .orderBy('users.created_at', input.order || 'DESC')
    .skip(input.limit * (input.page - 1))
    .take(input.limit);

  const [data, total] = await queryBuilder.getManyAndCount();

  const nodes = DtoMapper.toDtos(data, MeResponseDto);
  const pageSize = Math.min(input.limit, total);

  return {
    nodes,
    current_page: input.page,
    page_size: pageSize,
    has_next: total > input.page * input.limit,
    total_pages: Math.ceil(total / input.limit),
    total_count: total,
  };
}
```

**Controller Usage:**

```typescript
@Get('all')
async findAll(@Query() input: GetAllUsersDto): Promise<ResponseDto> {
  const result = await this.usersService.getPaginatedUsers(input);
  return new ResponseDto(result);
}
```

**PaginatorResponse Structure:**

```typescript
{
  nodes: T[];           // Array of mapped DTOs
  current_page: number; // Current page number
  page_size: number;    // Number of items in current page
  has_next: boolean;    // Whether there are more pages
  total_pages: number;  // Total number of pages
  total_count: number;  // Total number of records
}
```

### Static Helper Classes

The project uses static helper classes instead of injectable services for pure utility functions. This approach provides better performance and cleaner code.

#### DtoMapper

Maps entities to DTOs using class-transformer. No dependency injection needed.

```typescript
import { DtoMapper } from '../utils';

// Map single entity
const dto = DtoMapper.toDto(user, MeResponseDto);

// Map array of entities
const dtos = DtoMapper.toDtos(users, MeResponseDto);
```

**DTO Requirements:**

- Use `@Expose()` decorator for properties you want to return
- Use `@Type(() => NestedDto)` for nested objects
- Use `@ApiProperty()` for Swagger documentation

**Example DTO:**

```typescript
export class MeResponseDto {
  @Expose()
  @ApiProperty()
  id: number;

  @Expose()
  @ApiProperty()
  username: string;

  @Expose()
  @Type(() => SessionResponseDto)
  @ApiProperty({ type: [SessionResponseDto] })
  session_tokens: SessionResponseDto[];
}
```

#### StringHelper

Provides string manipulation utilities.

```typescript
import { StringHelper } from '../utils';

// Generate URL-friendly slug
const slug = StringHelper.generateSlug('Hello World!'); // 'hello-world'
const turkishSlug = StringHelper.generateSlug('Türkçe Başlık'); // 'turkce-baslik'

// Capitalize first letter
const capitalized = StringHelper.capitalize('hello'); // 'Hello'
```

**Slugify Configuration:**

- Converts to lowercase
- Removes special characters: `*+~.()'"!:@?/`
- Handles Turkish characters automatically
- Replaces spaces with hyphens

### Rate Limiting

The project includes a custom throttler guard that works correctly behind proxies (Cloudflare, Nginx, etc.) by detecting the real client IP address.

**Usage:**

Add `@UseGuards(CustomThrottlerGuard)` decorator to routes that need rate limiting:

```typescript
import { CustomThrottlerGuard } from '../common/guards/throttler-behind-proxy.guard';

@Post('login')
@UseGuards(CustomThrottlerGuard)
async login(@Body() loginDto: LoginDto): Promise<ResponseDto> {
  const response = await this.authService.login(loginDto);
  return new ResponseDto(response);
}
```

**IP Detection Priority:**

1. `cf-connecting-ip` (Cloudflare)
2. `true-client-ip` (Cloudflare alternative)
3. `x-real-ip` (Nginx)
4. `x-forwarded-for` (Standard proxy header)
5. `req.ips` / `req.ip` (Direct connection fallback)

The guard automatically detects the real client IP even when behind multiple proxies, preventing rate limit bypass attempts.

## Docker

The project includes two Docker configurations for different purposes:

### docker-infra/

Local development infrastructure for testing. Contains Docker Compose configuration to quickly spin up PostgreSQL and Redis locally.

**Usage:**

```bash
cd docker-infra
docker-compose up -d    # Start infrastructure
docker-compose down     # Stop infrastructure
```

This folder includes:

- `docker-compose.yml` - PostgreSQL and Redis containers
- `backup.sh` - Database backup script
- `restore.sh` - Database restore script

### docker-prod-conf/

Production deployment example configuration. Contains sample Docker Compose setup that can be used for production deployments.

**Contents:**

- `docker-compose.yml` - Production-ready compose file with Nginx reverse proxy
- `nginx.conf` - Nginx configuration for SSL termination and reverse proxy
- `backup.sh` - Production database backup script
- `restore.sh` - Production database restore script
- `ssl/` - SSL certificate directory

**Note:** This is a reference configuration. Adjust according to your production environment requirements.

### File Upload

The project includes a comprehensive file upload system with validation, image processing, and thumbnail generation capabilities.

**Features:**

- Single and multiple file uploads
- File type validation (Image, Video, Document, Audio)
- File size validation
- Image resolution validation (min/max width/height)
- Automatic thumbnail generation for images
- Dimension extraction for images
- Organized file storage with user-based directories
- Database tracking of uploaded files

**Single File Upload:**

```typescript
@Post()
@UploadFile('file')
@ApiOperation({ summary: 'Upload a single file' })
async uploadFile(
  @UploadedFile() file: MultipartFile,
  @CurrentUser() currentUser: Users,
): Promise<ResponseDto<UploadResponseDto>> {
  const uploadOptions = new UploadFileDto();
  uploadOptions.field_name = 'file';
  uploadOptions.file_type = FileTypeEnum.Image;
  uploadOptions.max_size = 5120; // 5MB in KB
  uploadOptions.max_resolution_width = 2048;
  uploadOptions.max_resolution_height = 2048;
  uploadOptions.min_resolution_width = 100;
  uploadOptions.min_resolution_height = 100;
  uploadOptions.return_dimensions = true;
  uploadOptions.generate_thumbnails = true;

  const result = await this.uploadsService.uploadFile(file, uploadOptions, currentUser);
  return new ResponseDto(result, 'File uploaded successfully');
}
```

**Multiple File Upload:**

```typescript
@Post('multiple')
@UploadFiles('files', 10)
@ApiOperation({ summary: 'Upload multiple files' })
async uploadMultipleFiles(
  @UploadedFiles() files: MultipartFile[],
  @CurrentUser() currentUser: Users,
): Promise<ResponseDto<UploadResponseDto[]>> {
  const uploadOptions = new UploadFileDto();
  uploadOptions.field_name = 'files';
  uploadOptions.file_type = FileTypeEnum.Image;
  uploadOptions.max_size = 5120; // 5MB
  uploadOptions.max_resolution_width = 2048;
  uploadOptions.max_resolution_height = 2048;
  uploadOptions.min_resolution_width = 100;
  uploadOptions.min_resolution_height = 100;
  uploadOptions.max_files = 10;
  uploadOptions.return_dimensions = true;
  uploadOptions.generate_thumbnails = true;

  const result = await this.uploadsService.uploadMultipleFiles(files, uploadOptions, currentUser);
  return new ResponseDto(result, 'Files uploaded successfully');
}
```

**Upload Options (UploadFileDto):**

```typescript
{
  field_name: string;              // Form field name
  file_type: FileTypeEnum;         // Image | Video | Document | Audio
  max_size: number;                // Maximum file size in KB
  max_resolution_width?: number;   // Max image width (images only)
  max_resolution_height?: number;  // Max image height (images only)
  min_resolution_width?: number;   // Min image width (images only)
  min_resolution_height?: number;  // Min image height (images only)
  max_files?: number;              // Max number of files (multiple upload)
  return_dimensions?: boolean;     // Return image dimensions in response
  generate_thumbnails?: boolean;   // Generate thumbnails for images
}
```

**File Type Enum:**

```typescript
enum FileTypeEnum {
  Image = 'image', // jpg, jpeg, png, gif, webp, svg
  Video = 'video', // mp4, avi, mov, wmv, flv, mkv
  Document = 'document', // pdf, doc, docx, xls, xlsx, ppt, pptx, txt
  Audio = 'audio', // mp3, wav, ogg, flac, aac
}
```

**Upload Response:**

```typescript
{
  id: number;                    // Database record ID
  file_name: string;             // Original filename
  file_path: string;             // Relative path to file
  file_url: string;              // Full URL to access file
  file_size: number;             // File size in bytes
  mime_type: string;             // MIME type
  width?: number;                // Image width (if return_dimensions: true)
  height?: number;               // Image height (if return_dimensions: true)
  thumbnail_path?: string;       // Thumbnail path (if generated)
  thumbnail_url?: string;        // Thumbnail URL (if generated)
  uploaded_by: number;           // User ID who uploaded
  created_at: Date;              // Upload timestamp
}
```

**File Storage Structure:**

```
public/uploads/
└── user-{userId}/
    ├── original-filename.jpg
    └── thumbnails/
        └── original-filename-thumb.jpg
```

**Decorators:**

- `@UploadFile(fieldName)` - Single file upload decorator
- `@UploadFiles(fieldName, maxCount)` - Multiple files upload decorator
- `@UploadedFile()` - Get uploaded file in controller
- `@UploadedFiles()` - Get uploaded files array in controller

**Validation:**

The system automatically validates:

- File type matches allowed extensions
- File size doesn't exceed max_size
- Image dimensions are within min/max bounds
- MIME type matches file extension

**Error Handling:**

Throws `BadRequestException` with descriptive messages for:

- Invalid file type
- File size exceeded
- Resolution out of bounds
- Missing required files
- Invalid file format

### Testing

If you want use test modules checkout nestjs/testing and use spec.ts files.
https://docs.nestjs.com/fundamentals/testing
