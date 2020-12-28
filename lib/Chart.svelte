<script>
    import { onMount, afterUpdate, tick } from 'svelte';
    import BlocksRegion from './BlocksRegion.svelte';
    import Menu from './Menu.svelte';
    import Headline from './blocks/Headline.svelte';
    import Description from './blocks/Description.svelte';
    import Source from './blocks/Source.svelte';
    import Byline from './blocks/Byline.svelte';
    import Notes from './blocks/Notes.svelte';
    import GetTheData from './blocks/GetTheData.svelte';
    import Embed from './blocks/Embed.svelte';
    import Logo from './blocks/Logo.svelte';
    import Rectangle from './blocks/Rectangle.svelte';
    import Watermark from './blocks/Watermark.svelte';
    import HorizontalRule from './blocks/HorizontalRule.svelte';
    import svgRule from './blocks/svgRule.svelte';

    import get from '@datawrapper/shared/get';
    import purifyHtml from '@datawrapper/shared/purifyHtml';
    import { clean } from './shared';
    import { loadScript, loadStylesheet } from '@datawrapper/shared/fetch';
    import init from './render.js';
    import { getMaxChartHeight } from './dw/utils';

    export let data = '';
    export let chart = {};
    export let visualization = {};
    export let theme = {};
    export let locales = {};
    export let blocks = {};
    export let chartAfterBodyHTML = '';
    export let isIframe;
    export let isPreview;
    export let basemap;
    export let minimap;
    export let highlight;
    export let fonts = {};

    // plain style means no header and footer
    export let isStylePlain = false;
    // static style means user can't interact (e.g. in a png version)
    export let isStyleStatic = false;

    if (isIframe && typeof window !== 'undefined') {
        window.__dwUpdate = ({ chart }) => {
            Object.assign(chart, chart);
            chart = chart; // to force re-rendering
        };
    }

    const coreBlocks = [
        {
            id: 'headline',
            tag: 'h1',
            region: 'header',
            priority: 10,
            test: ({ chart }) => chart.title && !get(chart, 'metadata.describe.hide-title'),
            component: Headline
        },
        {
            id: 'description',
            tag: 'p',
            region: 'header',
            priority: 20,
            test: ({ chart }) => get(chart, 'metadata.describe.intro'),
            component: Description
        },
        {
            id: 'notes',
            region: 'aboveFooter',
            priority: 10,
            test: ({ chart }) => get(chart, 'metadata.annotate.notes'),
            component: Notes
        },
        {
            id: 'byline',
            region: 'footerLeft',
            test: ({ chart }) =>
                get(chart, 'metadata.describe.byline', false) || chart.basedOnByline,
            priority: 10,
            component: Byline
        },
        {
            id: 'source',
            region: 'footerLeft',
            test: ({ chart }) => get(chart, 'metadata.describe.source-name'),
            priority: 20,
            component: Source
        },
        {
            id: 'get-the-data',
            region: 'footerLeft',
            test: ({ theme, isStyleStatic }) =>
                get(theme, 'data.options.footer.getTheData.enabled') && !isStyleStatic,
            priority: 30,
            component: GetTheData
        },
        {
            id: 'embed',
            region: 'footerLeft',
            test: ({ theme, isStyleStatic }) =>
                get(theme, 'data.options.footer.embed.enabled') && !isStyleStatic,
            priority: 40,
            component: Embed
        },
        {
            id: 'logo',
            region: 'footerRight',
            test: ({ theme }) => get(theme, 'data.options.footer.logo.enabled'),
            priority: 10,
            component: Logo
        },
        {
            id: 'rectangle',
            region: 'header',
            test: ({ theme }) => !!get(theme, 'data.options.blocks.rectangle'),
            priority: 1,
            component: Rectangle
        },
        {
            id: 'watermark',
            region: 'afterBody',
            test: ({ theme }) => {
                const field = get(theme, 'data.options.watermark.custom-field');
                return get(theme, 'data.options.watermark')
                    ? field
                        ? get(chart, `metadata.custom.${field}`, '')
                        : get(theme, 'data.options.watermark.text', 'CONFIDENTIAL')
                    : false;
            },
            priority: 1,
            component: Watermark
        },
        hr(0, 'hr'),
        hr(1, 'hr'),
        hr(2, 'hr'),
        hr(0, 'svg-rule'),
        hr(1, 'svg-rule'),
        hr(2, 'svg-rule')
    ];

    function hr(index, type) {
        const id = `${type}${index ? index : ''}`;
        return {
            id,
            region: 'header',
            test: ({ theme }) => !!get(theme, `data.options.blocks.${id}`),
            priority: 0,
            component: type === 'hr' ? HorizontalRule : svgRule
        };
    }

    let pluginBlocks = [];

    $: allBlocks = applyThemeBlockConfig([...coreBlocks, ...pluginBlocks], theme, blockProps);

    $: blockProps = {
        __,
        purifyHtml: clean,
        get,
        theme,
        data,
        chart,
        caption
    };

    function byPriority(a, b) {
        return (
            (a.priority !== undefined ? a.priority : 999) -
            (b.priority !== undefined ? b.priority : 999)
        );
    }

    function getBlocks(allBlocks, region, props) {
        return allBlocks
            .filter(d => d.region === region)
            .filter(d => !d.test || d.test({ ...d.props, ...props }))
            .filter(d => (d.visible !== undefined ? d.visible : true))
            .sort(byPriority);
    }

    function applyThemeBlockConfig(blocks, theme, blockProps) {
        return blocks.map(block => {
            block.props = {
                ...(block.data || {}),
                ...blockProps,
                id: block.id
            };
            if (block.component.test) {
                block.test = block.component.test;
            }
            const options = get(theme, 'data.options.blocks', {})[block.id];
            if (!options) return block;
            return {
                ...block,
                ...options
            };
        });
    }

    let regions;
    $: {
        // build all the region
        regions = {
            header: getBlocks(allBlocks, 'header', { chart, data, theme, isStyleStatic }),
            aboveFooter: getBlocks(allBlocks, 'aboveFooter', { chart, data, theme, isStyleStatic }),
            footerLeft: getBlocks(allBlocks, 'footerLeft', { chart, data, theme, isStyleStatic }),
            footerCenter: getBlocks(allBlocks, 'footerCenter', {
                chart,
                data,
                theme,
                isStyleStatic
            }),
            footerRight: getBlocks(allBlocks, 'footerRight', { chart, data, theme, isStyleStatic }),
            belowFooter: getBlocks(allBlocks, 'belowFooter', { chart, data, theme, isStyleStatic }),
            afterBody: getBlocks(allBlocks, 'afterBody', { chart, data, theme, isStyleStatic }),
            menu: getBlocks(allBlocks, 'menu', { chart, data, theme, isStyleStatic })
        };
    }

    let menu;
    $: {
        menu = get(theme, 'data.options.menu', {});
    }

    function getCaption(id) {
        if (id === 'd3-maps-choropleth' || id === 'd3-maps-symbols' || id === 'locator-map')
            return 'map';
        else if (id === 'tables') return 'table';
        return 'chart';
    }

    const caption = getCaption(visualization.id);

    function __(key, ...args) {
        if (typeof key !== 'string') {
            key = '';
            console.error(
                new TypeError(`function __ called without required 'key' parameter!
Please make sure you called __(key) with a key of type "string".
`)
            );
        }
        key = key.trim();

        let translation = locales[key] || key;

        if (args.length) {
            translation = translation.replace(/\$(\d)/g, (m, i) => {
                i = +i;
                return args[i] || m;
            });
        }

        return translation;
    }

    let target;

    onMount(async () => {
        if (isIframe) {
            document.body.classList.toggle('plain', isStylePlain);
            document.body.classList.toggle('static', isStyleStatic);
            // the body class "png-export" kept for backwards compatibility
            document.body.classList.toggle('png-export', isStyleStatic);

            if (isStyleStatic) {
                document.body.style['pointer-events'] = 'none';
            }
        }
    });

    let initialized = false;

    $: {
        async function run() {
            if (typeof dw === 'undefined') return;
            if (initialized) return;

            dw.theme.register(theme.id, theme.data);

            let d3maps_basemap, locatorMap;

            if (basemap) {
                basemap.content = JSON.parse(basemap.content);

                d3maps_basemap = {
                    [basemap.__id]: basemap
                };
            }

            if (minimap || highlight) {
                locatorMap = {
                    minimapGeom: minimap,
                    highlightGeom: highlight
                };
            }

            const { success, render } = init(target, {
                data,
                chart,
                visualization,
                theme,
                locales,
                d3maps_basemap,
                locatorMap,
                isPreview,
                isIframe,
                fonts
            });

            if (!success) return;
            else initialized = true;

            // load & execute plugins
            window.__dwBlocks = {};
            if (blocks.length) {
                await Promise.all(
                    blocks.map(d => {
                        return new Promise((resolve, reject) => {
                            const p = [loadScript(d.source.js)];
                            if (d.source.css) p.push(loadStylesheet(d.source.css));
                            Promise.all(p)
                                .then(resolve)
                                .catch(err => {
                                    // log error
                                    const url = err.target
                                        ? err.target.getAttribute('src') ||
                                          err.target.getAttribute('href')
                                        : null;
                                    if (url) console.warn('could not load ', url);
                                    else console.error('Unknown error', err);
                                    // but resolve anyway
                                    resolve();
                                });
                        });
                    })
                );
                // all plugins are loaded
                blocks.forEach(d => {
                    d.blocks.forEach(block => {
                        if (!window.__dwBlocks[block.component]) {
                            return console.warn(
                                `component ${block.component} from chart block ${block.id} not found`
                            );
                        }
                        pluginBlocks.push({
                            ...block,
                            component: window.__dwBlocks[block.component]
                        });
                    });
                });
                // trigger svelte update after modifying array
                pluginBlocks = pluginBlocks;
            }

            await tick();
            render();
        }

        run();
    }

    // afterUpdate(checkHeightAndRender);
