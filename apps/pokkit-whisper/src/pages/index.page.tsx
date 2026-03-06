import {
  SignedInRouteProtector,
  SignedOutRouteProtector,
  useReactiveAuthStore,
} from "@repo/pokkit-auth";

const IndexPage = () => {
  const authStore = useReactiveAuthStore();

  return (
    <div>
      <h1>Pokkit Whisper</h1>
      <br />

      <SignedInRouteProtector>
        <>
          <div>You are signed in</div>
          <div>Enjoy the app</div>
        </>
      </SignedInRouteProtector>

      <SignedOutRouteProtector>
        <>
          <div>You are signed out</div>
          <div>Log in to enjoy the app</div>
          {/* <SignInWithPasswordForm pb={pb} />

          <br />

          <h2>Sign Up</h2>
          <SignUpWithPasswordForm pb={pb} /> */}
        </>
      </SignedOutRouteProtector>

      <br />
      <pre>{JSON.stringify({ authStore }, undefined, 2)}</pre>
    </div>
  );
};

export default IndexPage;
