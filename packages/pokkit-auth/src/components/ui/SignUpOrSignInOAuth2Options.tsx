import { Button } from "@repo/pokkit-shadcn";
import PocketBase, { AuthMethodsList } from "pocketbase";
import {
  SiApple,
  SiGoogle,
  SiGithub,
  SiFacebook,
  SiInstagram,
  SiGitlab,
  SiBitbucket,
  SiGitee,
  SiGitea,
  SiDiscord,
  SiX,
  SiKakaotalk,
  SiVk,
  SiLinear,
  SiNotion,
  SiBox,
  SiSpotify,
  SiTrakt,
  SiTwitch,
  SiPatreon,
  SiStrava,
  SiWakatime,
  SiLivechat,
  SiMaildotru,
  SiOpenid,
} from "react-icons/si";
import { FaMicrosoft, FaYandex, FaCalendar, FaComment } from "react-icons/fa6";
import { signUpOrSignInWithOAuth2 } from "../../lib";
import { IconType } from "react-icons";

const providerIconMap: { [key: string]: IconType } = {
  apple: SiApple,
  google: SiGoogle,
  github: SiGithub,
  facebook: SiFacebook,
  instagram: SiInstagram,
  gitlab: SiGitlab,
  bitbucket: SiBitbucket,
  gitee: SiGitee,
  gitea: SiGitea,
  discord: SiDiscord,
  twitter: SiX,
  x: SiX,
  kakao: SiKakaotalk,
  vk: SiVk,
  linear: SiLinear,
  notion: SiNotion,
  microsoft: FaMicrosoft, // not available as simple icons
  yandex: FaYandex, // not available as simple icons
  monday: FaCalendar, // not available as simple icons
  lark: FaComment, // not available as simple icons
  box: SiBox,
  spotify: SiSpotify,
  trakt: SiTrakt,
  twitch: SiTwitch,
  patreon: SiPatreon,
  strava: SiStrava,
  wakatime: SiWakatime,
  livechat: SiLivechat,
  mailcow: SiMaildotru,
  planningcenter: SiOpenid, // Using OpenID as fallback
  oidc: SiOpenid,
  oidc2: SiOpenid,
  oidc3: SiOpenid,
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
            return Icon ? <Icon className="mr-2" /> : <></>;
          })()}
          Sign up with {x.displayName}
        </Button>
      ))}
    </div>
  );
};
