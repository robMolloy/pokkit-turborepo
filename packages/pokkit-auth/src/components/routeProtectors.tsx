import { useReactiveAuthStore } from "../hooks/reactiveAuthStore";

export const LoggedInRouteProtector = (p: { children: React.ReactNode }) => {
  const reactiveAuthStore = useReactiveAuthStore();

  if (!!reactiveAuthStore?.record) return <>{p.children}</>;
  return <></>;
};

export const LoggedOutRouteProtector = (p: { children: React.ReactNode }) => {
  const reactiveAuthStore = useReactiveAuthStore();

  if (reactiveAuthStore === null) return <>{p.children}</>;
  return <></>;
};

export const LoadingRouteProtector = (p: { children: React.ReactNode }) => {
  const reactiveAuthStore = useReactiveAuthStore();

  if (reactiveAuthStore === undefined) return <>{p.children}</>;
  return <></>;
};
