import { envConfig } from "@/config/envConfig";
import { useInstanceRecordsStore } from "@/modules/instanceRecords/dbInstanceRecords";
import { SignedInRouteProtector, SignedOutRouteProtector } from "@repo/pokkit-auth";
import { useNavigate } from "react-router-dom";

const IndexPage = () => {
  const navigate = useNavigate();
  const instanceRecordsStore = useInstanceRecordsStore();

  return (
    <div className="p-6">
      <h1 className="text-xl">{envConfig.VITE_APP_DISPLAY_NAME}</h1>

      <br />

      <pre>{JSON.stringify({ instanceRecordsStore }, undefined, 2)}</pre>

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
