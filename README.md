[![Version](https://img.shields.io/npm/v/@adobe/sizewatcher.svg)](https://npmjs.org/package/@adobe/sizewatcher)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](http://www.apache.org/licenses/LICENSE-2.0)
[![Coverage Status](https://coveralls.io/repos/github/adobe/sizewatcher/badge.svg)](https://coveralls.io/github/adobe/sizewatcher)
[![Travis](https://travis-ci.com/adobe/sizewatcher.svg?branch=main)](https://travis-ci.com/adobe/sizewatcher)
[![CircleCI](https://circleci.com/gh/adobe/sizewatcher.svg?style=shield)](https://circleci.com/gh/adobe/sizewatcher)
[![Github Actions Node.js CI Status](https://github.com/adobe/sizewatcher/workflows/Node.js%20CI/badge.svg)](https://github.com/adobe/sizewatcher/actions?query=workflow%3A%22Node.js+CI%22)
[![CodeQL Status](https://github.com/adobe/sizewatcher/workflows/CodeQL/badge.svg)](https://github.com/adobe/sizewatcher/actions?query=workflow%3ACodeQL)

<!-- @import "[TOC]" {cmd="toc" depthFrom=2 depthTo=2 orderedList=false} -->

<!-- code_chunk_output -->

- [Standard behavior](#standard-behavior)
- [Requirements](#requirements)
- [Installation](#installation)
- [Usage](#usage)
- [CI Setup](#ci-setup)
- [Configuration](#configuration)
- [Comparators reference](#comparators-reference)
- [Contribute](#contribute)
- [Licensing](#licensing)

<!-- /code_chunk_output -->

# sizewatcher

`sizewatcher` is a CI tool that automatically warns about size increases in Github pull requests. This allows early detection of commonly undesirable issues such as
- addition of large dependencies (and transient dependency trees)
- accidental addition of large binary files to the git repository
- sudden increase in build artifact size
- etc.

Currently supported are git repository size itself, Node.js/npm modules and measuring any custom files or folders - see [Comparators reference](#comparators-reference). More built-in languages & options are possible in the future.

`sizewatcher` runs as part of your CI and reports results as comment on the pull request or as github commit status (optional), allowing to block PRs if a certain threshold was exceeded. This is an example of a Github PR comment:

---

📈 [Sizewatcher](https://github.com/adobe/sizewatcher) measured these changes:

<details>
<summary>✅ <code>git</code> <b>+0.2%</b> (246 kB => 247 kB)</summary>
<br>

Largest files in new changes:
```
360cccafa87c    974B .npmignore
```
</details>

<details>
<summary>✅ <code>node_modules</code> has no changes (46.8 MB)</summary>
<br>

Largest node modules:
```
┌───────────────┬─────────────┬────────┐
│ name          │ children    │ size   │
├───────────────┼─────────────┼────────┤
│ @octokit/rest │ 33          │ 11.25M │
├───────────────┼─────────────┼────────┤
│ js-yaml       │ 3           │ 0.72M  │
├───────────────┼─────────────┼────────┤
│ simple-git    │ 2           │ 0.24M  │
├───────────────┼─────────────┼────────┤
│ tmp           │ 13          │ 0.22M  │
├───────────────┼─────────────┼────────┤
│ debug         │ 1           │ 0.08M  │
├───────────────┼─────────────┼────────┤
│ deepmerge     │ 0           │ 0.03M  │
├───────────────┼─────────────┼────────┤
│ require-dir   │ 0           │ 0.02M  │
├───────────────┼─────────────┼────────┤
│ du            │ 1           │ 0.01M  │
├───────────────┼─────────────┼────────┤
│ pretty-bytes  │ 0           │ 0.01M  │
├───────────────┼─────────────┼────────┤
│ 9 modules     │ 34 children │ 4.57M  │
└───────────────┴─────────────┴────────┘
```
</details>

<details>
<summary>Notes</summary>
<br>

- PR branch: `docs` @ 15626a050330492da8b745dadb4f5d304b670e83
- Base branch: `main`
- Sizewatcher v1.0.0
- Configuration
<pre>
limits:
  fail: 100%
  warn: 30%
  ok: '-10%'
report:
  githubComment: true
  githubStatus: false
comparators: {}
</pre></details>

---

## Standard behavior

By default `sizewatcher` will
- checkout the before and after branch versions in temporary directories
- go through all [comparators](#comparators-reference) that apply
- measure the sizes, compare and report
  - fail ❌ at a 100%+ increase
  - warn ⚠️ at a 30%+ increase
  - report ok ✅ if the size change is between -10 and +30%
  - cheer 🎉 if there is a 10% decrease
- print result in cli output
- report result as PR comment
- not set a commit status
  - as this will block the PR if it fails
  - opt-in using `report.githubStatus: true`, see [Configuration](#configuration) below

## Requirements

- [Nodejs](https://nodejs.org) version 10+
  - recommended to use latest stable version "LTS"
- CI system running on Github pull requests
  - [Github Actions](https://github.com/features/actions) (simplest setup)
  - [Travis CI](https://travis-ci.org)
  - [CircleCI](https://circleci.com)
  - others might work too

## Installation

You can install the `sizewatcher` tool locally for testing or checking your changes before committing:

```
npm install -g @adobe/sizewatcher
```

## Usage

When run locally, `sizewatcher` will output its results on the command line.

See the command line help with:

```
sizewatcher -h
```

Help output:
```
Usage: /usr/local/bin/sizewatcher [<options>] [<before> [<after>]]

Arguments:
  <before>   Before branch/commit for comparison. Defaults to default branch or main/master.
  <after>    After branch/commit for comparison. Defaults to current branch.

Options:
  -h     Show help
```

In the simplest case, run inside a git repository without arguments. This will compare the current checked out branch against the base (`main` or `master`):

```
sizewatcher
```

Example output:
```
> sizewatcher
Cloning git repository...
Comparing changes from 'main' to 'docs'

Calculating size changes for
- git
- node_modules

Sizewatcher measured the following changes:

  'main' => 'docs' (sha 15626a050330492da8b745dadb4f5d304b670e83)

+ ✅ git: 0.2% (179 kB => 179 kB)

  Largest files in new changes:

  360cccafa87c    974B .npmignore
...
Error: Cannot identify github repository. Cannot comment on PR or update status checks in github.
Done. Cleaning up...
```

Note that the message `Error: Cannot identify github repository.` will be normal if run locally.

To compare the current branch with a different base branch (`base`):

```
sizewatcher base
```

To compare arbitrary branches or revisions `before` with `after`:

```
sizewatcher before after
```

## CI Setup

- [Github Actions](#github-actions)
- [Travis CI](#travis-ci)
- [CircleCI](#circleci)
- [Other CIs](#other-cis)

To run `sizewatcher` in your CI, which is where it should run, it is best run using [npx](https://nodejs.dev/learn/the-npx-nodejs-package-runner), which comes pre-installed with nodejs and will automatically download and run the latest version in one go:

```
npx @adobe/sizewatcher
```

Depending on the CI, branches of the pull request are automatically detected. Last but not least, to be able to automatically comment on the PR or report a commit status, a **github token** must be set as environment variable:

```
GITHUB_TOKEN=....
```

This token should be a service/bot user that has read/pull permission on the repository (allowing to comment). Note that the comments will be shown under that user's name. For example, you might want to create a user named `sizewatcher-bot` or the like. With Github Actions this is not required, it has a built-in `github-actions` bot user.


See below for CI specific setup.

### Github Actions

For [Github Actions](https://github.com/features/actions) you need to
- ensure Node.js is installed using `actions/setup-node`
- run `npx @adobe/sizewatcher`
- set a `GITHUB_TOKEN` which can leverage the built-in `secrets.GITHUB_TOKEN` (no need to create the token yourself!)

Example [workflow yaml](https://docs.github.com/en/free-pro-team@latest/actions/reference/workflow-syntax-for-github-actions) snippet (`.github/workflows/*.yml`):

```yaml
jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v2
    - name: Install Node.js
      uses: actions/setup-node@v1
      with:
        node-version: '14'
    # run your build/test first in case you want to measure build results
    - run: npm install && npm test
    # ---------- this runs sizewatcher ------------
    - run: npx @adobe/sizewatcher
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Travis CI

For [Travis CI](https://travis-ci.org) you need to
- use `language: node_js`
  - if you already use a different language, find a way to ensure Nodejs 10+ is installed
- under `script` run `npx @adobe/sizewatcher`, typically after your main build or test
- set a secret environment variable `GITHUB_TOKEN` in the [Travis repository settings](https://docs.travis-ci.com/user/environment-variables/#defining-variables-in-repository-settings) with a github token with permission to comment on PRs and reporting commit statuses for the repository

Example `.travis.yml`:

```yaml
language: node_js

install:
  - npm install

script:
  # run your build/test first in case you want to measure build results
  - npm test
  # ---------- this runs sizewatcher ------------
  - npx @adobe/sizewatcher
```

### CircleCI

For [CircleCI](https://circleci.com) you need to
- use a docker image with Nodejs 10+ installed
  - alternatively install [using nvm](https://www.google.com/search?q=circleci+use+nvm)
- run `npx @adobe/sizewatcher`, typically after your main build or test
- set a secret environment variable `GITHUB_TOKEN` in the [CircleCI project settings](https://circleci.com/docs/2.0/env-vars/#setting-an-environment-variable-in-a-project) (or in a [Context](https://circleci.com/docs/2.0/env-vars/#setting-an-environment-variable-in-a-context)) with a github token with permission to comment on PRs and reporting commit statuses for the repository

Example `.circleci/config.yml`:

```yaml
version: 2

jobs:
  build:
    docker:
      - image: circleci/node:14
    steps:
      - checkout

      # run your build/test first in case you want to measure build results
      - run: npm install
      - run: npm test

      # ---------- this runs sizewatcher ------------
      - run: npx @adobe/sizewatcher
```

### Other CIs

This is not tested well but might work.

Ensure Nodejs 10+ is installed.

Set these environment variables in the CI job:

- `GITHUB_BASE_REF` name of the base branch into which the pull request is being merged
- `GITHUB_HEAD_REF` name of the branch of the pull request
- `GITHUB_TOKEN` a github token with permission to comment on PRs and reporting commit statuses for the repository. This is a credential so use the proper CI credential management and never check this into the git repository!

After your build or in parallel, run

```
npx @adobe/sizewatcher
```

## Configuration

Configure the behavior of `sizewatcher` by creating a `.sizewatcher.yml` in the root of the git repository. The config file is entirely optional.

Complete example and reference:

```yaml
report:
  # to report a github commit status (will block PR if it fails)
  # default: false
  githubStatus: true
  # to report a comment on the github PR
  # default: true
  githubComment: false

# global thresholds when to warn or fail a build
# note that one failing or warning comparator is enough to fail or warn
# can be either
# - percentage: "50%" ("-10%" for size decrease)
# - absolute limit, as byte string: "10 MB", "5 KB"
#   see https://www.npmjs.com/package/xbytes
# - absolute limit, as byte number: 1000000
limits:
  # when to fail - default: 100%
  fail: 50%
  # when to warn - default: 30%
  warn: 10%
  # below the ok limit you will get a cheers for making it notably smaller
  # default: -10%
  ok: -5%

# configure individual comparators
# see list below for available comparators - use exact names as yaml keys
# by default all comparators run if they detect their content is present
comparators:
  # set a comparator "false" to disable it
  git: false

  # customize comparator
  node_modules:
    # specific limits
    # same options as for the "limits" at the root
    limits:
      fail: 10 MB
      warn: 9 MB
      ok: 1 MB

  # custom comparator (only active if configured)
  custom:
    - name: my artifact
      # path to file or folder whose size should be measured
      # path must be relative to repo root
      # comparator only runs if that path exists
      path: build/artifact

    # there can be multiple custom comparators
    # name defaults to the path
    - path: some_directory/
      # limits can be configured as well
      limits:
        fail: 10 MB
```

## Comparators reference

- [git](#git)
- [node_modules](#node_modules)
- [custom](#custom)

### git

Compares the size of the git repository by measuring the `.git` folder. Useful to detect if large files are added to the repo.

Name: `git`

Trigger: Runs if a `.git` directory is found.

Details: Shows the largest files (git objects) added in the PR:

---
Largest files in new changes:
```
710a7c687b06  2.8KiB lib/render.js
0a8f1a2ddb4f  2.4KiB test/config.test.js
6846cf298cd4  2.3KiB test/config.test.js
a643d322cc26  1.5KiB lib/config.js
933e4432aae5     73B .sizewatcher.yml
6db7d5c27a66     69B .sizewatcher.yml
```
---

### node_modules

Compares the size increase of Node.js dependencies by measuring the size of the `node_modules` folder. Helps to prevent addition of needlessly large dependencies and slowing down npm install times.

Name: `node_modules`

Trigger: Runs if a `package.json` is found.

Details: Prints the largest modules using [cost-of-modules](https://www.npmjs.com/package/cost-of-modules):

---
Largest node modules:
```
┌───────────────┬─────────────┬────────┐
│ name          │ children    │ size   │
├───────────────┼─────────────┼────────┤
│ @octokit/rest │ 33          │ 11.25M │
├───────────────┼─────────────┼────────┤
│ js-yaml       │ 3           │ 0.72M  │
├───────────────┼─────────────┼────────┤
│ simple-git    │ 2           │ 0.24M  │
├───────────────┼─────────────┼────────┤
│ tmp           │ 13          │ 0.22M  │
├───────────────┼─────────────┼────────┤
│ debug         │ 1           │ 0.08M  │
├───────────────┼─────────────┼────────┤
│ deepmerge     │ 0           │ 0.03M  │
├───────────────┼─────────────┼────────┤
│ require-dir   │ 0           │ 0.02M  │
├───────────────┼─────────────┼────────┤
│ du            │ 1           │ 0.01M  │
├───────────────┼─────────────┼────────┤
│ pretty-bytes  │ 0           │ 0.01M  │
├───────────────┼─────────────┼────────┤
│ 9 modules     │ 34 children │ 4.57M  │
└───────────────┴─────────────┴────────┘
```

---

### custom

Compares the size of a custom file or folder.

Name: `custom`

Trigger: Runs if the path is found in either before or after version.

Details: Shows the new file/folder size.

---

New size:

```
18.6 kB README.md
```
---

Configuration:

This comparator requires configuration in the `.sizewatcher.yml`:

```yaml
comparators:
  custom:
    path: build/artifact
```

To have multiple paths, with custom names:

```yaml
comparators:
  custom:
    - name: my artifact 1
      path: build/artifact
    - name: my artifact 2
      path: build/artifact2
```

Options:
- `path` (required) relative path to file or folder to measure
- `name` (optional) custom label
- `limits` can be set as usual

## Contribute

Contributions are welcome! Read the [Contributing Guide](./.github/CONTRIBUTING.md) for general guidelines.

### New comparator

If you want to add a new automatic comparator for language X or dependency manager Y, follow these steps:

1. [search issues](https://github.com/adobe/sizewatcher/issues?q=is%3Aissue+comparator+label%3Aenhancement+) for any existing similar comparators being discussed
2. if not, create a new issue
3. fork this repo
4. under [lib/comparators](lib/comparators) add your new comparator, say `superduper.js`
5. must export an object with these functions:

   ```js
   module.exports = {

       shouldRun: async function(beforeDir, afterDir) {
           // return true if it should run, otherwise false to skip
           // use to automatically detect language, package manager etc.
           return true;
       },

       compare: async function(before, after) {
           // measure differences between before (base branch) and after (pull request)
           // before and after are objects with
           // - `dir`: directory
           // - `branch`: name of the branch
           // - `sha`: (only on "after") commit sha of the PR currently being looked at

           // return an object with
           // - `beforeSize`: size of the before state
           // - `afterSize`: size of the after state
           // - `detailsLabel`: custom label for the details section (shown in expanded section on PR comment)
           // - `details`: text with custom details on the after state (largest files etc)
           return {
               beforeSize: 100
               afterSize: 200
               detailsLabel: "Largest files in new changes",
               details: "... details"
           }
       }
   }
   ```
6. test and validate
7. create PR

## Licensing

This project is licensed under the Apache V2 License. See [LICENSE](LICENSE) for more information.
