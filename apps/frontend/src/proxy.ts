import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import "dotenv/config";

const PUBLIC_ROUTES: string[] = [
  "/polaris/user",
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

const ADMIN_ROUTES: string[] = [
  "/lynx/databases",
  "/lynx/logs",
  "/lynx/config",
  "/lynx/chat"
];

function getJwtExpiry(tokenString: string): number | null {
  try {
    const parts = tokenString.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

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
  if (token.accessToken) {
    const expiry = getJwtExpiry(token.accessToken as string);
    if (expiry && Date.now() >= expiry) {
      url.pathname = "/polaris/login";
      return NextResponse.redirect(url);
    }
  }
  if (ADMIN_ROUTES.some((route) => pathname.startsWith(route)) && token.role !== "ADMIN") {
    if (pathname.startsWith("/lynx")) {
      url.pathname = "/lynx/unauthorized";
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith("/aquila")) {
      url.pathname = "/aquila/unauthorized";
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith("/polaris")) {
      url.pathname = "/polaris/unauthorized";
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
