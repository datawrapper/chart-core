<script>
    import { onMount } from 'svelte';
    // external props
    export let props;
    const { get, __, purifyHtml } = props;
    $: ({ chartAttrs, chart, data, theme } = props);

    // internal props
    $: getTheData = get(theme, 'data.options.footer.getTheData', { enabled: false });

    let dataLink;
    let hidden = false;
    let href = 'data';
    let download = '';

    $: {
        // update data link to point to edited dataset

        if (chart && chart.dataset()) {
            const csv = chart.dataset().toCSV && chart.dataset().toCSV();

            if (!csv || (csv && csv.trim && csv.trim() === 'X.1')) {
                hidden = true;
            } else {
                if (window.navigator.msSaveOrOpenBlob) {
                    const blobObject = new Blob([csv]);
                    dataLink.addEventListener('click', event => {
                        window.navigator.msSaveOrOpenBlob(
                            blobObject,
                            'data-' + chartAttrs.id + '.csv'
                        );
                        event.preventDefault();
                        return false;
                    });
                } else {
                    download = 'data-' + chartAttrs.id + '.csv';
                    href =
                        'data:application/octet-stream;charset=utf-8,' +
                        encodeURIComponent('\uFEFF' + csv);
                }
            }
        }
    }

    $: externalData = get(chart, 'externalData');
</script>

{#if getTheData.enabled && !hidden}
    <a
        this="dataLink"
        class="dw-data-link"
        aria-label="{__(getTheData.caption)}: {purifyHtml(chartAttrs.title, '')}"
        {download}
        target={externalData ? '_blank' : '_self'}
        href={externalData || 'data'}>
        {__(getTheData.caption)}
    </a>
{/if}
