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

const gitCheckoutBeforeAndAfter = require("../lib/checkout");
const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const assert = require("assert");
const Git = require("simple-git/promise");

function exec(dir, command) {
    execSync(command, {cwd: dir, stdio: 'inherit'});
}

async function run(dir) {
    // prepare
    exec(dir, "../setup.sh");
    const commitSha = fs.readFileSync(path.join(dir, "build", "commit.hash")).toString().trim();
    exec(dir, `./checkout.sh ${commitSha}`);
    const checkoutDir = path.join(dir, path.normalize("build/checkout"));

    // test checkout logic
    const { before, after } = await gitCheckoutBeforeAndAfter(checkoutDir, "main");

    // assert
    assert.notEqual(before.dir, after.dir);
    assert(fs.existsSync(before.dir));
    assert(fs.existsSync(after.dir));
    assert.equal(await Git(before.dir).revparse(["--abbrev-ref", "HEAD"]), "main");
    assert.equal(await Git(after.dir).revparse(["HEAD"]), commitSha);
}

describe("checkout", function() {

    beforeEach(function() {
        delete process.env.GITHUB_ACTIONS;
        delete process.env.GITHUB_HEAD_REF;
        delete process.env.TRAVIS;
        delete process.env.TRAVIS_PULL_REQUEST_BRANCH;
        delete process.env.TRAVIS_BRANCH;
        delete process.env.CIRCLECI;
        delete process.env.CIRCLE_BRANCH;
    });

    it("handles normal checkouts", async function() {
        await run("test/checkout/normal");
    });

    it("handles travis checkouts", async function() {
        process.env.TRAVIS = true;
        await run("test/checkout/travis");
    });

    it("handles circleci checkouts", async function() {
        process.env.CIRCLECI = true;
        await run("test/checkout/circleci");
    });

    it("handles github action checkouts", async function() {
        process.env.GITHUB_ACTIONS = true;
        await run("test/checkout/githubactions");
    });
});