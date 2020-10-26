# Changelog

## 1.0.1

Improvements:

- [#33](https://github.com/adobe/sizewatcher/issues/33) Support `script` option in custom comparator. This allows to run build steps in case the output of those needs to be measured. The `path` option now also supports glob patterns.


- [#31](https://github.com/adobe/sizewatcher/issues/31) Change default limits to make them less aggressive:
  - fail: `100%`
  - warn: `30%`
  - ok: `-10%` (same)


## 1.0.0

Initial version with comparators

- git
- node_modules
- custom