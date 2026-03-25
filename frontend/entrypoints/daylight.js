import { createInertiaApp } from "@inertiajs/svelte";
import { mount } from "svelte";

createInertiaApp({
  progress: false,
  resolve: (name) => {
    const pages = import.meta.glob("../pages/**/*.svelte", { eager: true });
    // Strip "daylight/" prefix — engine controllers render "daylight/index"
    const stripped = name.replace(/^daylight\//, "");
    const normalizedName = stripped
      .split("/")
      .map((s) => s.charAt(0).toLowerCase() + s.slice(1))
      .join("/");
    const page =
      pages[`../pages/${normalizedName}.svelte`] ||
      pages[`../pages/${stripped}.svelte`] ||
      pages[`../pages/${name}.svelte`];
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
