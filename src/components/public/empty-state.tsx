import { Inbox } from "lucide-react";

export function EmptyState({ message, icon: Icon = Inbox }: { message: string; icon?: typeof Inbox }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white py-16 text-center">
      <Icon className="h-8 w-8 text-stone-300" />
      <p className="mt-3 text-sm text-stone-400">{message}</p>
    </div>
  );
}