</script>

{#if !isStylePlain}
    <BlocksRegion name="dw-chart-header" blocks={regions.header} id="header" />

    {#if !isStyleStatic}
        <Menu name="dw-chart-menu" props={menu} blocks={regions.menu} />
    {/if}
{/if}

<div bind:this={target} class="dw-chart-body" />

{#if get(theme, 'data.template.afterChart')}
    {@html theme.data.template.afterChart}
{/if}

{#if !isStylePlain}
    <BlocksRegion name="dw-above-footer" blocks={regions.aboveFooter} />

    <div id="footer" class="dw-chart-footer">
        {#each ['Left', 'Center', 'Right'] as orientation}
            <div class="footer-{orientation.toLowerCase()}">
                {#each regions['footer' + orientation] as block, i}
                    {#if i}
                        <span class="separator separator-before-{block.id}" />
                    {/if}
                    <span class="footer-block {block.id}-block">
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
                    </span>
                {/each}
            </div>
        {/each}
    </div>

    <BlocksRegion name="dw-below-footer" blocks={regions.belowFooter} />
{/if}

<div class="dw-after-body">
    {#each regions.afterBody as block}
        <svelte:component this={block.component} props={block.props} />
    {/each}
</div>

{#if chartAfterBodyHTML}
    {@html chartAfterBodyHTML}
{/if}
