/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

'use strict';

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const tmp = require("tmp");
tmp.setGracefulCleanup();
const sizewatcher = require("../lib/sizewatcher");
const config = require("../lib/config");
const originalExit = process.exit;
const { describe, it, beforeEach, afterEach } = require("node:test");
const { captured, exec } = require("./capture-console");

const PROJECT_DIR = path.resolve(".");

function cleanEnvVars() {
    delete process.env.CI;
    delete process.env.GITHUB_ACTIONS;
    delete process.env.GITHUB_BASE_REF;
    delete process.env.GITHUB_HEAD_REF;
    delete process.env.GITHUB_REPOSITORY;
    delete process.env.GITHUB_TOKEN;
    delete process.env.TRAVIS;
    delete process.env.TRAVIS_PULL_REQUEST;
    delete process.env.TRAVIS_PULL_REQUEST_BRANCH;
    delete process.env.TRAVIS_BRANCH;
    delete process.env.TRAVIS_REPO_SLUG;
    delete process.env.CIRCLECI;
    delete process.env.CIRCLE_BRANCH;
    delete process.env.CIRCLE_PULL_REQUEST;
    delete process.env.CIRCLE_PROJECT_USERNAME;
    delete process.env.CIRCLE_PROJECT_REPONAME;
}

function getBeforeSha(dir=".") {
    return fs.readFileSync(path.join(dir, "before.hash")).toString().trim();
}

function getAfterSha(dir=".") {
    return fs.readFileSync(path.join(dir, "commit.hash")).toString().trim();
}

function script(name) {
    return path.join(PROJECT_DIR, "test/scripts", name);
}

// write a .sizewatcher.yml into the current directory (the test repo) and reload config
function writeConfig(yaml) {
    fs.writeFileSync(path.join(process.cwd(), ".sizewatcher.yml"), yaml);
    config.reload();
}

// full sizewatcher runs can be longer
const TIMEOUT = { timeout: 20 * 1000 };

