export class ResponseDto<T = unknown> {
  private readonly data: T;
  private readonly message: string;
  private readonly status_code: number;

  constructor(data: T, message = 'ok', statusCode = 200) {
    this.data = data;
    this.message = message;
    this.status_code = statusCode;
  }
}
