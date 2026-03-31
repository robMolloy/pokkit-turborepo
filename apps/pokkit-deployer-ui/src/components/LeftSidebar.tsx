import { PocketBase } from "@/config/pocketbaseConfig";
import { SignedInRouteProtector, SignedOutRouteProtector, signOut } from "@repo/pokkit-auth";
import { LeftSidebar as LeftSidebarTemplate, SidebarButton } from "@repo/pokkit-components";
import { useLocation, useNavigate } from "react-router-dom";

export const LeftSidebar = (p: { pb: PocketBase }) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <LeftSidebarTemplate
      top={
        <>
          <SidebarButton href="/" isHighlighted={location.pathname === "/"} iconName="Home">
            Home
          </SidebarButton>
        </>
      }
      middle={
        <>
          <SidebarButton
            href="/page1"
            isHighlighted={location.pathname === "/page1"}
            iconName="Home"
          >
            Page 1
          </SidebarButton>
          <SidebarButton
            href="/page2"
            isHighlighted={location.pathname === "/page2"}
            iconName="Home"
          >
            Page 2
          </SidebarButton>
          <SidebarButton
            href="/page3"
            isHighlighted={location.pathname === "/page3"}
            iconName="Home"
          >
            Page 3 hhhhhhhhhhhhhhhhhhhhhhhhhhh
          </SidebarButton>
        </>
      }
      bottom={
        <>
          <SignedInRouteProtector>
            <SidebarButton
              iconName="LogOut"
              onClick={() => signOut({ pb: p.pb })}
              isHighlighted={false}
            >
              Sign Out
            </SidebarButton>
          </SignedInRouteProtector>

          <SignedOutRouteProtector>
            <SidebarButton
              iconName="UserPlus"
              onClick={() => navigate("/auth/sign-up")}
              isHighlighted={location.pathname.startsWith("/auth/sign-up")}
            >
              Sign Up
            </SidebarButton>
            <SidebarButton
              iconName="LogIn"
              onClick={() => navigate("/auth/sign-in")}
              isHighlighted={location.pathname.startsWith("/auth/sign-in")}
            >
              Sign In
            </SidebarButton>
          </SignedOutRouteProtector>
        </>
      }
    />
  );
};