describe("cli e2e", function() {

    let lastExitCode;

    beforeEach(function() {
        cleanEnvVars();

        // switch into a clean new temporary directory
        const tmpDir = tmp.dirSync({unsafeCleanup: true}).name;
        process.chdir(tmpDir);
        // no .sizewatcher.yml here => default config
        config.reload();

        // track exit code
        lastExitCode = undefined;
        process.exit = code => lastExitCode = code;
    });

    afterEach(function() {
        process.exit = originalExit;

        cleanEnvVars();
    });

    it("help", TIMEOUT, captured(async (t, output) => {
        await sizewatcher(["-h"]);

        assert(output.stderr.includes("Usage: sizewatcher [<options>] [<before> [<after>]]"));

        assert.strictEqual(lastExitCode, 1, `exit code should be 1 but was ${lastExitCode}`);
    }));

    it("no git repo", TIMEOUT, captured(async (t, output) => {
        // running in empty directory which is not a git repo

        await sizewatcher();

        assert.strictEqual(lastExitCode, 1, `exit code should be 1 but was ${lastExitCode}`);
        assert(output.stderr.includes("Error: Not inside a git checkout"));
    }));

    it("identical branches", TIMEOUT, captured(async (t, output) => {
        await exec(script("identical-branch.sh"));

        await sizewatcher();

        assert.strictEqual(lastExitCode, undefined, `non-zero exit code: ${lastExitCode}`);
        assert(output.stdout.includes("Branches are identical, nothing to compare (main=main)."));
        assert(!output.stdout.includes("Comparing changes"));
    }));

    it("local branch no commit", TIMEOUT, captured(async (t, output) => {
        await exec(script("local-branch-no-commit.sh"));

        await sizewatcher();

        const beforeSha = getBeforeSha("..");
        const afterSha = getAfterSha("..");

        assert.strictEqual(lastExitCode, undefined, `non-zero exit code: ${lastExitCode}`);
        assert(output.stdout.match(new RegExp(`'main' \\(sha ${beforeSha}\\) => 'new' \\(sha ${afterSha}\\)`)));
        assert(output.stdout.includes("+ ✅  git: 0.0%"));
        assert(!output.stdout.includes('Largest files among new changes:'));
    }));

    it("local branch", TIMEOUT, captured(async (t, output) => {
        await exec(script("local-branch.sh"));

        await sizewatcher(["branch", "branch2"]);

        const beforeSha = getBeforeSha("..");
        const afterSha = getAfterSha("..");

        assert.strictEqual(lastExitCode, undefined, `non-zero exit code: ${lastExitCode}`);
        assert(output.stdout.match(new RegExp(`'branch' \\(sha ${beforeSha}\\) => 'branch2' \\(sha ${afterSha}\\)`)));
        // not validating actual percentage numbers because
        // size measurement is different in CircleCI vs. Github Actions (different Linux & file systems?)
        assert(output.stdout.includes(" git:"));
        // assert(output.stdout.includes("+ ✅  git: 26.0% (173 B => 218 B)"));
        assert(output.stdout.match(/Largest files among new changes:\n\n +14B file3\n\n\nDone./));
        // no github env vars => no reporting to github
        assert(output.stderr.includes("Error: Cannot identify github repository."));
    }));

    it("local branch with before commit sha", TIMEOUT, captured(async (t, output) => {
        await exec(script("local-branch.sh"));

        const beforeSha = getBeforeSha("..");
        const afterSha = getAfterSha("..");

        await sizewatcher([beforeSha, "branch2"]);

        assert.strictEqual(lastExitCode, undefined, `non-zero exit code: ${lastExitCode}`);
        assert(output.stdout.match(new RegExp(`'${beforeSha}' \\(sha ${beforeSha}\\) => 'branch2' \\(sha ${afterSha}\\)`)));
        assert(output.stdout.match(/Largest files among new changes:\n\n +14B file3\n\n\nDone./));
    }));

    it("local branch with size decrease", TIMEOUT, captured(async (t, output) => {
        await exec(script("local-branch.sh"));
        // the folder size includes the (platform dependent) directory entry size,
        // so the relative decrease is small on some file systems: cheer for any decrease
        writeConfig(`
limits:
  ok: 0%
`);

        // reverse comparison: branch2 (bigger) => branch (smaller)
        await sizewatcher(["branch2", "branch"]);

        const beforeSha = getAfterSha("..");
        const afterSha = getBeforeSha("..");

        assert.strictEqual(lastExitCode, undefined, `non-zero exit code: ${lastExitCode}`);
        assert(output.stdout.match(new RegExp(`'branch2' \\(sha ${beforeSha}\\) => 'branch' \\(sha ${afterSha}\\)`)));
        assert(output.stdout.includes("+ 🎉  git: -"));
        // the branch commit changed "file" (7 bytes)
        assert(output.stdout.match(/Largest files among new changes:\n\n +7B file\n\n\nDone./));
    }));

    it("local branch with default branch master", TIMEOUT, captured(async (t, output) => {
        await exec(`${script("default-branch.sh")} master`);

        await sizewatcher();

        const beforeSha = getBeforeSha("..");
        const afterSha = getAfterSha("..");

        assert.strictEqual(lastExitCode, undefined, `non-zero exit code: ${lastExitCode}`);
        assert(output.stdout.match(new RegExp(`'master' \\(sha ${beforeSha}\\) => 'branch' \\(sha ${afterSha}\\)`)));
    }));

    it("local branch with default branch trunk", TIMEOUT, captured(async (t, output) => {
        await exec(`${script("default-branch.sh")} trunk`);

        await sizewatcher();

        const beforeSha = getBeforeSha("..");
        const afterSha = getAfterSha("..");

        assert.strictEqual(lastExitCode, undefined, `non-zero exit code: ${lastExitCode}`);
        assert(output.stdout.match(new RegExp(`'trunk' \\(sha ${beforeSha}\\) => 'branch' \\(sha ${afterSha}\\)`)));
    }));

    it("github actions PR", TIMEOUT, captured(async (t, output) => {
        process.env.CI = "true";
        process.env.GITHUB_ACTIONS = true;
        process.env.GITHUB_BASE_REF = "main";
        process.env.GITHUB_HEAD_REF = "branch2";

        await exec(script("fork.sh"));
        process.chdir("checkout");

        await sizewatcher();

        const beforeSha = getBeforeSha("..");
        const afterSha = getAfterSha("..");

        assert.strictEqual(lastExitCode, undefined, `non-zero exit code: ${lastExitCode}`);
        assert(output.stdout.match(new RegExp(`'main' \\(sha ${beforeSha}\\) => 'branch2' \\(sha ${afterSha}\\)`)));
        assert(output.stdout.includes("git:"));
        // this is meant to catch the whole git comparator "new changes" output
        assert(output.stdout.match(/Largest files among new changes:\n\n +14B file3\n\n\nDone./));
    }));

    it("unknown before branch", TIMEOUT, captured(async (t, output) => {
        // checkout with a remote, so that the unknown branch is looked up in the remote
        await exec(script("fork.sh"));
        process.chdir("checkout");

        await sizewatcher(["does-not-exist"]);

        assert.strictEqual(lastExitCode, 1, `exit code should be 1 but was ${lastExitCode}`);
        assert(output.stderr.includes("Error:"));
        assert(output.stderr.includes("does-not-exist"));
    }));

    it("no package.json in before branch", TIMEOUT, captured(async (t, output) => {
        await exec(script("no-package-json-before.sh"));

        await sizewatcher();

        assert.strictEqual(lastExitCode, undefined, `non-zero exit code: ${lastExitCode}`);
        assert(!output.any.includes("node_modules: measurement error"));
        assert(output.stdout.includes("+ ✅  node_modules:"));
        assert(output.stdout.match(/Largest files among new changes:\n\n +27B package.json\n\n/));
    }));

    it("no package.json in after branch", TIMEOUT, captured(async (t, output) => {
        await exec(script("no-package-json-after.sh"));

        await sizewatcher();

        assert.strictEqual(lastExitCode, undefined, `non-zero exit code: ${lastExitCode}`);
        assert(!output.any.includes("node_modules: measurement error"));
        assert(output.stdout.includes("+ ✅  node_modules:"));
        assert(!output.stdout.includes('Largest files among new changes:'));
    }));

    it("package.json with dependencies removed", TIMEOUT, captured(async (t, output) => {
        await exec(script("package-json-removed.sh"));

        await sizewatcher();

        assert.strictEqual(lastExitCode, undefined, `non-zero exit code: ${lastExitCode}`);
        assert(!output.any.includes("node_modules: measurement error"));
        assert(output.stdout.includes("+ 🎉  node_modules: -100.0%"));
        assert(!output.stdout.includes('Largest files among new changes:'));
    }));

    it("package.json with dependencies added", TIMEOUT, captured(async (t, output) => {
        await exec(script("package-json-added.sh"));

        await sizewatcher();

        assert.strictEqual(lastExitCode, undefined, `non-zero exit code: ${lastExitCode}`);
        assert(!output.any.includes("node_modules: measurement error"));
        assert(output.stdout.includes("+ ❌  node_modules: 100.0%"));
        assert(output.stdout.match(/Largest files among new changes:\n\n +64B package.json\n\n/));
    }));

    it("package.json with package-lock.json", TIMEOUT, captured(async (t, output) => {
        await exec(script("npm-lockfile.sh"));

        await sizewatcher();

        assert.strictEqual(lastExitCode, undefined, `non-zero exit code: ${lastExitCode}`);
        assert(!output.any.includes("node_modules: measurement error"));
        assert(output.stdout.includes("  node_modules:"));
        assert(output.stdout.includes("(no production dependencies)"));
        // private package => no npm_package comparator
        assert(!output.stdout.includes("npm_package:"));
    }));

    it("npm package added", TIMEOUT, captured(async (t, output) => {
        await exec(script("npm-package.sh"));

        await sizewatcher();

        assert.strictEqual(lastExitCode, undefined, `non-zero exit code: ${lastExitCode}`);
        assert(!output.any.includes("measurement error"));
        assert(output.stdout.includes("+ ❌  npm_package: 100.0% (0 B => "));
        assert(output.stdout.includes("Package contents:"));
        assert(output.stdout.includes("package size:"));
    }));

    it("npm packages in sub directories", TIMEOUT, captured(async (t, output) => {
        await exec(script("subdirs.sh"));
        writeConfig(`
comparators:
  npm_package:
    dir:
      - sub1
      - sub2
`);

        await sizewatcher();

        assert.strictEqual(lastExitCode, undefined, `non-zero exit code: ${lastExitCode}`);
        assert(!output.any.includes("measurement error"));
        // sub1 grew
        assert(output.stdout.match(/\+ .{1,2} {2}npm_package \[sub1\]: [1-9][0-9.]*% \(/), output.stdout);
        // sub2 is unchanged
        assert(output.stdout.includes("+ ✅  npm_package [sub2]: 0.0% ("));
        // no npm package in the root
        assert(!output.stdout.includes("  npm_package:"));
    }));

    it("npm package in single sub directory", TIMEOUT, captured(async (t, output) => {
        await exec(script("subdirs.sh"));
        writeConfig(`
comparators:
  npm_package:
    dir: sub2
`);

        await sizewatcher();

        assert.strictEqual(lastExitCode, undefined, `non-zero exit code: ${lastExitCode}`);
        assert(output.stdout.includes("+ ✅  npm_package [sub2]: 0.0% ("));
        assert(!output.stdout.includes("npm_package [sub1]"));
    }));

    it("disabled comparator", TIMEOUT, captured(async (t, output) => {
        await exec(script("package-json-added.sh"));
        writeConfig(`
comparators:
  node_modules: false
`);

        await sizewatcher();

        assert.strictEqual(lastExitCode, undefined, `non-zero exit code: ${lastExitCode}`);
        assert(output.stdout.includes("  git:"));
        assert(!output.stdout.includes("node_modules"));
    }));

    it("absolute and byte size limits", TIMEOUT, captured(async (t, output) => {
        await exec(script("local-branch.sh"));
        writeConfig(`
limits:
  fail: 1 MB
  warn: 20
  ok: -1%
`);

        await sizewatcher(["branch", "branch2"]);

        assert.strictEqual(lastExitCode, undefined, `non-zero exit code: ${lastExitCode}`);
        // after size is a few dozen bytes: below 1 MB (fail), but above 20 bytes (warn)
        assert(output.stdout.includes("+ ⚠️  git:"));
    }));

    describe("custom comparator", function() {

        it("with build script", TIMEOUT, captured(async (t, output) => {
            await exec(script("custom-comparator.sh"));
            writeConfig(`
comparators:
  custom:
    name: mine
    path: "build/*.bin"
    script: "mkdir -p build && cp size.txt build/out.bin"
`);

            await sizewatcher();

            assert.strictEqual(lastExitCode, undefined, `non-zero exit code: ${lastExitCode}`);
            assert(!output.any.includes("measurement error"));
            assert(output.stdout.includes("+ ❌  mine: 150.0% (100 B => 250 B)"));
            assert(output.stdout.match(/New size:\n\n +250 B build\/out.bin\n/), output.stdout);
        }));

        it("with multiple custom comparators", TIMEOUT, captured(async (t, output) => {
            await exec(script("custom-comparator.sh"));
            writeConfig(`
comparators:
  custom:
    - path: "dist/*.js"
    - name: nopath
    - name: absolute
      path: /tmp/does-not-matter
`);

            await sizewatcher();

            assert.strictEqual(lastExitCode, undefined, `non-zero exit code: ${lastExitCode}`);
            assert(!output.any.includes("measurement error"));
            // name falls back to the path
            assert(output.stdout.includes("+ ✅  dist/*.js: 0.0% (20 B => 20 B)"), output.stdout);
            assert(output.stdout.match(/New size:\n\n +20 B dist\/app.js\n/), output.stdout);
            // without path: silently skipped
            assert(!output.stdout.includes("nopath"));
            // absolute path: error, skipped
            assert(output.stderr.includes("Error: custom comparator path must be relative: /tmp/does-not-matter"));
            assert(!output.stdout.includes("absolute"));
        }));

        it("with failing script", TIMEOUT, captured(async (t, output) => {
            await exec(script("custom-comparator.sh"));
            writeConfig(`
comparators:
  custom:
    name: boom
    path: "build/*.bin"
    script: "exit 1"
`);

            await sizewatcher();

            // measurement errors are reported, but do not fail the run
            assert.strictEqual(lastExitCode, undefined, `non-zero exit code: ${lastExitCode}`);
            assert(output.stderr.includes("comparator boom failed:"));
            assert(output.stdout.includes("+ 🚨 boom: measurement error: `exit 1` failed with exit code 1"));
            // git comparator still ran
            assert(output.stdout.includes("  git:"));
        }));
    });
});
