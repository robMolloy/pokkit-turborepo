import React from "react";
import Layout from "@theme/Layout";
const arr = [1, 2, 3, 4, 5];
export default function MyReactPage() {
  const num = arr[18];
  const sum = (num ?? 0) + 10;
  return (
    <Layout>
      <h1>My React page {sum}</h1>
      <p>This is a react page</p>
    </Layout>
  );
}
