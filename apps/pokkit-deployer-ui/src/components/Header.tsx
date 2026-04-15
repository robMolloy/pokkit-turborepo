import { envConfig } from "@/config/envConfig";
import { PocketBase } from "@/config/pocketbaseConfig";
import { useUserBalanceRecordStore } from "@/modules/instanceRecords/dbUserBalanceRecord";
import { SignedInRouteProtector, SignedOutRouteProtector } from "@repo/pokkit-auth";
import { Header as HeaderTemplate, ThemeToggle } from "@repo/pokkit-components";
import { Button } from "@repo/pokkit-shadcn";
import { useNavigate } from "react-router-dom";
import { ProfileDropdown } from "./ProfileDropdown";

export const Header = (p: { pb: PocketBase }) => {
  const navigate = useNavigate();
  const userBalanceRecordStore = useUserBalanceRecordStore();

  return (
    <HeaderTemplate
      Left={<div>{envConfig.VITE_APP_DISPLAY_NAME}</div>}
      Right={
        <span className="flex gap-3 items-center">
          <SignedInRouteProtector>
            <span>{userBalanceRecordStore.data?.tokenAmount ?? 0} tokens</span>
          </SignedInRouteProtector>

          <ThemeToggle />

          <SignedInRouteProtector
            childrenWithAuthStore={(authDataStore) => (
              <ProfileDropdown pb={p.pb} user={authDataStore.record} />
            )}
          />
          <SignedOutRouteProtector>
            <Button onClick={() => navigate("/auth/sign-in")}>Sign In</Button>
          </SignedOutRouteProtector>
        </span>
      }
    />
  );
};
