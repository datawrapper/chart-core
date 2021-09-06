<script>
    // external props
    export let props;
    const { get, __ } = props;
    $: ({ chart, theme } = props);

    // internal props
    $: embed = get(theme, 'data.options.blocks.embed.data', {});
    $: embedCode = get(
        chart,
        'metadata.publish.embed-codes.embed-method-responsive',
        '<!-- embed code will be here after publishing -->'
    );

    let modalIsHidden = true;

    function handleClick(e) {
        e.preventDefault();
        modalIsHidden = !modalIsHidden;
    }

    let inputRef;

    function copy() {
        inputRef.focus();
        inputRef.select();
        document.execCommand('copy');
    }
</script>

<style>
    .embed-code {
        position: absolute;
        bottom: 35px;
        left: 8px;
        max-width: 350px;
        border: 1px solid #e5e5e5;
        background: #fff;
        box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.15);
        border-radius: 4px;
        padding: 15px 20px;
        font-size: 14px;
    }

    .embed-code .close {
        width: 15px;
        height: 15px;
        right: 10px;
        top: 10px;
        position: absolute;
        fill: #4f4f4f;
        cursor: pointer;
    }
    .embed-code .close:hover,
    .embed-code .close:focus {
        fill: #111;
    }

    .embed-code button {
        cursor: pointer;
        border: 1px solid #ccc;
        border-bottom-color: #b3b3b3;
        box-shadow: none;
        border-radius: 4px;
        width: 40px;
        height: 30px;
        box-shadow: 0px 1px 2px rgba(0, 0, 0, 0.05), inset 0px 1px 0px rgba(255, 255, 255, 0.05);
    }
    .embed-code button:hover,
    .embed-code button:active {
        background-color: #e6e6e6;
    }

    .embed-code button svg {
        width: 20px;
        height: 20px;
    }

    .embed-code button path {
        fill: #4f4f4f;
    }

    .embed-code p {
        margin: 0px 0px 12px 0px;
        width: calc(100% - 30px);
        font-size: 14px;
        line-height: 20px;
    }

    .embed-code div.actions {
        display: flex;
        justify-content: space-between;
    }

    input {
        width: 100%;
        background: #f5f5f5;
        border: 1px solid #dddddd;
        box-sizing: border-box;
        border-radius: 4px;
        padding: 4px;
        font-size: 14px;
        line-height: 14px;
        color: #4f4f4f;
        margin-right: 10px;
    }
</style>

<a href="#embed" class="chart-action-embed" on:click={handleClick}>
    {embed.caption || __('Embed')}
</a>
{#if !modalIsHidden}
    <div class="embed-code">
        <div class="close" on:click={handleClick}>
            <svg viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
                <path
                    d="M7 4a.995.995 0 0 0-.707.293l-2 2a.999.999 0 0 0 0 1.414L11.586 15l-7.293
                    7.293a.999.999 0 0 0 0 1.414l2 2a.999.999 0 0 0 1.414 0L15 18.414l7.293
                    7.293a.999.999 0 0 0 1.414 0l2-2a.999.999 0 0 0 0-1.414L18.414
                    15l7.293-7.293a.999.999 0 0 0 0-1.414l-2-2a.999.999 0 0 0-1.414 0L15 11.586
                    7.707 4.293A.996.996 0 0 0 7 4z" />
            </svg>
        </div>
        <p>
            {@html embed.text || 'You can copy and paste this <b>code to embed</b> the visualization:'}
        </p>

        <div class="actions">
            <input bind:this={inputRef} type="text" readonly value={embedCode} />
            <button on:click={copy}>
                <svg viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M15 0c-1.645 0-3 1.355-3 3H8C6.346 3 5 4.346 5 6v17c0 1.654 1.346 3 3
                        3h14c1.654 0 3-1.346 3-3V6c0-1.654-1.346-3-3-3h-4c0-1.645-1.355-3-3-3zm0
                        2c.564 0 1 .436 1 1 0 .564-.436 1-1 1-.564 0-1-.436-1-1 0-.564.436-1 1-1zM8
                        5h4v1a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V5h4c.551 0 1 .449 1 1v17c0 .551-.449 1-1
                        1H8c-.551 0-1-.449-1-1V6c0-.551.449-1 1-1zm4 7a1 1 0 1 0 0 2 1 1 0 0 0
                        0-2zm4 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm4 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm8 0a1
                        1 0 1 0 0 2 1 1 0 0 0 0-2zm-16 4a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm16 0a1 1 0 1 0
                        0 2 1 1 0 0 0 0-2zm-16 4a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm16 0a1 1 0 1 0 0 2 1 1
                        0 0 0 0-2zm0 4a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm-16 4a1 1 0 1 0 0 2 1 1 0 0 0
                        0-2zm4 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm4 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm4 0a1
                        1 0 1 0 0 2 1 1 0 0 0 0-2zm4 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" />
                </svg>
            </button>
        </div>
    </div>
{/if}
