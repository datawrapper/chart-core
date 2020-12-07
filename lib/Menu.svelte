<script>
    import BlocksRegion from './BlocksRegion.svelte';

    export let id;
    export let name;
    export let blocks;

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
        margin: 10px 10px 3px 3px;
        width: 20px;
        padding: 5px 0px;

        border-top: 1px solid black;
        border-bottom: 1px solid black;
    }

    .menu div {
        height: 1px;
        width: 100%;
        background: black;
    }

    .menu:hover {
        border-top-color: #ccc;
        border-bottom-color: #ccc;
    }

    .menu:hover div {
        background: #ccc;
    }

    .menu-content {
        position: absolute;
        top: 40px;
        right: 0px;
        background: white;
        border: 1px solid #ccc;
        z-index: 1;
    }

    :global(.menu-content > .dw-chart-menu > *) {
        padding: 10px;
        border-bottom: 1px solid #ccc;
    }

    :global(.menu-content > .dw-chart-menu > *:last-child) {
        border-bottom: none;
    }
</style>

<svelte:window on:click={hide} />

{#if blocks.length}
    <div class="menu tooltip" on:click|stopPropagation={toggle}>
        <div />
    </div>

    <div class="menu-content tooltip" on:click|stopPropagation class:hidden={!open}>
        <BlocksRegion {id} {name} {blocks} />
    </div>
{/if}
