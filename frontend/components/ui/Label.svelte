<script>
let { htmlFor, children, ...rest } = $props();
</script>

<label class="label" for={htmlFor} {...rest}>
  {@render children()}
</label>

<style>
  .label {
    font-size: 0.8125rem;
    font-weight: 500;
    line-height: 1;
    color: var(--color-fg);
    letter-spacing: -0.005em;
  }
</style>
