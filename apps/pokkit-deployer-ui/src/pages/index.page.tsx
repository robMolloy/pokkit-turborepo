import { envConfig } from "@/config/envConfig";
import {
  SignedInRouteProtector,
  SignedOutRouteProtector,
  useGlobalUserPermissionStore,
} from "@repo/pokkit-auth";
import { useNavigate } from "react-router-dom";

const IndexPage = () => {
  const navigate = useNavigate();
  const globalUserPermissionStore = useGlobalUserPermissionStore();

  return (
    <div className="p-6">
      <h1 className="text-xl">{envConfig.VITE_APP_DISPLAY_NAME}</h1>

      <br />

      <pre>{JSON.stringify({ globalUserPermissionStore }, undefined, 2)}</pre>

      <SignedInRouteProtector ifUserIsUnverified={() => navigate("/auth/verification-request")}>
        <br />
        signed in
      </SignedInRouteProtector>

      <SignedOutRouteProtector>
        <div>You are signed out</div>
        <div>Log in to enjoy the app</div>
      </SignedOutRouteProtector>
    </div>
  );
};

export default IndexPage;
