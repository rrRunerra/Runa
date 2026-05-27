import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import "dotenv/config";

const PUBLIC_ROUTES: string[] = [
  "/polaris/login",
  "/polaris/register",
  "/polaris/api/register",
  "/api/auth/session",
  "/aquila/api",
  "/aquila/user",
  "/aquila/anime",
  "/aquila/movies",
  "/aquila/manga",
  "/aquila/books",
  "/aquila/games",
  "/aquila/tv",
  "/aquila/music",
  "/aquila/browse",
  "/api/auth",
  "/api/auth/callback/credentials",
  "/aquila"
];

const ADMIN_ROUTES: string[] = [];

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const url = req.nextUrl.clone();
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: process.env.NEXTAUTH_URL?.startsWith("https://") ?? false,
  });
  if (!token) {
    url.pathname = "/polaris/login";
    return NextResponse.redirect(url);
  }

  if (Date.now() > (token.exp as number) * 1000) {
    url.pathname = "/polaris/login";
    return NextResponse.redirect(url);
  }
  if (ADMIN_ROUTES.includes(pathname) && token.role !== "ADMIN") {
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
