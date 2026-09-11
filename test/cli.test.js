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
const originalExit = process.exit;
const { describe, it, beforeEach, afterEach } = require("node:test");
const { captured, exec } = require("./capture-console");

const PROJECT_DIR = path.resolve(".");

function cleanEnvVars() {
    delete process.env.CI;
    delete process.env.GITHUB_ACTIONS;
    delete process.env.GITHUB_BASE_REF;
    delete process.env.GITHUB_HEAD_REF;
    delete process.env.TRAVIS;
    delete process.env.TRAVIS_PULL_REQUEST_BRANCH;
    delete process.env.TRAVIS_BRANCH;
    delete process.env.CIRCLECI;
    delete process.env.CIRCLE_BRANCH;
}

function getBeforeSha(dir=".") {
    return fs.readFileSync(path.join(dir, "before.hash")).toString().trim();
}

function getAfterSha(dir=".") {
    return fs.readFileSync(path.join(dir, "commit.hash")).toString().trim();
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

    it("local branch no commit", TIMEOUT, captured(async (t, output) => {
        await exec(path.join(PROJECT_DIR, "test/scripts/local-branch-no-commit.sh"));

        // we simulate a local repo and run, ensure these vars from CIs are not set
        delete process.env.GITHUB_BASE_REF;
        delete process.env.TRAVIS_PULL_REQUEST;
        delete process.env.TRAVIS_BRANCH;

        await sizewatcher();

        const beforeSha = getBeforeSha("..");
        const afterSha = getAfterSha("..");

        assert.strictEqual(lastExitCode, undefined, `non-zero exit code: ${lastExitCode}`);
        assert(output.stdout.match(new RegExp(`'main' \\(sha ${beforeSha}\\) => 'new' \\(sha ${afterSha}\\)`)));
        assert(output.stdout.includes("+ ✅  git: 0.0%"));
        assert(!output.stdout.includes('Largest files among new changes:'));
    }));

    it("local branch", TIMEOUT, captured(async (t, output) => {
        await exec(path.join(PROJECT_DIR, "test/scripts/local-branch.sh"));

        // we simulate a local repo and run, ensure these vars from CIs are not set
        delete process.env.GITHUB_BASE_REF;
        delete process.env.TRAVIS_PULL_REQUEST;
        delete process.env.TRAVIS_BRANCH;

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
    }));

    it("github actions PR", TIMEOUT, captured(async (t, output) => {
        process.env.CI = "true";
        process.env.GITHUB_ACTIONS = true;
        process.env.GITHUB_BASE_REF = "main";
        process.env.GITHUB_HEAD_REF = "branch2";

        await exec(path.join(PROJECT_DIR, "test/scripts/fork.sh"));
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

    it("no package.json in before branch", TIMEOUT, captured(async (t, output) => {
        await exec(path.join(PROJECT_DIR, "test/scripts/no-package-json-before.sh"));

        await sizewatcher();

        assert.strictEqual(lastExitCode, undefined, `non-zero exit code: ${lastExitCode}`);
        assert(!output.any.includes("node_modules: measurement error"));
        assert(output.stdout.includes("+ ✅  node_modules:"));
        assert(output.stdout.match(/Largest files among new changes:\n\n +27B package.json\n\n/));
    }));

    it("no package.json in after branch", TIMEOUT, captured(async (t, output) => {
        await exec(path.join(PROJECT_DIR, "test/scripts/no-package-json-after.sh"));

        await sizewatcher();

        assert.strictEqual(lastExitCode, undefined, `non-zero exit code: ${lastExitCode}`);
        assert(!output.any.includes("node_modules: measurement error"));
        assert(output.stdout.includes("+ ✅  node_modules:"));
        assert(!output.stdout.includes('Largest files among new changes:'));
    }));

    it("package.json with dependencies removed", TIMEOUT, captured(async (t, output) => {
        await exec(path.join(PROJECT_DIR, "test/scripts/package-json-removed.sh"));

        await sizewatcher();

        assert.strictEqual(lastExitCode, undefined, `non-zero exit code: ${lastExitCode}`);
        assert(!output.any.includes("node_modules: measurement error"));
        assert(output.stdout.includes("+ 🎉  node_modules: -100.0%"));
        assert(!output.stdout.includes('Largest files among new changes:'));
    }));

    it("package.json with dependencies added", TIMEOUT, captured(async (t, output) => {
        await exec(path.join(PROJECT_DIR, "test/scripts/package-json-added.sh"));

        await sizewatcher();

        assert.strictEqual(lastExitCode, undefined, `non-zero exit code: ${lastExitCode}`);
        assert(!output.any.includes("node_modules: measurement error"));
        assert(output.stdout.includes("+ ❌  node_modules: 100.0%"));
        assert(output.stdout.match(/Largest files among new changes:\n\n +64B package.json\n\n/));
    }));
});