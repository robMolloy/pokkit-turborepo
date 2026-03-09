import {
  SignedInRouteProtector,
  SignedOutRouteProtector,
  useReactiveAuthStore,
} from "@repo/pokkit-auth";
import { useNavigate } from "react-router-dom";

const IndexPage = () => {
  const authStore = useReactiveAuthStore();
  const navigate = useNavigate();

  return (
    <div>
      <h1>Pokkit Whisper</h1>
      <br />

      <SignedInRouteProtector ifUserIsUnverified={() => navigate("/auth/verification-request")}>
        <>
          <div>You are signed in</div>
          <div>Enjoy the app</div>
        </>
      </SignedInRouteProtector>

      <SignedOutRouteProtector>
        <>
          <div>You are signed out</div>
          <div>Log in to enjoy the app</div>
        </>
      </SignedOutRouteProtector>

      <br />
      <pre>{JSON.stringify({ authStore }, undefined, 2)}</pre>
    </div>
  );
};

export default IndexPage;
