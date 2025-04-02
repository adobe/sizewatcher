# Changelog

## 1.4.0

Major changes:

- [#106](https://github.com/adobe/sizewatcher/issues/106) Require at least node 18 (last version we can make work with being a CommonJS module)

Improvements:

- Upgrade dependencies (many major bumps)
- Added renovate
- [#98](https://github.com/adobe/sizewatcher/pull/98) CI: drop `.travis.yml`, was not running on Travis CI for years anyway
- [#101](https://github.com/adobe/sizewatcher/pull/101) fixed package.json using `npm pkg fix`
- CI: various CI improvements

Fixes:

- [#108](https://github.com/adobe/sizewatcher/pull/108) Git comparator reporting incorrect deltas. now count files in checkout instead of .git folder for consistent sizes
- [#112](https://github.com/adobe/sizewatcher/pull/112) Node-modules: replace broken cost-of-modules with howfat for better largest modules reporting
- [#97](https://github.com/adobe/sizewatcher/pull/97) Fix node version 20+ test failures

## 1.3.0

Improvements:

- [#87](https://github.com/adobe/sizewatcher/issues/87) Drop node 10 support #87
- Various dependency updates

## 1.2.1

Important bug fixes.

Fixes:

- [#63](https://github.com/adobe/sizewatcher/issues/63) fix and improve git checkout logic
- [#62](https://github.com/adobe/sizewatcher/issues/62) fix failure on fork PRs
- [#53](https://github.com/adobe/sizewatcher/issues/53) sizewatcher fails if there is no "package.json" file in the main branch, or if a package.json has no dependencies and thus node_modules is missing
- [#74](https://github.com/adobe/sizewatcher/issues/74) improve delta calculation (showed weird negative values in some cases)

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