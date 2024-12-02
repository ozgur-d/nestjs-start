export class ResponseDto {
  private readonly data: any;
  private readonly message: string;
  private readonly status_code: number;

  constructor(data: any, message = 'ok', statusCode = 200) {
    this.data = data;
    this.message = message;
    this.status_code = statusCode;
  }
}
