import { Button } from "@repo/pokkit-shadcn";
import PocketBase, { AuthMethodsList } from "pocketbase";
import { FaApple, FaGithub, FaGoogle } from "react-icons/fa6";
import { signUpOrSignInWithOAuth2 } from "../utils";
import { IconType } from "react-icons";

const providerIconMap: { [key: string]: IconType } = {
  apple: FaApple,
  google: FaGoogle,
  github: FaGithub,
};

export const SignUpOrSignInOAuth2Options = (p: {
  pb: PocketBase;
  authMethodsList: AuthMethodsList;
}) => {
  return (
    <div className="flex flex-col gap-4">
      {p.authMethodsList.oauth2.providers.map((x) => (
        <Button
          key={x.name}
          className="w-full"
          onClick={() => signUpOrSignInWithOAuth2({ pb: p.pb, provider: x.name })}
        >
          {(() => {
            const Icon = providerIconMap[x.name];
            if (Icon) return <Icon className="mr-2" />;
          })()}
          Sign up with {x.displayName}
        </Button>
      ))}
    </div>
  );
};
