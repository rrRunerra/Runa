"use client";

import { redirect, useParams } from "next/navigation";
import { useEffect } from "react";

export default function UserPage() {
  const params = useParams();
  const { name } = params;

  return redirect(`/polaris/user/${name}`);
}
