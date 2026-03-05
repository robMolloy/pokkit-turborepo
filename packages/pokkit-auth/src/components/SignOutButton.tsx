import { Button } from "@repo/pokkit-components";
import PocketBase from "pocketbase";

export const SignOutButton = (p: {
  pb: PocketBase;
  onSignInSuccess?: (messages: string[]) => void;
  onSignInError?: (messages: string[]) => void;
}) => {
  return (
    <Button variant="secondary" type="submit" onClick={() => p.pb.authStore.clear()}>
      Sign Out
    </Button>
  );
};
