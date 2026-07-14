import PagePlaceholder from "@/components/PagePlaceholder";
import { ProRoleToggle } from "@/components/dev/ProRoleToggle";

export default function PaymentPage() {
  return (
    <>
      <PagePlaceholder
        title="Payment & Subscription"
        description="Manage your subscription and payment details."
      />
      <ProRoleToggle />
    </>
  );
}
