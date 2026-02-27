import React from "react";

export const Button = (p: { appName?: string; className?: string; children?: React.ReactNode }) => {
  return <button {...p}>button</button>;
};
