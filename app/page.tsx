import { redirect } from "next/navigation";

// Only one screen exists so far, so the home page sends you there.
export default function Home() {
  redirect("/foods");
}
