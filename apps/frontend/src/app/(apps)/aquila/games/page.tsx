import { redirect } from "next/navigation";

export default function GamesPage() {
  redirect("/aquila/browse?type=games");
}
