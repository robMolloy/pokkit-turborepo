import React from "react";

export const Button = (p: { className?: string; children?: React.ReactNode }) => {
  const { className, children } = p;
  return <button className={className}>{children}</button>;
};
