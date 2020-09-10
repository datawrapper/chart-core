# chart-core

**`@datawrapper/chart-core`** is a collection of useful functions and components that are required to render Datawrapper charts.

## Installation

```sh
> npm i @datawrapper/chart-core
```

## Structure

```
├── main.js
│     - Entry point for rollup to bundle `Chart.svelte`
│     - (used by datawrapper/api)
│
├── lib
│     - Directory of source files like `Chart.svelte`
│     - (used by datawrapper/frontend)
│
├── dist
│     - Files with global dependencies needed for chart rendering
│     - (used by datawrapper/{api,frontend})
│
└── vendor
      - Source vendor files that are copied into dist when package is published
```

Above are the interesting files and directories to render charts. Only `lib/` and `dist/` get packaged and published with `npm`.

## API reference

* [Chart](docs/chart.md) ⇒ <code>class</code>
* [Column](docs/column.md) ⇒ <code>class</code>
* [Dataset](docs/dataset.md) ⇒ <code>class</code>

## Development

When changing core functionality it is advised to link a local copy of `@datawrapper/chart-core` in the `datawrapper/api` or `datawrapper/frontend` repositories. Follow these steps to link the package:

```sh
~/code/chart-core
❯  npm link

~/code/frontend
❯ npm link @datawrapper/chart-core
```

Everytime `npm install` is called after that, the link is removed. Usually it is enough to run the second step again.

## Publishing

To publish this package run `npm version {major|minor|patch}`  and `npm publish`. To publish you have to be part of the Datawrapper organization on npm.
