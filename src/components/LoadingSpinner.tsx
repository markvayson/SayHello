import { VscRefresh } from "react-icons/vsc";

type LoadingSpinnerProps = {
  big?: boolean;
};

export function LoadingSpinner({ big = false }: LoadingSpinnerProps) {
  const sizeClasess = big ? "w-16 h-16" : "w-10 h-10";

  return (
    <div className="flex justify-center p-2">
      <VscRefresh className={`animate-spin ${sizeClasess}`} />
    </div>
  );
}
