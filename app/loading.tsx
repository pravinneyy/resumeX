import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#1a0808]">
      <Loader2 className="w-10 h-10 text-[#e8a0a0] animate-spin" />
    </div>
  );
}