import { useReactiveAuthStore, useReactiveAuthStoreSync } from "@repo/pokkit-auth";
import { Button, Input } from "@repo/pokkit-components";
import "@repo/pokkit-components/styles.css";
import PocketBase from "pocketbase";
import { createRoot } from "react-dom/client";

const pb = new PocketBase("http://127.0.0.1:8090");

const App = () => {
  useReactiveAuthStoreSync({ pb });
  const authStore = useReactiveAuthStore();

  return (
    <div className="bg-primary">
      <div className="flex gap-4">
        <button>html</button>
        <Button>blank</Button>
        <Button size="default">default</Button>
        <Button size="icon">destructive</Button>
        <Button size="icon-lg" className="text-primary-foreground">
          ghost
        </Button>
        <Button size="icon-sm" className="text-primary-foreground">
          link
        </Button>
        <Button size="icon-xs">outline</Button>
        <Button size="lg">secondary</Button>
        <Button size="sm">secondary</Button>
        <Button size="xs">secondary</Button>
      </div>
      <div className="flex gap-4">
        <button>html</button>
        <Button>blank</Button>
        <Button variant="default">default</Button>
        <Button variant="destructive">destructive</Button>
        <Button variant="ghost" className="text-primary-foreground">
          ghost
        </Button>
        <Button variant="link" className="text-primary-foreground">
          link
        </Button>
        <Button variant="outline">outline</Button>
        <Button variant="secondary">secondary</Button>
      </div>
      <div className="flex gap-4 bg-secondary">
        <button>html</button>
        <Button>blank</Button>
        <Button variant="default">default</Button>
        <Button variant="destructive">destructive</Button>
        <Button variant="ghost">ghost</Button>
        <Button variant="link">link</Button>
        <Button variant="outline">outline</Button>
        <Button variant="secondary">secondary</Button>
      </div>
      <Input placeholder="placeholder" />
      <input placeholder="placeholder" />

      <br />
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
      </div>
      <pre className="text-primary-foreground">{JSON.stringify(authStore, undefined, 2)}</pre>
    </div>
  );
};

createRoot(document.getElementById("app")!).render(<App />);
