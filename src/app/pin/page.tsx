import { Suspense } from "react";
import { PinWrapper } from "./PinWrapper";

export const metadata = { title: "The Footprint — Admin" };

export default function PinPage() {
  return (
    <Suspense>
      <PinWrapper />
    </Suspense>
  );
}
