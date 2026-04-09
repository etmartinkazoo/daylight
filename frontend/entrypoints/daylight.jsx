import "./daylight.css";
import { createInertiaApp } from "@inertiajs/react";
import { createRoot } from "react-dom/client";
import PersistentLayout from "@/layouts/persistent-layout";

createInertiaApp({
  resolve: (name) => {
    const pages = import.meta.glob("../pages/**/*.jsx", { eager: true });
    // Controllers render "daylight/errors/index", strip "daylight/" prefix
    const stripped = name.replace(/^daylight\//, "");
    const page = pages[`../pages/${stripped}.jsx`];
    if (!page) {
      throw new Error(`[Daylight] Page not found: ${name}`);
    }

    // Set PersistentLayout as default for all pages (handles Toaster + ThemeProvider).
    // Pages can override by setting their own .layout property.
    page.default.layout ??= (page) => <PersistentLayout>{page}</PersistentLayout>;

    return page;
  },
  setup({ el, App, props }) {
    if (el) {
      createRoot(el).render(<App {...props} />);
    }
  },
  defaults: {
    future: {
      useDataInertiaHeadAttribute: true,
    },
  },
  progress: {
    color: "#f59e0b",
  },
});
