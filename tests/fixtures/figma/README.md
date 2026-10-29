# Figma binary regression fixtures

These small design exports come from [OpenFig-org/openfig-core](https://github.com/OpenFig-org/openfig-core), commit `0d67354fcd6d14c37b89c42f55330faf0a79e1ce`. That project's README and package declare the MIT license. Attribution: OpenFig contributors.

- `circle.fig`: `test-fixtures/circle.fig`, archive version 101, deflated message.
- `vector-zstd.fig`: `test-fixtures/OpenFigs.fig`, archive version 106, Zstandard message, compound paths.
- `open-path.fig`: `test-fixtures/vector-network/straight-2-point-line.fig`, open vector network.

Retained to test actual binary exports instead of only synthetic JSON. The importer reads the schema embedded in each file. These fixtures are test-only and are not packaged in the app.
