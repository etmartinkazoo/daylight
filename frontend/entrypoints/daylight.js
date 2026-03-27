import { createInertiaApp } from "@inertiajs/svelte";
import { mount } from "svelte";

createInertiaApp({
  progress: false,
  resolve: (name) => {
    const pages = import.meta.glob("../pages/**/*.svelte", { eager: true });
    // Controllers render "daylight/errors/index", "daylight/incidents/show", etc.
    // Strip "daylight/" prefix to get "errors/index", "incidents/show"
    const stripped = name.replace(/^daylight\//, "");
    const page = pages[`../pages/${stripped}.svelte`];
    if (!page) {
      throw new Error(`[Daylight] Page not found: ${name}`);
    }
    return { default: page.default };
  },
  setup({ el, App, props }) {
    if (el) {
      mount(App, { target: el, props });
    }
  },
});
