<script>
let { orientation = "horizontal" } = $props();
</script>

<div class="separator" class:vertical={orientation === "vertical"}></div>

<style>
  .separator {
    height: 1px;
    background: var(--color-border);
    width: 100%;

    &.vertical {
      height: auto;
      width: 1px;
      align-self: stretch;
    }
  }
</style>
