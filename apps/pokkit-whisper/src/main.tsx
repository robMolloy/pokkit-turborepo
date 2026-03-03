import { useReactiveAuthStore, useReactiveAuthStoreSync } from "@repo/pokkit-auth";
import PocketBase from "pocketbase";
import { createRoot } from "react-dom/client";
import "./style.css";

const pb = new PocketBase("http://127.0.0.1:8090");

const App = () => {
  useReactiveAuthStoreSync({ pb });
  const authStore = useReactiveAuthStore();
  return (
    <div>
      <button
        onClick={async () => {
          const resp = await pb.health.check();
          console.log(resp);
        }}
      >
        check health
      </button>
      <button
        onClick={() => {
          pb.collection("users").create({
            email: "admin@admin.com",
            password: "admin@admin.com",
            passwordConfirm: "admin@admin.com",
          });
        }}
      >
        create user
      </button>
      <button
        onClick={() => {
          pb.collection("users").authWithPassword("admin@admin.com", "admin@admin.com");
        }}
      >
        log in
      </button>
      <button
        onClick={() => {
          pb.authStore.clear();
        }}
      >
        log out
      </button>
      <button
        onClick={() => {
          if (!authStore?.record.id) return;

          pb.collection("users").update(authStore.record.id, {
            name: `updated name ${Math.floor(Math.random() * 1000)}`,
          });
        }}
      >
        update user
      </button>
      <pre>{JSON.stringify(authStore, undefined, 2)}</pre>
    </div>
  );
};

createRoot(document.getElementById("app")!).render(<App />);
