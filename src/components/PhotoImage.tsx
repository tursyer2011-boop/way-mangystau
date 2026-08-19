import { useQuery } from "@tanstack/react-query";
import { Truck } from "lucide-react";
import { signedPhotoUrl } from "@/lib/photos";
import { cn } from "@/lib/utils";

export function PhotoImage({
  path,
  alt,
  className,
}: {
  path?: string | null;
  alt: string;
  className?: string;
}) {
  const { data } = useQuery({
    queryKey: ["photo", path],
    queryFn: () => signedPhotoUrl(path),
    enabled: !!path,
    staleTime: 1000 * 60 * 30,
  });

  if (!data) {
    return (
      <div className={cn("flex items-center justify-center bg-muted", className)}>
        <Truck className="h-8 w-8 text-muted-foreground" aria-hidden />
      </div>
    );
  }

  return <img src={data} alt={alt} loading="lazy" className={cn("object-cover", className)} />;
}
