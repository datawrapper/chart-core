<script>
    export let chartId;
    export let data = {};
    export let caption = 'chart';
    export let source = '';
    export let embedCode = '';
    export let __;

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

<!-- hook chart_footer_after_source -->

{#if data.basemapAttribution}
    <span class="footer-block map-attribution-block">
        {@html separator()}
        {__(data.basemapAttribution.text)}:
        <span class="map-attribution-caption">
            {@html data.basemapAttribution.caption}
        </span>
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
