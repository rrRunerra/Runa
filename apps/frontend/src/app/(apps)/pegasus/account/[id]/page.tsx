import { redirect } from "next/navigation";

interface PageProps {
  params: {
    id: string;
  };
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  redirect(`/pegasus/account/${id}/inbox`);
}
