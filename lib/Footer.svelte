<script>
    export let chartId;
    export let data = {};
    export let caption = 'chart';
    export let source = '';
    export let embedCode = '';
    export let byline = '';
    export let chartBasedOn;
    export let __;

    let modalIsHidden = true;

    function handleClick(e) {
        e.preventDefault();
        modalIsHidden = !modalIsHidden;
    }

    function handleTextareaClick(e) {
        e.target.focus();
        e.target.select();
    }

    // show separator in all blocks except for the first one
    let isFirstBlock = true;

    function separator() {
        if (isFirstBlock) {
            isFirstBlock = false;
            return '';
        }
        return '<span class="separator"></span>';
    }

    function capitalize(str) {
        if (typeof str !== 'string') return '';
        return `${str.charAt(0).toUpperCase()}${str.slice(1)}`;
    }

    function getByline(byline, chartBasedOn) {
        if (!byline && !chartBasedOn) return;

        let markup = '<span class="chart-byline">';

        if (byline) {
            markup += byline;
        }
        if (chartBasedOn) {
            const needBracket = chartBasedOn && byline;
            markup += `${byline ? ' ' : ''}${needBracket ? '(' : ''}${capitalize(
                __(chartBasedOn.caption)
            )} ${chartBasedOn.byline}${needBracket ? ')' : ''}`;
        }

        markup += '</span>';
        return markup;
    }
</script>

{#if byline || chartBasedOn}
    <span class="footer-block byline-block">
        {@html separator()}
        {#if byline}
            <span class="byline-caption">
                {#if caption === 'chart'}{__(data.chartCaption)}{/if}
                {#if caption === 'map'}{__(data.mapCaption)}{/if}
                {#if caption === 'table'}{__(data.tableCaption)}{/if}
            </span>
        {/if}
        {@html getByline(byline, chartBasedOn)}
    </span>
{/if}

{#if source.name && data.sourcePosition !== 'above-footer'}
    <span class="footer-block source-block">
        {@html separator()}
        {__(data.sourceCaption)}:
        {#if source.url}
            <a class="source" target="_blank" rel="noopener noreferrer" href={source.url}>
                {source.name}
            </a>
        {:else}{source.name}{/if}
    </span>
{/if}

<!-- hook chart_footer_after_source -->

{#if data.basemapAttribution}
    <span class="footer-block map-attribution-block">
        {@html separator()}
        <span class="map-attribution-caption">{@html data.basemapAttribution.caption}</span>
        {__(data.basemapAttribution.text)}:
    </span>
{/if}

{#if data.getTheData.enabled}
    <span class="footer-block chart-action-data">
        {#if data.getTheData.caption}
            {@html separator()}
        {/if}
        <a class="dw-data-link" href="data">{__(data.getTheData.caption)}</a>
    </span>
{/if}

{#if data.embed.enabled}
    <span class="footer-block embed">
        {#if data.embed.caption}
            {@html separator()}
        {/if}
        <a href="#embed" class="chart-action-embed" on:click={handleClick}>
            {__(data.embed.caption)}
        </a>
        <div class="embed-code {modalIsHidden ? 'hide' : ''}">
            <div class="close" on:click={handleClick}>×</div>
            <div>
                {data.embed.text || 'Please use the following HTML code to embed this chart:'}
            </div>
            <textarea on:click={handleTextareaClick}>{embedCode}</textarea>
        </div>
    </span>
{/if}

{#if data.staticImage.enabled}
    <span class="footer-block static-image">
        {#if data.staticImage.caption}
            {@html separator()}
        {/if}
        <a href={`//img.datawrapper.de/${chartId}/full.png`} class="chart-action-image">
            {__(data.staticImage.caption)}
        </a>
    </span>
{/if}

{#if data.createdWithDatawrapper}
    <span class="footer-block attribution">
        {@html separator()}
        <a href="#placeholder" target="_blank" rel="noopener noreferrer">
            {#if data.createdWithCaption}{__(data.createdWithCaption)} Datawrapper{/if}
        </a>
    </span>
{/if}

{#if data.logo.enabled && data.logo.position === 'left' && data.logo.text}
    <div class="logo-text">
        <span class="logo-text">{data.logo.text}</span>
    </div>
{/if}
