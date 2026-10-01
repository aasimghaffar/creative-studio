import { useNavigate } from "react-router";
import { LogOut, Settings, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore, useAuthUser } from "../stores/auth-store";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Avatar dropdown for the app shell: identity + sign out. */
export function UserMenu() {
  const user = useAuthUser();
  const signOut = useAuthStore((s) => s.signOut);
  const navigate = useNavigate();

  if (!user) return null;

  async function handleSignOut() {
    await signOut();
    navigate("/auth/sign-in", { replace: true });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Account menu">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt=""
              className="size-8 rounded-full border border-bp-line object-cover"
              draggable={false}
            />
          ) : (
            <span className="grid size-8 place-items-center rounded-full bg-teal text-xs font-semibold text-white">
              {initials(user.name)}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <p className="text-sm font-medium">{user.name}</p>
          <p className="text-xs font-normal text-muted-foreground">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/app/profile")}>
          <UserIcon />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/app/settings")}>
          <Settings />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
