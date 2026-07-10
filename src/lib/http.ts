import { NextResponse } from "next/server";
import { ZodError, type ZodType, type z } from "zod";

// Semua error API memakai bentuk FastAPI: { detail: string | array }.
// Frontend lama (services/api.js) sudah membaca error.response.data.detail,
// jadi bentuk ini HARUS dipertahankan.

export class HttpError extends Error {
  constructor(
    public status: number,
    public detail: unknown,
    public headers?: Record<string, string>,
  ) {
    super(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
}

export function jsonError(
  status: number,
  detail: unknown,
  headers?: Record<string, string>,
) {
  return NextResponse.json({ detail }, { status, headers });
}

// Terjemahkan kode issue Zod ke kode tipe Pydantic yang dikenali frontend
// (api.js memetakan 'string_too_short' & 'value_error' ke pesan Indonesia).
function pydanticType(issue: z.core.$ZodIssue): string {
  if (issue.code === "too_small") return "string_too_short";
  if (issue.code === "too_big") return "string_too_long";
  if (issue.code === "invalid_format") return "value_error";
  return issue.code ?? "value_error";
}

export async function parseBody<T extends ZodType>(
  req: Request,
  schema: T,
): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(422, [
      { loc: ["body"], msg: "Body JSON tidak valid.", type: "value_error" },
    ]);
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new HttpError(
      422,
      result.error.issues.map((issue) => ({
        loc: ["body", ...issue.path],
        msg: issue.message,
        type: pydanticType(issue),
      })),
    );
  }
  return result.data;
}

// Bungkus route handler: HttpError → {detail} berstatus, sisanya → 500
// tanpa membocorkan pesan internal (paritas dengan perbaikan AI-error-leak lama).
export function handler<Ctx>(
  fn: (req: Request, ctx: Ctx) => Promise<Response>,
): (req: Request, ctx: Ctx) => Promise<Response> {
  return async (req, ctx) => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      if (err instanceof HttpError) {
        return jsonError(err.status, err.detail, err.headers);
      }
      if (err instanceof ZodError) {
        return jsonError(
          422,
          err.issues.map((issue) => ({
            loc: ["body", ...issue.path],
            msg: issue.message,
            type: pydanticType(issue),
          })),
        );
      }
      console.error(err);
      return jsonError(500, "Terjadi kesalahan pada server.");
    }
  };
}
