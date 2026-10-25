import { NextResponse, type NextRequest } from "next/server";
import { pageCsp } from "@/shared/lib/csp";

export function proxy(request: NextRequest) {
  if (process.env.NODE_ENV === "development") return NextResponse.next();
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const policy = pageCsp(nonce);
  // Always replace inbound values: clients cannot choose the document nonce.
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", policy);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/((?!api(?:/|$)|_next/|.*\\.[^/]+$).*)"],
};
