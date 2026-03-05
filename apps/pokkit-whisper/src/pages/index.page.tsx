import {
  SignInWithPasswordForm,
  useReactiveAuthStore,
  useReactiveAuthStoreSync,
} from "@repo/pokkit-auth";
import PocketBase from "pocketbase";

const pb = new PocketBase("http://127.0.0.1:8090");

const IndexPage = () => {
  useReactiveAuthStoreSync({ pb });
  const authStore = useReactiveAuthStore();

  return (
    <div>
      <h1>Pokkit Whisper</h1>
      <SignInWithPasswordForm pb={pb} />
      <pre>{JSON.stringify({ authStore }, undefined, 2)}</pre>
    </div>
  );
};

export default IndexPage;
