import { envConfig } from "@/config/envConfig";
import { SignedInRouteProtector, SignedOutRouteProtector } from "@repo/pokkit-auth";
import { useNavigate } from "react-router-dom";

const IndexPage = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6">
      <h1 className="text-xl">{envConfig.VITE_APP_DISPLAY_NAME}</h1>

      <br />

      <SignedInRouteProtector ifUserIsUnverified={() => navigate("/auth/verification-request")}>
        <br />
      </SignedInRouteProtector>

      <SignedOutRouteProtector>
        <div>You are signed out</div>
        <div>Log in to enjoy the app</div>
      </SignedOutRouteProtector>
    </div>
  );
};

export default IndexPage;
