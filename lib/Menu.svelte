<script>
    import BlocksRegion from './BlocksRegion.svelte';

    export let id;
    export let name;
    export let blocks;
    export let props;

    let open = false;

    function toggle() {
        open = !open;
    }

    function hide() {
        open = false;
    }
</script>

<style>
    .menu {
        cursor: pointer;

        position: absolute;
        top: 0px;
        right: 0px;
    }

    .ha-menu {
        margin: 4px 10px 3px 3px;
        width: 18px;
        padding: 3px 0px;

        border-top: 2px solid black;
        border-bottom: 2px solid black;
    }

    .ha-menu div {
        height: 2px;
        width: 100%;
        background: black;
    }

    .ha-menu:hover {
        border-top-color: #ccc;
        border-bottom-color: #ccc;
    }

    .ha-menu:hover div {
        background: #ccc;
    }

    .menu-content {
        position: absolute;
        top: 30px;
        right: 4px;
        background: white;
        border: 1px solid #ccc;
        z-index: 100;
        box-shadow: 0px 0px 4px 1px rgba(0, 0, 0, 0.1);
    }

    :global(.menu-content > .dw-chart-menu a) {
        padding: 10px;
        display: block;
        color: initial;
        border-bottom: 1px solid #ccc;
    }

    :global(.menu-content > .dw-chart-menu a:hover) {
        background: rgba(0, 0, 0, 0.05);
    }

    :global(.menu-content > .dw-chart-menu .block:last-child a) {
        border-bottom: none;
    }
</style>

<svelte:window on:click={hide} />

{#if blocks.length}
    <div class:ha-menu={!props.icon} class="menu tooltip" on:click|stopPropagation={toggle}>
        {#if props.icon}
            {@html props.icon}
        {:else}
            <div />
        {/if}
    </div>

    <div class="menu-content tooltip" on:click|stopPropagation class:hidden={!open}>
        <BlocksRegion {id} {name} {blocks} />
    </div>
{/if}
