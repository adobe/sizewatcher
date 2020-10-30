# Changelog

## 1.2.0

Improvements:

- [#41](https://github.com/adobe/sizewatcher/issues/41) Support project structures where package.json is in subdirectory. Introduces the `dir` config on comparators.

Fixes:

- [#46](https://github.com/adobe/sizewatcher/issues/46) Support running in a subdirectory of a git checkout.

- [#43](https://github.com/adobe/sizewatcher/issues/43) `node_modules` comparator failed if there were no dependencies

- [#42](https://github.com/adobe/sizewatcher/issues/42) `npm_package` failed if there was no version field in package.json

## 1.1.0

New Comparators:

- [#14](https://github.com/adobe/sizewatcher/issues/14) npm package size

Improvements:

- [#32](https://github.com/adobe/sizewatcher/issues/32) Improved PR comment that can be collapsed as whole, shows the summary result and is collapsed by default if the result is ok.

- [#33](https://github.com/adobe/sizewatcher/issues/33) Support `script` option in custom comparator. This allows to run build steps in case the output of those needs to be measured. The `path` option now also supports glob patterns.


- [#31](https://github.com/adobe/sizewatcher/issues/31) Change default limits to make them less aggressive:
  - fail: `100%`
  - warn: `30%`
  - ok: `-10%` (same)

- [#39](https://github.com/adobe/sizewatcher/issues/39) Detect if comparing the same branch and exit gracefully.


## 1.0.0

Initial version with comparators

- git
- node_modules
- custom