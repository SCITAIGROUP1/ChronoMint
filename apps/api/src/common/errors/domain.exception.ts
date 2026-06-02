import { HttpException, HttpStatus } from "@nestjs/common";
import type { ErrorCode } from "@chronomint/contracts";

export class DomainException extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST
  ) {
    super({ code, message }, status);
  }
}
