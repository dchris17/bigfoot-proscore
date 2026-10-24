"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { PinScreen } from "@/components/footprint";
import { checkPin } from "./actions";

export function PinWrapper() {
  const router = useRouter();
  const sp = useSearchParams();

  const handleSubmit = async (pin: string) => {
    const result = await checkPin(pin);
    if (result.ok) {
      router.push(sp.get("next") ?? "/settings");
    }
    return result;
  };

  return <PinScreen onSubmit={handleSubmit} />;
}
