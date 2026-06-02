import { Response } from "express";
import { formatContentDisposition } from "@chronomint/contracts";

export function sendAttachment(
  res: Response,
  result: { buffer: Buffer; contentType: string; filename: string }
) {
  res.setHeader("Content-Type", result.contentType);
  res.setHeader("Content-Disposition", formatContentDisposition(result.filename));
  res.send(result.buffer);
}
