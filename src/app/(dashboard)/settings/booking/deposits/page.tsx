import { redirect } from "next/navigation";

export default function DepositsRedirectPage() {
  redirect("/settings/booking");
}
