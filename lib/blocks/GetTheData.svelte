<script>
    // external props
    export let props;
    const { get, __, purifyHtml } = props;
    $: ({ chart, dwChart, data, theme } = props);

    // internal props
    let dataLink;
    let hidden = false;
    let href = 'data';
    let download = '';

    $: {
        // update data link to point to edited dataset

        if (dwChart && dwChart.dataset()) {
            const csv = dwChart.dataset().toCSV && dwChart.dataset().toCSV();

            if (!csv || (csv && csv.trim && csv.trim() === 'X.1')) {
                hidden = true;
            } else {
                if (window.navigator.msSaveOrOpenBlob) {
                    const blobObject = new Blob([csv]);
                    dataLink.addEventListener('click', event => {
                        window.navigator.msSaveOrOpenBlob(blobObject, 'data-' + chart.id + '.csv');
                        event.preventDefault();
                        return false;
                    });
                } else {
                    download = 'data-' + chart.id + '.csv';
                    href =
                        'data:application/octet-stream;charset=utf-8,' +
                        encodeURIComponent('\uFEFF' + csv);
                }
            }
        }
    }

    $: externalData = get(dwChart, 'externalData');
    $: caption = get(theme, 'data.options.blocks.get-the-data.data.caption');
</script>

{#if !hidden}
    <a
        this="dataLink"
        class="dw-data-link"
        aria-label="{__(caption)}: {purifyHtml(chart.title, '')}"
        {download}
        target={externalData ? '_blank' : '_self'}
        href={externalData || href}>
        {__(caption)}
    </a>
{/if}
