import { Link } from "react-router";
import { ArrowUpRight } from "lucide-react";
import { formatDateTime } from "@/features/studio-kit";
import type { AdminUser } from "@/mocks/admin";
import { AdminTable, StatusPill, type AdminColumn } from "./admin-table";

const STATUS_TONE: Record<AdminUser["status"], "teal" | "brass" | "destructive"> = {
  active: "teal",
  trial: "brass",
  suspended: "destructive",
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0] ?? "").join("").slice(0, 2).toUpperCase();
}

/** Reusable users table — used on the Users page and (trimmed) elsewhere. */
export function UserTable({ users, label = "Users", action }: { users: AdminUser[]; label?: string; action?: React.ReactNode }) {
  const columns: AdminColumn<AdminUser>[] = [
    {
      key: "user",
      header: "User",
      render: (u) => (
        <div className="flex items-center gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-teal text-[11px] font-semibold text-white">
            {initials(u.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{u.name}</p>
            <p className="truncate text-xs text-muted-foreground">{u.email}</p>
          </div>
        </div>
      ),
    },
    { key: "plan", header: "Plan", render: (u) => <span className="font-mono text-xs">{u.plan}</span> },
    { key: "status", header: "Status", render: (u) => <StatusPill tone={STATUS_TONE[u.status]}>{u.status}</StatusPill> },
    {
      key: "credits",
      header: "Credits used",
      className: "text-right",
      render: (u) => <span className="block text-right font-mono text-xs tabular-nums">{u.creditsUsed.toLocaleString()}</span>,
    },
    {
      key: "active",
      header: "Last active",
      className: "hidden lg:table-cell",
      render: (u) => (
        <span className="hidden font-mono text-[10px] uppercase text-muted-foreground lg:block">
          {formatDateTime(u.lastActive)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-10",
      render: (u) => (
        <Link
          to={`/admin/users/${u.id}`}
          className="grid size-7 place-items-center rounded-[3px] border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label={`View ${u.name}`}
        >
          <ArrowUpRight className="size-3.5" strokeWidth={1.6} />
        </Link>
      ),
    },
  ];

  return <AdminTable label={label} action={action} columns={columns} rows={users} empty="No users match this filter." />;
}
