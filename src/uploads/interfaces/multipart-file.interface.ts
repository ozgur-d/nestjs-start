/**
 * Interface representing a multipart file from Fastify
 * This is the structure returned by request.file() and request.parts()
 */
export interface MultipartFile {
  fieldname: string;
  filename: string;
  mimetype: string;
  encoding: string;
  file: AsyncIterable<Buffer>;
  toBuffer?(): Promise<Buffer>;
  buffer?: Buffer; // Added by our decorators for convenience
}
