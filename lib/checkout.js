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

const debug = require("debug")("sizewatcher");
const tmp = require("tmp");
tmp.setGracefulCleanup();
const path = require("path");
const Git = require("simple-git/promise");

async function currentBranch(dir) {
    const git = Git(dir);
    const branch = await git.revparse(["--abbrev-ref", "HEAD"]);
    if (branch === "HEAD") {
        // detached HEAD, get commit hash instead
        return git.revparse(["HEAD"]);
    }
    return branch;
}

async function getBeforeBranch(gitDir, branch) {
    // TODO: detect default branch:
    //       - makes request:
    //           git remote show origin | grep "HEAD branch" | cut -d ":" -f 2
    //       - go through list of candidates, main, trunk, master...

    // TODO: detect if CI environment to parse PR info
    // if (process.env.CI) { ...}

    return branch || "master";
}

async function getAfterBranch(gitDir, branch) {
    debug("current branch", await currentBranch(gitDir));
    debug("GITHUB_SHA", process.env.GITHUB_SHA);
    debug("GITHUB_REF", process.env.GITHUB_REF);
    return branch || process.env.TRAVIS_BRANCH || process.env.CIRCLE_BRANCH || process.env.GITHUB_REF || currentBranch(gitDir);
}

async function cloneAndCheckout(from, to, branch) {
    // 1. get remote url from existing checkout from CI (in `from` dir)
    const remoteUrl = (await Git(from).remote(["get-url", "origin"])).trim();
    debug(`cloning ${remoteUrl} into ${to}`);

    // 2. git clone remote url into new directory `to`
    await Git().clone(remoteUrl, to);

    // 3. checkout desired branch
    debug(`checking out '${branch}'...`);
    await Git(to).checkout(branch);
}

async function gitCheckoutBeforeAndAfter(gitDir, beforeBranch, afterBranch) {
    beforeBranch = await getBeforeBranch(gitDir, beforeBranch);
    afterBranch = await getAfterBranch(gitDir, afterBranch);

    debug(`cloning branches ${beforeBranch} (before) and ${afterBranch} (after)...`);

    const tempDir = tmp.dirSync({unsafeCleanup: true}).name;
    debug(`temporary directory: ${tempDir}`);

    const beforeDir = path.join(tempDir, "before");
    await cloneAndCheckout(gitDir, beforeDir, beforeBranch);

    const afterDir = path.join(tempDir, "after");
    await cloneAndCheckout(gitDir, afterDir, afterBranch);

    debug("folders ready");

    return {
        before: {
            dir: beforeDir,
            branch: beforeBranch
        },
        after: {
            dir: afterDir,
            branch: afterBranch
        }
    };
}

module.exports = gitCheckoutBeforeAndAfter;