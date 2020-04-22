<script>
    import { clean } from './shared';

    export let name;
    export let blocks;
</script>

{#if blocks.length}
    <div class={name}>
        {#each blocks as block}
            <div class="block {block.id}-block" class:export-text={block.exportText}>
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
            </div>
        {/each}
    </div>
{/if}
