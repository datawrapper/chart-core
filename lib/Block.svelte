<script>
    import { clean } from './shared.mjs';

    export let block;
</script>

{#if block.prepend}
    <span class="prepend">
        {@html clean(block.prepend)}
    </span>
{/if}
<span class="block-inner">
    <svelte:component this={block.component} props={block.props} />
</span>
{#if block.append}
    <span class="append">
        {@html clean(block.append)}
    </span>
{/if}
