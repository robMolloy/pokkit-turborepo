import {
  LoggedInRouteProtector,
  LoggedOutRouteProtector,
  SignInWithPasswordForm,
  SignUpWithPasswordForm,
  useReactiveAuthStore,
} from "@repo/pokkit-auth";
import { pb } from "../config/pocketbaseConfig";

const IndexPage = () => {
  const authStore = useReactiveAuthStore();

  return (
    <div>
      <h1>Pokkit Whisper</h1>
      <br />

      <LoggedInRouteProtector>
        <div>Signed in</div>
      </LoggedInRouteProtector>

      <LoggedOutRouteProtector>
        <>
          <h2>Sign In</h2>
          <SignInWithPasswordForm pb={pb} />

          <br />

          <h2>Sign Up</h2>
          <SignUpWithPasswordForm pb={pb} />
        </>
      </LoggedOutRouteProtector>

      <br />
      <pre>{JSON.stringify({ authStore }, undefined, 2)}</pre>
    </div>
  );
};

export default IndexPage;
