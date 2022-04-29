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

        assert(this.stderr.output.includes("Usage: sizewatcher [<options>] [<before> [<after>]]"));

        assert.strictEqual(lastExitCode, 1);
    });

    it("no git repo", async function() {
        // running in empty directory which is not a git repo

        await sizewatcher();

        assert.strictEqual(lastExitCode, 1);
        assert(this.stderr.output.includes("Error: Not inside a git checkout"));
    });

    it("local branch", async function() {
        await exec(path.join(PROJECT_DIR, "test/scripts/local-branch.sh"));

        // we simulate a local repo and run, ensure these vars from CIs are not set
        delete process.env.GITHUB_BASE_REF;
        delete process.env.TRAVIS_PULL_REQUEST;
        delete process.env.TRAVIS_BRANCH;

        await sizewatcher();

        assert.strictEqual(lastExitCode, undefined);
        assert(this.stdout.output.includes("'main' => 'new'"));
        assert(this.stdout.output.includes("+ ✅  git: -0."));
    });

    it("fork PR (github actions", async function() {
        // await exec(path.join(PROJECT_DIR, "test/checkout/githubactions-fork"));

        // // we simulate a local repo and run, ensure these vars from CIs are not set
        // delete process.env.GITHUB_BASE_REF;
        // delete process.env.TRAVIS_PULL_REQUEST;
        // delete process.env.TRAVIS_BRANCH;

        // await sizewatcher();

        // assert.strictEqual(lastExitCode, undefined);
        // assert(this.stdout.output.includes("'main' => 'new'"));
        // assert(this.stdout.output.includes("+ ✅  git: -0."));
    });
});