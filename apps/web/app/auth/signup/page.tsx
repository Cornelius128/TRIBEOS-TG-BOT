import { redirect } from "next/navigation";

// Signup is no longer needed — Telegram Web App auth creates accounts automatically.
export default function SignUpPage() {
  redirect("/auth/telegram");
}
