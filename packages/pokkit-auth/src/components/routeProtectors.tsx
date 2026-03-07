import { useEffect } from "react";
import { useReactiveAuthStore } from "../hooks/reactiveAuthStore";

export const SignedInRouteProtector = (p: { children: React.ReactNode }) => {
  const reactiveAuthStore = useReactiveAuthStore();

  if (!!reactiveAuthStore) return <>{p.children}</>;
  return <></>;
};

export const SignedOutRouteProtector = (p: {
  children: React.ReactNode;
  ifIsSignedIn?: () => void;
}) => {
  const reactiveAuthStore = useReactiveAuthStore();

  useEffect(() => {
    if (!!reactiveAuthStore?.record.id) p.ifIsSignedIn?.();
  }, [reactiveAuthStore?.record.id]);

  if (reactiveAuthStore === null) return <>{p.children}</>;
  return <></>;
};

export const LoadingRouteProtector = (p: { children: React.ReactNode }) => {
  const reactiveAuthStore = useReactiveAuthStore();

  if (reactiveAuthStore === undefined) return <>{p.children}</>;
  return <></>;
};
