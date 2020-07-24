🚧 Under development 🚧

# sizewatcher

CI tool to warn about size increases in github PRs. Will check:

- `nodejs` `node_modules` increases
- `git` repo increases
- ... more possible in the future, other languages...

## Usage

Run in CIs in context of PRs using:

```
npx @adobe/sizewatcher
```

Can also be run locally. To install:

- install globally using `npm install -g @adobe/sizewatcher` and run as `sizewatcher`
- alternatively add as dev dependency to your project using `npm install --save-dev @adobe/sizewatcher` and run using `npx @adobe/sizewatcher` (adjust examples below)

By default will compare current branch ("new") against `master` ("before").

To compare current branch with another base branch `base`:

```
sizewatcher base
```

To compare arbitrary branches or revisions `before` with `after`:

```
sizewatcher before after
```

## Supported CIs

- TravisCI
- CircleCI
- ... more possible in the future

## Requirements

**Try to avoid any config. Default `sizewatcher` in CI should be enough!**

- nodejs version 12+
- `GITHUB_TOKEN` for checkout (in case not possible in CI)

## Config

- `.sizewatcher` yaml config file
- thresholds for warning icons/colors
- what checkers to run (auto identify by default)
- custom checker

```yaml
thresholds:
   decreased: -20%
   increased: 10%
   increased_greatly: 50%

checkers:
    - git
    - node_modules
```

## Checkers

### checker: node_modules

- Run: if `package.json` is found
- Logic: `npm install`, then total folder size of `node_modules`.
- Details: [cost-of-modules](https://github.com/siddharthkp/cost-of-modules) table before/after, count number of libraries

### checker: git repo

- Run: always
- Logic: Simple `du -sh` of folder without `.git` folder. Maybe more advanced later.
- Details:
  - [show largest commits](https://stackoverflow.com/questions/10622179/how-to-find-identify-large-commits-in-git-history)
  - show largest files

### generic checker

Could be reused by other checkers, or manually configured in `.sizewatcher` (but wait for some use cases for finding the right abstraction; e.g. maven dependencies aren't in a single folder).

- specify name
- specify directory to measure, with exclusions
- specify command for details (optional; command must be installed)

## Development

### Basic PR delta framework

1. Create separate temporary directory `TMP_DIR` - location depends on CI?
2. Copy existing checkout inside `$TMP_DIR/pr`
3. Identify the base branch
   - get PR id/URL
   - get PR info from github
   - use octokit/rest
   - get base branch from URL
4. git clone base branch into `$TMP_DIR/base`
5. Calculate sizes and delta
   - **see below**
   - aggregate in a list, each entry has:
     - name
     - bytes before
     - bytes after
     - custom markdown text with details
6. (If PR detected and GH credentials available) Update PR comment with result list
  - get PR URL
  - use octokit/rest
  - list PR comments
  - find comment from CI user plus certain marking in text
  - if exists, overwrite
  - otherwise create comment
7. Log results (for local use)
8. Remove `TMP_DIR` again - should not impact anything else in CI build

### Breaking it down

Modules/repos:

- `sizewatcher`: main one
- `github-pr-comment`: add or update a PR comment as bot
- `github-branch-compare`: help checkout TODO

### Output

```
sizewatcher (aggregated GOOD/OK/BAD icon)

> `node_modules` increased 50% / 50 MB from 100 MB to 150 MB (green/orange/red)
  <table of largest modules>

> `git repo` increased

```

Github status checks:
- one for each checker with result in custom message

### Icons/colors

- decreased: green with party icon
- same (+/- some percent): green
- increased: orange
- increased a lot (by default): red

### Aggregation

- if at least one red => red
- if at least one orange => orange
- otherwise, if all green => green
- some decreased, others same => green with party icon

### Links

- [Travis Environment Variables](https://docs.travis-ci.com/user/environment-variables/#default-environment-variables)
- [CircleCI Environment Variables](https://circleci.com/docs/2.0/env-vars/#built-in-environment-variables)
- [Github Actions Environment Variables](https://help.github.com/en/actions/configuring-and-managing-workflows/using-environment-variables#default-environment-variables)
- [npm du](https://www.npmjs.com/package/du)
- [npm get-folder-size](https://www.npmjs.com/package/get-folder-size)
- [octokit/rest](https://github.com/octokit/rest.js/)
    - [api docs](https://octokit.github.io/rest.js/v17)

## Contributing

Contributions are welcomed! Read the [Contributing Guide](./.github/CONTRIBUTING.md) for more information.

## Licensing

This project is licensed under the Apache V2 License. See [LICENSE](LICENSE) for more information.
