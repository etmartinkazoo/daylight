import "./daylight.css";
import { createInertiaApp } from "@inertiajs/react";
import { createRoot } from "react-dom/client";
import PersistentLayout from "@/layouts/persistent-layout";

createInertiaApp({
  layout: () => PersistentLayout,
  resolve: (name) => {
    const pages = import.meta.glob("../pages/**/*.jsx", { eager: true });
    // Controllers render "daylight/errors/index", strip "daylight/" prefix
    const stripped = name.replace(/^daylight\//, "");
    const page = pages[`../pages/${stripped}.jsx`];
    if (!page) {
      throw new Error(`[Daylight] Page not found: ${name}`);
    }
    return page;
  },
  setup({ el, App, props }) {
    if (el) {
      createRoot(el).render(<App {...props} />);
    }
  },
  progress: {
    color: "#f59e0b",
  },
});
