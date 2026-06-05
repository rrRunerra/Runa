import { redirect } from "next/navigation";

export default function BooksPage() {
  redirect("/aquila/browse?type=books");
}
