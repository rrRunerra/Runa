import { Metadata } from "next";
import RankingsClient from "./RankingsClient";

interface PageProps {
  params: Promise<{ type: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { type } = await params;
  const formattedType = type.charAt(0).toUpperCase() + type.slice(1);

  return {
    title: `Aquila > Top 100 ${formattedType} Rankings`,
    description: `Browse the top 100 highest rated ${formattedType} by average score and external service ratings.`,
  };
}

export default async function Page({
  params,
}: PageProps): Promise<React.JSX.Element> {
  const { type } = await params;
  return <RankingsClient type={type} />;
}
