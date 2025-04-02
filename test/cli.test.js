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
const path = require("path");
const tmp = require("tmp");
tmp.setGracefulCleanup();
const sizewatcher = require("../lib/sizewatcher");
const originalExit = process.exit;
const { enableMochaCaptureConsole, exec } = require("./mocha-capture-console");
enableMochaCaptureConsole();

const PROJECT_DIR = path.resolve(".");

describe("cli e2e", function() {

    // full sizewatcher runs can be longer
    this.timeout(20 * 1000);

    this.captureConsole = true;

    let lastExitCode;

    beforeEach(function() {
        // switch into a clean new temporary directory
        const tmpDir = tmp.dirSync({unsafeCleanup: true}).name;
        process.chdir(tmpDir);

        // track exit code
        lastExitCode = undefined;
        process.exit = code => lastExitCode = code;
    });

    afterEach(function() {
        process.exit = originalExit;
    });

    it("help", async function() {
        await sizewatcher(["-h"]);

        assert(this.output.stderr.includes("Usage: sizewatcher [<options>] [<before> [<after>]]"));

        assert.strictEqual(lastExitCode, 1, `exit code should be 1 but was ${lastExitCode}`);
    });

    it("no git repo", async function() {
        // running in empty directory which is not a git repo

        await sizewatcher();

        assert.strictEqual(lastExitCode, 1, `exit code should be 1 but was ${lastExitCode}`);
        assert(this.output.stderr.includes("Error: Not inside a git checkout"));
    });

    it("local branch no commit", async function() {
        await exec(path.join(PROJECT_DIR, "test/scripts/local-branch-no-commit.sh"));

        // we simulate a local repo and run, ensure these vars from CIs are not set
        delete process.env.GITHUB_BASE_REF;
        delete process.env.TRAVIS_PULL_REQUEST;
        delete process.env.TRAVIS_BRANCH;

        await sizewatcher();

        assert.strictEqual(lastExitCode, undefined, `non-zero exit code: ${lastExitCode}`);
        assert(this.output.stdout.match(/'main' \(sha \S+\) => 'new' \(sha \S+\)/));
        assert(this.output.stdout.includes("+ ✅  git: 0.0%"));
        assert(!this.output.stdout.includes('Largest files among new changes:'));
    });

    it("local branch", async function() {
        await exec(path.join(PROJECT_DIR, "test/scripts/local-branch.sh"));

        // we simulate a local repo and run, ensure these vars from CIs are not set
        delete process.env.GITHUB_BASE_REF;
        delete process.env.TRAVIS_PULL_REQUEST;
        delete process.env.TRAVIS_BRANCH;

        await sizewatcher(["branch", "branch2"]);

        assert.strictEqual(lastExitCode, undefined, `non-zero exit code: ${lastExitCode}`);
        assert(this.output.stdout.match(/'branch' \(sha \S+\) => 'branch2' \(sha \S+\)/));
        assert(this.output.stdout.includes("+ ✅  git: 26.0% (173 B => 218 B)"));
        assert(this.output.stdout.match(/Largest files among new changes:\n\n +14B file3\n\n\nDone./));
    });

    it("fork PR (github actions)", async function() {
        process.env.CI = "true";
        process.env.GITHUB_ACTIONS = true;
        process.env.GITHUB_BASE_REF = "main";
        process.env.GITHUB_HEAD_REF = "branch2";

        await exec(path.join(PROJECT_DIR, "test/scripts/fork.sh"));
        process.chdir("checkout");

        await sizewatcher();

        assert.strictEqual(lastExitCode, undefined, `non-zero exit code: ${lastExitCode}`);
        assert(this.output.stdout.match(/'main' \(sha \S+\) => 'branch2' \(sha \S+\)/));
        assert(this.output.stdout.includes("git:"));
        // this is meant to catch the whole git comparator "new changes" output
        assert(this.output.stdout.match(/Largest files among new changes:\n\n +14B file3\n\n\nDone./));
    });

    it("no package.json in before branch", async function() {
        await exec(path.join(PROJECT_DIR, "test/scripts/no-package-json-before.sh"));

        await sizewatcher();

        assert.strictEqual(lastExitCode, undefined, `non-zero exit code: ${lastExitCode}`);
        assert(!this.output.any.includes("node_modules: measurement error"));
        assert(this.output.stdout.includes("+ ✅  node_modules:"));
        assert(this.output.stdout.match(/Largest files among new changes:\n\n +27B package.json\n\n/));
    });

    it("no package.json in after branch", async function() {
        await exec(path.join(PROJECT_DIR, "test/scripts/no-package-json-after.sh"));

        await sizewatcher();

        assert.strictEqual(lastExitCode, undefined, `non-zero exit code: ${lastExitCode}`);
        assert(!this.output.any.includes("node_modules: measurement error"));
        assert(this.output.stdout.includes("+ ✅  node_modules:"));
        assert(!this.output.stdout.includes('Largest files among new changes:'));
    });

    it("package.json with dependencies removed", async function() {
        await exec(path.join(PROJECT_DIR, "test/scripts/package-json-removed.sh"));

        await sizewatcher();

        assert.strictEqual(lastExitCode, undefined, `non-zero exit code: ${lastExitCode}`);
        assert(!this.output.any.includes("node_modules: measurement error"));
        assert(this.output.stdout.includes("+ 🎉  node_modules: -100.0%"));
        assert(!this.output.stdout.includes('Largest files among new changes:'));
    });

    it("package.json with dependencies added", async function() {
        await exec(path.join(PROJECT_DIR, "test/scripts/package-json-added.sh"));

        await sizewatcher();

        assert.strictEqual(lastExitCode, undefined, `non-zero exit code: ${lastExitCode}`);
        assert(!this.output.any.includes("node_modules: measurement error"));
        assert(this.output.stdout.includes("+ ❌  node_modules: 100.0%"));
        assert(this.output.stdout.match(/Largest files among new changes:\n\n +64B package.json\n\n/));
    });
});