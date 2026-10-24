"use client";
import { useRouter } from "next/navigation";
import { PinScreen } from "@/components/footprint/PinScreen";

/** Preview only: the PIN is 1234 and nothing is stored. The real page checks the PIN on the server. */
export default function DesignPreviewPin() {
  const router = useRouter();
  return (
    <PinScreen
      onSubmit={async (pin) => {
        await new Promise((r) => setTimeout(r, 350));
        if (pin === "1234") { router.push("/design-preview"); return { ok: true }; }
        return { ok: false, error: "That PIN didn't work. Try again." };
      }}
    />
  );
}
