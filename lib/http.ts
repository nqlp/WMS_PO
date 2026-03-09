import { NextResponse } from 'next/server';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function jsonError(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

export function handleRouteError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return jsonError(error.status, error.message);
  }

  if (error instanceof Error) {
    return jsonError(500, error.message);
  }

  return jsonError(500, "Unknown server error");
}
