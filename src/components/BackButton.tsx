import { useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BackButton({ label = "Назад" }: { label?: string }) {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label="Назад"
      className="-ml-2 mb-2 gap-1 px-2"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) router.history.back();
        else void router.navigate({ to: "/" });
      }}
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Button>
  );
}
