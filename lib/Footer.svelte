<script>
    export let chartId;
    export let data = {};
    export let caption = 'chart';
    export let source = '';
    export let embedCode = '';
    export let byline = '';
    export let chartByline = '';
    export let chartBasedOn = {};

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
</script>

{#if chartBasedOn.byline}
    <span class="footer-block byline-block" style="text-transform: capitalize;">
        {data.forkCaption}
        <span class="chart-based-on">
            {@html chartBasedOn.byline}
        </span>
    </span>
{:else if byline}
    {#if caption == 'chart'}{data.chartCaption}{/if}
    {#if caption == 'map'}{data.mapCaption}{/if}
    {#if caption == 'table'}{data.tableCaption}{/if}
    <span class="chart-byline">
        {@html chartByline}
    </span>
{/if}

{#if source.name && data.sourcePosition !== 'above-footer'}
    <span class="footer-block source-block">
        {@html separator()}
        {data.sourceCaption}:
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
        {data.basemapAttribution.text}:
        {@html data.basemapAttribution.caption}
    </span>
{/if}

{#if data.getTheData.enabled}
    <span class="footer-block chart-action-data">
        {#if data.getTheData.caption}
            {@html separator()}
        {/if}
        <a href="data">{data.getTheData.caption}</a>
    </span>
{/if}

{#if data.embed.enabled}
    <span class="footer-block embed">
        {#if data.embed.caption}
            {@html separator()}
        {/if}
        <a href="#embed" class="chart-action-embed" on:click={handleClick}>{data.embed.caption}</a>
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
            {data.staticImage.caption}
        </a>
    </span>
{/if}

{#if data.createdWithDatawrapper}
    <span class="footer-block attribution">
        {@html separator()}
        <a href="#placeholder" target="_blank" rel="noopener noreferrer">
            {data.createdWithCaption} Datawrapper
        </a>
    </span>
{/if}

{#if data.logo.enabled && data.logo.position === 'left' && data.logo.text}
    <div class="logo-text">
        <span class="logo-text">{data.logo.text}</span>
    </div>
{/if}
