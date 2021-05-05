<script>
    // external props
    export let props;
    const { get, __, purifyHtml } = props;
    $: ({ chart, theme, config } = props);

    // internal props
    $: forkable = get(chart, 'forkable', false);
    $: showEditInDatawrapperLink = get(chart, 'metadata.publish.edit-in-datawrapper', false);

    function editInDatawrapper() {
        const form = document.createElement('form');
        form.setAttribute('method', 'post');
        form.setAttribute('target', '_blank');
        form.setAttribute('action', `//${config.frontendDomain}/create/`);
        const input = document.createElement('input');
        input.setAttribute('type', 'hidden');
        input.setAttribute('name', 'template');
        input.setAttribute('value', chart.id);
        form.appendChild(input);
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
    }
</script>

{#if forkable && showEditInDatawrapperLink}
    <a href="#/edit-in-datawrapper" on:click|preventDefault={editInDatawrapper}>
        Edit in Datawrapper
    </a>
{/if}
