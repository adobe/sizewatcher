[![Version](https://img.shields.io/npm/v/@adobe/sizewatcher.svg)](https://npmjs.org/package/@adobe/sizewatcher)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](http://www.apache.org/licenses/LICENSE-2.0)
[![Coverage Status](https://coveralls.io/repos/github/adobe/sizewatcher/badge.svg)](https://coveralls.io/github/adobe/sizewatcher)
[![Travis](https://travis-ci.com/adobe/sizewatcher.svg?branch=main)](https://travis-ci.com/adobe/sizewatcher)
[![CircleCI](https://circleci.com/gh/adobe/sizewatcher.svg?style=shield)](https://circleci.com/gh/adobe/sizewatcher)
[![Github Actions Node.js CI Status](https://github.com/adobe/sizewatcher/workflows/Node.js%20CI/badge.svg)](https://github.com/adobe/sizewatcher/actions?query=workflow%3A%22Node.js+CI%22)
[![CodeQL Status](https://github.com/adobe/sizewatcher/workflows/CodeQL/badge.svg)](https://github.com/adobe/sizewatcher/actions?query=workflow%3ACodeQL)

<!-- @import "[TOC]" {cmd="toc" depthFrom=2 depthTo=2 orderedList=false} -->

<!-- code_chunk_output -->

- [How it works](#how-it-works)
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

While any custom file or folder path can be measured via configuration, various types are automatically measured, including git repository, Node module dependencies and npm package size - see [comparators reference](#comparators-reference). More built-in languages & options are added over time and [contributions are welcome](#new-comparator).

`sizewatcher` runs as part of your CI and reports results as comment on the pull request or as github commit status (optional), allowing to block PRs if a certain threshold was exceeded.


This is an example of a `sizewatcher` Github PR comment with a failure (ignore the small numbers):

---

<details open><summary>❌ <a href="https://github.com/adobe/sizewatcher">Sizewatcher</a> detected a problematic size increase 📈:</summary>
<p><blockquote>

<details><summary>❌ <code>git</code> <b>+97.9%</b> (186 kB => 368 kB)</summary><br>Largest files in new changes:<pre>ecaf42b1d55c  4.5KiB lib/report.js<br>9c1a82fa7efb  2.8KiB lib/render.js<br>710a7c687b06  2.8KiB lib/render.js<br>e7a5a58b23a6  2.7KiB test/config.test.js<br>0a8f1a2ddb4f  2.4KiB test/config.test.js<br>6846cf298cd4  2.3KiB test/config.test.js<br>461b7663fd23  1.6KiB lib/config.js<br>a643d322cc26  1.5KiB lib/config.js<br>6db7d5c27a66     69B .sizewatcher.yml</pre></details>

<details><summary>✅ <code>node_modules</code> <b>-6.1%</b> (42.5 MB => 39.9 MB)</summary><br>Largest node modules:<pre>┌───────────────┬─────────────┬────────┐<br>│ name          │ children    │ size   │<br>├───────────────┼─────────────┼────────┤<br>│ @octokit/rest │ 33          │ 11.25M │<br>├───────────────┼─────────────┼────────┤<br>│ js-yaml       │ 3           │ 0.72M  │<br>├───────────────┼─────────────┼────────┤<br>│ simple-git    │ 2           │ 0.24M  │<br>├───────────────┼─────────────┼────────┤<br>│ tmp           │ 13          │ 0.22M  │<br>├───────────────┼─────────────┼────────┤<br>│ debug         │ 1           │ 0.08M  │<br>├───────────────┼─────────────┼────────┤<br>│ deepmerge     │ 0           │ 0.03M  │<br>├───────────────┼─────────────┼────────┤<br>│ require-dir   │ 0           │ 0.02M  │<br>├───────────────┼─────────────┼────────┤<br>│ du            │ 1           │ 0.01M  │<br>├───────────────┼─────────────┼────────┤<br>│ pretty-bytes  │ 0           │ 0.01M  │<br>├───────────────┼─────────────┼────────┤<br>│ 9 modules     │ 34 children │ 4.57M  │<br>└───────────────┴─────────────┴────────┘</pre></details>

<details><summary>Notes</summary><br>

- PR branch: `testconfig` @ 21b66dfe6c3f6d09d4929ea2dec1e62cd1a7e7f2
- Base branch: `main`
- Sizewatcher v1.0.0
- Effective Configuration:

```yaml
limits:
  fail: 100%
  warn: 30%
  ok: '-10%'
report:
  githubComment: true
  githubStatus: false
comparators:
  git:
    limits:
      fail: 50%
  custom: null
```
</details>

</blockquote></p>
</details>

---

And here if everything looks good:

---

<details ><summary>✅ <a href="https://github.com/adobe/sizewatcher">Sizewatcher</a> found no problematic size increases.</summary>
<p><blockquote>

<details><summary>✅ <code>git</code> <b>+97.9%</b> (186 kB => 368 kB)</summary><br>Largest files in new changes:<pre>ecaf42b1d55c  4.5KiB lib/report.js<br>9c1a82fa7efb  2.8KiB lib/render.js<br>710a7c687b06  2.8KiB lib/render.js<br>e7a5a58b23a6  2.7KiB test/config.test.js<br>0a8f1a2ddb4f  2.4KiB test/config.test.js<br>6846cf298cd4  2.3KiB test/config.test.js<br>461b7663fd23  1.6KiB lib/config.js<br>a643d322cc26  1.5KiB lib/config.js<br>6db7d5c27a66     69B .sizewatcher.yml</pre></details>

<details><summary>✅ <code>node_modules</code> <b>-6.1%</b> (42.5 MB => 39.9 MB)</summary><br>Largest node modules:<pre>┌───────────────┬─────────────┬────────┐<br>│ name          │ children    │ size   │<br>├───────────────┼─────────────┼────────┤<br>│ @octokit/rest │ 33          │ 11.25M │<br>├───────────────┼─────────────┼────────┤<br>│ js-yaml       │ 3           │ 0.72M  │<br>├───────────────┼─────────────┼────────┤<br>│ simple-git    │ 2           │ 0.24M  │<br>├───────────────┼─────────────┼────────┤<br>│ tmp           │ 13          │ 0.22M  │<br>├───────────────┼─────────────┼────────┤<br>│ debug         │ 1           │ 0.08M  │<br>├───────────────┼─────────────┼────────┤<br>│ deepmerge     │ 0           │ 0.03M  │<br>├───────────────┼─────────────┼────────┤<br>│ require-dir   │ 0           │ 0.02M  │<br>├───────────────┼─────────────┼────────┤<br>│ du            │ 1           │ 0.01M  │<br>├───────────────┼─────────────┼────────┤<br>│ pretty-bytes  │ 0           │ 0.01M  │<br>├───────────────┼─────────────┼────────┤<br>│ 9 modules     │ 34 children │ 4.57M  │<br>└───────────────┴─────────────┴────────┘</pre></details>

<details><summary>Notes</summary><br>

- PR branch: `testconfig` @ 21b66dfe6c3f6d09d4929ea2dec1e62cd1a7e7f2
- Base branch: `main`
- Sizewatcher v1.0.0
- Effective Configuration:

```yaml
limits:
  fail: 100%
  warn: 200%
  ok: '-10%'
report:
  githubComment: true
  githubStatus: false
comparators: {}
```
</details>

</blockquote></p>
</details>

---

## How it works

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

- [Nodejs](https://nodejs.org) version 18+ (since 1.4.0)
  - recommended to use latest stable version "LTS"
- Github or Github Enterprise
  - if you want to run it on pull requests
- CI system running on Github pull requests
  - [Github Actions](https://github.com/features/actions) (simplest setup)
  - [Travis CI](https://travis-ci.org)
  - [CircleCI](https://circleci.com)
  - others might work too

## Installation

Local: You can install the `sizewatcher` tool locally for testing or checking your changes before committing:

```
npm install -g @adobe/sizewatcher
```

For setup in Continuous Integration: see [CI Setup](#ci-setup) section.

## Usage

When run locally, `sizewatcher` will output its results on the command line.

See the command line help with:

```
sizewatcher -h
```

Help output:
```
Usage: sizewatcher [<options>] [<before> [<after>]]

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

- [CI Overview](#ci-overview)
- [Github Actions](#github-actions)
- [Travis CI](#travis-ci)
- [CircleCI](#circleci)
- [Other CIs](#other-cis)

### CI Overview

#### Run using npx

To run `sizewatcher` in your CI, which is where it needs to run automatically for checking pull requests, it is best run using [npx](https://nodejs.dev/learn/the-npx-nodejs-package-runner), which comes pre-installed with nodejs and will automatically download and run the latest version in one go:

```
npx @adobe/sizewatcher
```

This command will always use the latest published version. In some cases it might be (temporarily) desireable to stick to a certain version, which can be achieved using:

```
npx @adobe/sizewatcher@1.2.1
```

#### GITHUB_TOKEN

To be able to automatically comment on the PR or report a commit status, a **github token** must be set as environment variable:

```
GITHUB_TOKEN=....
```

This token should be a service/bot user that has read/pull permission on the repository (allowing to comment). Note that the comments will be shown under that user's name. For example, you might want to create a user named `sizewatcher-bot` or the like. With Github Actions this is not required, it has a built-in `github-actions` bot user.

#### GITHUB_API_URL

If you use Github Enterprise, set the custom [Github API URL](https://docs.github.com/en/enterprise-server@2.21/rest/reference/enterprise-admin) in the `GITHUB_API_URL` environment variable:

```
GITHUB_API_URL=https://mygithub.company.com/api/v3/
```

This is not required for public github.com.

#### Order of steps

You can run `sizewatcher` before, after or in parallel to your main build step. It does not rely on output of a build, since it will check out the code (before and after PR versions) separately and needs to run any build steps itself, such as using `script` in the [custom comparator](#custom).

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
    - uses: actions/checkout@v4
    - name: Install Node.js
      uses: actions/setup-node@v4
      with:
        node-version: 'lts/*'
    # ---------- this runs sizewatcher ------------
    - run: npx @adobe/sizewatcher
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Travis CI

For [Travis CI](https://travis-ci.org) you need to
- use `language: node_js`
  - if you already use a different language, find a way to ensure Nodejs 12+ is installed
- under `script` run `npx @adobe/sizewatcher`
- set a secret environment variable `GITHUB_TOKEN` in the [Travis repository settings](https://docs.travis-ci.com/user/environment-variables/#defining-variables-in-repository-settings) with a github token with permission to comment on PRs and reporting commit statuses for the repository

Example `.travis.yml`:

```yaml
language: node_js

install:
  - npm install

script:
  # ---------- this runs sizewatcher ------------
  - npx @adobe/sizewatcher
```

### CircleCI

For [CircleCI](https://circleci.com) you need to
- use a docker image with Nodejs 12+ installed
  - alternatively install [using nvm](https://www.google.com/search?q=circleci+use+nvm)
- run `npx @adobe/sizewatcher`
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

      # ---------- this runs sizewatcher ------------
      - run: npx @adobe/sizewatcher
```

### Other CIs

This is not tested well but might work.

Ensure Nodejs 12+ is installed.

Set these environment variables in the CI job:

- `GITHUB_BASE_REF` name of the base branch into which the pull request is being merged
- `GITHUB_HEAD_REF` name of the branch of the pull request
- `GITHUB_TOKEN` a github token with permission to comment on PRs and reporting commit statuses for the repository. This is a credential so use the proper CI credential management and never check this into the git repository!

Then simply run

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

  npm_package:
    # `dir` is supported for all comparators that support it and
    # specifies the relative directory inside the project inside which to run the comparator
    dir: "sub/folder"
    # can also be an array with multiple directories to check
    dir:
      - "sub/folder1"
      - "folder2"

  # custom comparator (only active if configured)
  custom:
    - name: my artifact
      # path to file or folder whose size should be measured
      # path must be relative to repo root
      # comparator only runs if that path exists
      path: build/artifact

    # there can be multiple custom comparators
    # name defaults to the path
    # path can include glob patterns
    - path: "artifact-*.tgz"
      # run some custom build command before measuring
      script: npm install
      # limits can be configured as well
      limits:
        fail: 10 MB
```

## Comparators reference

- [git](#git)
- [node_modules](#node_modules)
- [npm_package](#npm_package)
- [custom](#custom)

### git

Compares the size of the git repository by measuring the total size of the checked out folder (without the `.git` folder or any build artifacts since it runs first on a clean checkout). Useful to detect if large files are added to the repo.

Name: `git`

Trigger: Runs if a `.git` directory is found.

Details: Shows the largest files (git objects) in the entire repository and added in the PR:

---
Largest files:
```
Largest files in repository checkout:

   356KiB package-lock.json
    26KiB README.md
    11KiB LICENSE
   5.8KiB lib/compare.js
   5.8KiB lib/checkout.js
   5.0KiB test/mocha-capture-console.js
   4.7KiB test/cli.test.js
   4.5KiB lib/report.js
   4.3KiB test/config.test.js
   3.8KiB lib/render.js

Largest files among new changes:

 3.0KiB CHANGELOG.md
```
---

### node_modules

Compares the size increase of Node.js dependencies by measuring the size of the `node_modules` folder. Helps to prevent addition of needlessly large dependencies and slowing down npm install times.

Name: `node_modules`

Trigger: Runs if a `package.json` is found.

Details: Prints the largest modules using [howfat](https://www.npmjs.com/package/howfat):

---
Largest production node modules:
```
@adobe/sizewatcher@1.3.0 (67 deps, 21.64mb, 2583 files, ©undefined)
╭───────────────────────┬──────────────┬──────────┬───────┬───────────┬────────────┬───────────╮
│ Name                  │ Dependencies │     Size │ Files │ Native    │ License    │ Deprec    │
├───────────────────────┼──────────────┼──────────┼───────┼───────────┼────────────┼───────────┤
│ @octokit/rest@19.0.3  │           25 │     11mb │   380 │           │ MIT        │           │
├───────────────────────┼──────────────┼──────────┼───────┼───────────┼────────────┼───────────┤
│ glob@10.3.5           │           27 │   3.08mb │   367 │           │ ISC        │           │
├───────────────────────┼──────────────┼──────────┼───────┼───────────┼────────────┼───────────┤
│ simple-git@3.22.0     │            4 │ 934.57kb │   142 │           │ MIT        │           │
├───────────────────────┼──────────────┼──────────┼───────┼───────────┼────────────┼───────────┤
│ js-yaml@4.1.0         │            1 │ 562.78kb │    40 │           │ MIT        │           │
├───────────────────────┼──────────────┼──────────┼───────┼───────────┼────────────┼───────────┤
│ xbytes@1.9.1          │              │  74.45kb │    11 │           │ Apache-2.0 │           │
├───────────────────────┼──────────────┼──────────┼───────┼───────────┼────────────┼───────────┤
│ tmp@0.2.3             │              │  53.08kb │     5 │           │ MIT        │           │
├───────────────────────┼──────────────┼──────────┼───────┼───────────┼────────────┼───────────┤
│ debug@4.4.0           │            1 │  48.36kb │    11 │           │ MIT        │           │
├───────────────────────┼──────────────┼──────────┼───────┼───────────┼────────────┼───────────┤
│ deepmerge@4.3.1       │              │  30.43kb │    11 │           │ MIT        │           │
├───────────────────────┼──────────────┼──────────┼───────┼───────────┼────────────┼───────────┤
│ require-dir@1.2.0     │              │  16.87kb │    40 │           │ MIT        │           │
├───────────────────────┼──────────────┼──────────┼───────┼───────────┼────────────┼───────────┤
│ get-folder-size@5.0.0 │              │  11.65kb │     5 │           │ MIT        │           │
├───────────────────────┼──────────────┼──────────┼───────┼───────────┼────────────┼───────────┤
│ pretty-bytes@5.6.0    │              │  11.27kb │     5 │           │ MIT        │           │
╰───────────────────────┴──────────────┴──────────┴───────┴───────────┴────────────┴───────────╯
```

Configuration: supports `dir`

---

### npm_package

Compares the size of an npm package tarball by running `npm publish --dry-run`.

Name: `npm_package`

Trigger: Runs if a `package.json` is found.

Details: Prints the package contents and metadata using the output of `npm publish --dry-run`.

---
Package contents:

```
📦  @adobe/sizewatcher@1.0.0
=== Tarball Contents ===
11.3kB LICENSE
4.8kB  lib/checkout.js
5.2kB  lib/compare.js
1.7kB  lib/config.js
3.9kB  lib/comparators/custom.js
2.3kB  lib/comparators/git.js
2.6kB  lib/github.js
2.1kB  index.js
2.2kB  lib/comparators/node_modules.js
3.9kB  lib/render.js
4.6kB  lib/report.js
1.1kB  package.json
695B   CHANGELOG.md
23.9kB README.md
=== Tarball Details ===
name:          @adobe/sizewatcher
version:       1.0.0
package size:  18.6 kB
unpacked size: 70.3 kB
shasum:        80846caccca2194f3dd1122e8113206e20c202dc
integrity:     sha512-c3VjMQQvqcqN8[...]ybMS6kg2chjpA==
total files:   14
```

Configuration: supports `dir`

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
    path: src/somefile
```

If a build step is required first, use `script`:

```yaml
comparators:
  custom:
    path: "build/artifact-*.tgz"
    script: npm run build
```

To have multiple paths, with custom names:

```yaml
comparators:
  custom:
    - name: my artifact 1
      path: "build/artifact"
    - name: my artifact 2
      path: "build/artifact2"
```

Options:
- `path` (required) relative path to file or folder to measure; supports [glob patterns](https://www.npmjs.com/package/glob). make sure to use quotes in the yaml if you use glob patterns
- `name` (optional) custom label
- `script` (optional) shell command to run before measuring `path`
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

### How to release

How to create a new release of version `1.4` (as example):

1. Ensure all changes are merged to `main`
2. On `main` checkout, bump version in `package.json` to `1.4`
3. Run `npm publish --dry-run` to ensure all looks good
4. Commit straight to `main` like [here](https://github.com/adobe/sizewatcher/commit/4da848b6cc52a38f98203760f8f74e44a0ec77cd)
5. Create a new draft [release in Github](https://github.com/adobe/sizewatcher/releases)
   1. Nmae the release `1.4`
   2. Add release notes with new features, improvements, fixes
   3. Ensure github creates a tag `v1.4`
6. Save draft and check things look good
7. Publish the release
8. The [Publish Package to NPM](https://github.com/adobe/sizewatcher/actions/workflows/npm-publish.yml) Github action workflow should automatically release the new version to npmjs.com


## Licensing

This project is licensed under the Apache V2 License. See [LICENSE](LICENSE) for more information.
