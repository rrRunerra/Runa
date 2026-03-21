import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

const ADMIN_ROUTES: string[] = [];
const PROTECTED_ROUTES: string[] = [...ADMIN_ROUTES];

export default async function proxy(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const url = req.nextUrl.pathname;

  if (!token || Date.now() > (token?.exp as number) * 1000) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_AUTH}/login?callbackUrl=${req.url}`,
    );
  }

  if (PROTECTED_ROUTES.some((route) => url.startsWith(route))) {
    if (
      ADMIN_ROUTES.some((route) => url.startsWith(route)) &&
      token.role !== "ADMIN"
    ) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_AUTH}/login?callbackUrl=${req.url}`,
      );
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
