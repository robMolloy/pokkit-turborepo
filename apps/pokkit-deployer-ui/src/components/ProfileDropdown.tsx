import { PocketBase } from "@/config/pocketbaseConfig";
import { getInitialsFromString } from "@/lib/stringUtils";
import { signOut, TUser } from "@repo/pokkit-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/pokkit-shadcn";
import { useNavigate } from "react-router-dom";

export const ProfileDropdown = (p: { pb: PocketBase; user: TUser }) => {
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="h-9 w-9 rounded-full bg-muted text-foreground font-medium text-sm flex items-center justify-center hover:bg-muted/80 transition-colors focus:outline-none focus:ring-2 focus:ring-ring">
          {getInitialsFromString(p.user.name)}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{p.user.name}</p>
            <p className="text-xs text-muted-foreground">{p.user.email}</p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => navigate("/auth/email-change-request")}>
          Request Email Change Token
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => signOut({ pb: p.pb })} className="text-destructive">
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
