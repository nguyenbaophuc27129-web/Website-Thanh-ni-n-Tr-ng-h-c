import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function QuanTriLayout({ children }: LayoutProps<"/quan-tri">) {
  return <DashboardShell>{children}</DashboardShell>;
}
