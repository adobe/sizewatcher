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

// checkout.js - identifies and checks out before/after revisions of a PR

const debug = require("debug")("sizewatcher");
const tmp = require("tmp");
tmp.setGracefulCleanup();
const path = require("path");
const Git = require("simple-git/promise");

async function getGitRoot(dir) {
    // --git-dir will return relative directories
    const gitRootDir = await Git(dir).revparse(["--git-dir"]);
    return path.resolve(dir, gitRootDir);
}

async function currentBranch(dir) {
    const git = Git(dir);
    const branch = await git.revparse(["--abbrev-ref", "HEAD"]);
    if (branch === "HEAD") {
        // detached HEAD, get commit hash instead
        return git.revparse(["HEAD"]);
    }
    return branch;
}

async function currentSha(dir) {
    const git = Git(dir);
    const sha = await git.revparse(["HEAD"]);
    return sha;
}

async function getDefaultBranch(dir) {
    try {
        const originInfo = await Git(dir).remote(["show", "origin"]);
        const m = originInfo.match(/HEAD branch: (.*)$/m);
        if (m) {
            return m[1];
        }
    } catch (e) {
        debug(`ignoring error in getDefaultBranch(): ${e.message}`);
    }
}

async function hasBranch(dir, branch) {
    try {
        await Git(dir).revparse(["--verify", branch]);
        return branch;
    } catch (e) {
        debug(`ignoring error in hasBranch(): ${e.message}`);
        return undefined;
    }
}

async function getPullRequestBaseBranch() {
    return process.env.GITHUB_BASE_REF
        || (process.env.TRAVIS_PULL_REQUEST !== "false" && process.env.TRAVIS_BRANCH);
}

async function getBeforeBranch(dir, branch) {
    return branch
        || await getPullRequestBaseBranch()
        || await getDefaultBranch(dir)
        || await hasBranch(dir, "main")
        || await hasBranch(dir, "trunk")
        || await hasBranch(dir, "master"); // eslint-disable-line no-return-await
}

async function getAfterBranch(dir, branch) {
    return branch
        || process.env.TRAVIS_PULL_REQUEST_BRANCH
        || process.env.TRAVIS_BRANCH
        || process.env.CIRCLE_BRANCH
        || process.env.GITHUB_HEAD_REF
        || await currentBranch(dir); // eslint-disable-line no-return-await
}

async function cloneRemoteAndCheckout(from, to, branch) {
    // 1. get remote url from existing checkout from CI (in `from` dir)
    const remoteUrl = (await Git(from).remote(["get-url", "origin"])).trim();
    debug(`cloning ${remoteUrl} into ${to}`);

    // 2. git clone remote url into new directory `to`
    await Git().clone(remoteUrl, to);

    // 3. checkout desired branch
    debug(`checking out '${branch}'...`);
    await Git(to).checkout(branch);
}

async function cloneLocalAndCheckout(from, to, branch) {
    const gitRoot = await getGitRoot(from);

    debug(`local cloning ${gitRoot} into ${to}`);
    await Git().clone(gitRoot, to, { local: true });

    debug(`checking out '${branch}'...`);
    await Git(to).checkout(branch);
}

async function gitCheckoutBeforeAndAfter(gitDir, beforeBranch, afterBranch) {
    debug(`retrieving before branch: ${beforeBranch}`);
    beforeBranch = await getBeforeBranch(gitDir, beforeBranch);
    debug(`retrieving after branch: ${afterBranch}`);
    afterBranch = await getAfterBranch(gitDir, afterBranch);
    if (beforeBranch === afterBranch) {
        return {
            before: {
                branch: beforeBranch
            },
            after: {
                branch: afterBranch,
            }
        };
    }

    debug(`cloning branches ${beforeBranch} (before) and ${afterBranch} (after)...`);

    const tempDir = tmp.dirSync({unsafeCleanup: true}).name;
    debug(`temporary directory: ${tempDir}`);

    const beforeDir = path.join(tempDir, "before");

    // we can use the faster local clone only if the "branch" is present locally
    if (await hasBranch(gitDir, beforeBranch)) {
        await cloneLocalAndCheckout(gitDir, beforeDir, beforeBranch);
    } else {
        // ...otherwise need to do a full remote clone
        await cloneRemoteAndCheckout(gitDir, beforeDir, beforeBranch);
    }

    const afterDir = path.join(tempDir, "after");

    // we can use the faster local clone only if the "branch" is present locally
    if (await hasBranch(gitDir, afterBranch)) {
        await cloneLocalAndCheckout(gitDir, afterDir, afterBranch);

        try {
            // need to ensure before branch is available under local name
            await Git(afterDir).branch([beforeBranch, "-t", `origin/${beforeBranch}`]);
        } catch (e) {
            debug("ignoring error", e);
        }
    } else {
        // ...otherwise need to do a full remote clone
        await cloneRemoteAndCheckout(gitDir, afterDir, afterBranch);
    }

    debug("folders ready");

    return {
        before: {
            dir: beforeDir,
            branch: beforeBranch
        },
        after: {
            dir: afterDir,
            branch: afterBranch,
            sha: await currentSha(afterDir)
        }
    };
}

module.exports = gitCheckoutBeforeAndAfter;