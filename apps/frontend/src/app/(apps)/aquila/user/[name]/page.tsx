'use client';

import { useParams } from "next/navigation";
import { useEffect } from "react";

export default function UserPage() {
  const params = useParams();
  const { name } = params;

  useEffect(() => {
    document.title = `Aquila > User > ${name ?? ""}`;
  }, [name])

  return <div>UserPage</div>;
}
