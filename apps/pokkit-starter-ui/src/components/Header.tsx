import { envConfig } from "@/config/envConfig";
import { PocketBase } from "@/config/pocketbaseConfig";
import { useReactiveAuthStore } from "@repo/pokkit-auth";
import { Header as HeaderTemplate, ThemeToggle } from "@repo/pokkit-components";
import { Button } from "@repo/pokkit-shadcn";
import { useNavigate } from "react-router-dom";
import { ProfileDropdown } from "./ProfileDropdown";

export const Header = (p: { pb: PocketBase }) => {
  const authDataStore = useReactiveAuthStore();

  const navigate = useNavigate();

  return (
    <HeaderTemplate
      Left={<div>{envConfig.VITE_APP_DISPLAY_NAME}</div>}
      Right={
        <span className="flex gap-2">
          <ThemeToggle />
          {authDataStore ? (
            <ProfileDropdown pb={p.pb} user={authDataStore.record} />
          ) : (
            <Button onClick={() => navigate("/auth/sign-in")}>Sign In</Button>
          )}
        </span>
      }
    />
  );
};
