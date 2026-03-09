import { useEffect } from "react";
import { useReactiveAuthStore } from "../hooks/reactiveAuthStore";
import { TAuthStore } from "../utils";

export const SignedInRouteProtector = (
  p: (
    | { children: React.ReactNode }
    | { childrenWithAuthStore?: (x: TAuthStore) => React.ReactNode }
  ) & {
    ifIsSignedOut?: () => void;
    ifUserIsVerified?: () => void;
    ifUserIsUnverified?: () => void;
  },
) => {
  const reactiveAuthStore = useReactiveAuthStore();

  useEffect(() => {
    // leading reactiveAuthStore check doesn't run fn if signed out or loading state
    if (reactiveAuthStore && reactiveAuthStore?.record.verified) p.ifUserIsVerified?.();
    if (reactiveAuthStore && !reactiveAuthStore?.record.verified) p.ifUserIsUnverified?.();
    if (reactiveAuthStore === null) p.ifIsSignedOut?.();
  }, [reactiveAuthStore?.record.verified]);

  if (!!reactiveAuthStore)
    return <>{"children" in p ? p.children : p.childrenWithAuthStore?.(reactiveAuthStore)}</>;
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

export const VerifiedUserRouteProtector = (p: { children: React.ReactNode }) => {
  const reactiveAuthStore = useReactiveAuthStore();

  if (!!reactiveAuthStore?.record.verified) return <>{p.children}</>;
  return <></>;
};

export const UnverifiedUserRouteProtector = (p: {
  children: React.ReactNode;
  ifUserIsVerified?: () => void;
  ifUserIsUnverified?: () => void;
}) => {
  const reactiveAuthStore = useReactiveAuthStore();

  useEffect(() => {
    // leading reactiveAuthStore check rules out signed out and loading states
    if (reactiveAuthStore && reactiveAuthStore?.record.verified) p.ifUserIsVerified?.();
    if (reactiveAuthStore && !reactiveAuthStore?.record.verified) p.ifUserIsUnverified?.();
  }, [reactiveAuthStore?.record.verified]);

  if (!reactiveAuthStore?.record.verified) return <>{p.children}</>;
  return <></>;
};
