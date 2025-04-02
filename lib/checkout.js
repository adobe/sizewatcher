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
// TODO: get rid of simple-git, replace with execSync('git ...') (sanitize user input!)
const Git = require("simple-git");
const { execSync } = require("child_process");

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
        debug(`- ignoring error in getDefaultBranch(): ${e.message}`);
    }
}

// works with branch names and commit hashes
async function hasRef(dir, branch) {
    try {
        await Git(dir).catFile(["commit", branch]);
        return true;
    } catch (e) {
        debug(`- git returned with non-zero exit code in hasRef(), treating as false: ${e.message}`);
        return false;
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
        || (await hasRef(dir, "main") && "main")
        || (await hasRef(dir, "trunk") && "trunk")
        || (await hasRef(dir, "master") && "master"); // eslint-disable-line no-return-await
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
    debug(`- git clone ${remoteUrl} into ${to}`);

    // 2. git clone remote url into new directory `to`
    await Git().clone(remoteUrl, to);

    // 3. checkout desired branch
    debug(`- git checkout '${branch}'...`);
    await Git(to).checkout(branch);
}

async function cloneLocalAndCheckout(from, to, branch) {
    const gitRoot = await getGitRoot(from);

    // local clone will preserve the HEAD (aka same branch)
    debug(`- local cloning ${gitRoot} into ${to}`);
    await Git().clone(gitRoot, to, { '--local'  : true });

    if (branch) {
        debug(`- checking out '${branch}'...`);
        await Git(to).checkout(branch);
    }
}

async function gitCheckoutBeforeAndAfter(gitDir, beforeBranch, afterBranch) {
    const resolvedBeforeBranch = await getBeforeBranch(gitDir, beforeBranch);
    debug(`resolved before branch '${beforeBranch || ""}' => '${resolvedBeforeBranch}'`);

    const resolvedAfterBranch = await getAfterBranch(gitDir, afterBranch);
    debug(`resolved after branch '${afterBranch || ""}' => '${resolvedAfterBranch}'`);

    if (resolvedBeforeBranch === resolvedAfterBranch) {
        return {
            before: {
                branch: resolvedBeforeBranch
            },
            after: {
                branch: resolvedAfterBranch,
            }
        };
    }

    const tempDir = tmp.dirSync({unsafeCleanup: true}).name;
    debug(`temporary directory: ${tempDir}`);

    // before checkout --------------------------------------------------------------

    const beforeDir = path.join(tempDir, "before");

    // we can use the faster local clone only if the "branch" is present locally
    if (await hasRef(gitDir, resolvedBeforeBranch)) {
        debug(`[before] using local cloning (because existing checkout already has '${resolvedBeforeBranch}')`);
        await cloneLocalAndCheckout(gitDir, beforeDir, resolvedBeforeBranch);
    } else {
        debug(`[before] using remote cloning (because existing checkout does not have '${resolvedBeforeBranch}')`);
        // ...otherwise need to do a full remote clone
        await cloneRemoteAndCheckout(gitDir, beforeDir, resolvedBeforeBranch);
    }

    debug(`[before] input branch   : ${beforeBranch || ""}`);
    debug(`[before] resolved branch: ${resolvedBeforeBranch}`);
    debug(`[before] actual ref     : ${await currentBranch(beforeDir)}`);
    const beforeSha = await currentSha(beforeDir);
    debug(`[before] actual sha     : ${beforeSha}`);

    debug(`[before] listing remotes:`);
    debug(execSync(`git remote -v`, { cwd: beforeDir }).toString());
    debug(`[before] git status:`);
    debug(execSync(`git status`, { cwd: beforeDir }).toString());
    debug(`[before] git branch list:`);
    debug(execSync(`git branch -l`, { cwd: beforeDir }).toString());

    // ensure beforeDir git also has full history with the new changes - needed for git comparator
    debug(`[before] ensure full history in beforeDir: git fetch origin ${resolvedAfterBranch}:${resolvedAfterBranch}...`);
    // await Git(beforeDir).fetch("origin", ["--all"]);
    execSync(`git fetch origin ${resolvedAfterBranch}:${resolvedAfterBranch}`, { cwd: beforeDir });
    // await Git(beforeDir).fetch("origin", resolvedBeforeBranch);
    // await Git(beforeDir).fetch("origin", resolvedAfterBranch);
    debug(`[before] git branch list:`);
    debug(execSync(`git branch -l`, { cwd: beforeDir }).toString());

    // after checkout --------------------------------------------------------------

    const afterDir = path.join(tempDir, "after");

    // always local clone after which preserves the HEAD
    // works well for CI checkouts where the checkout is in the after state already (unless afterBranch is specified)
    // if user specified afterBranch on cli, we will checkout that branch after cloning
    debug(`[after] local cloning${afterBranch ? ` and checking out '${afterBranch}'` : ""}`);
    await cloneLocalAndCheckout(gitDir, afterDir, afterBranch);

    debug(`[after] input branch   : ${afterBranch || ""}`);
    debug(`[after] resolved branch: ${resolvedAfterBranch}`);
    debug(`[after] actual ref     : ${await currentBranch(afterDir)}`);
    // TODO: fix this for GH actions with its PR merge commit replacing the actual last sha
    const afterSha = await currentSha(afterDir);
    debug(`[after] actual sha     : ${afterSha}`);

    debug("folders ready");

    return {
        before: {
            dir: beforeDir,
            branch: resolvedBeforeBranch,
            sha: beforeSha
        },
        after: {
            dir: afterDir,
            branch: resolvedAfterBranch,
            sha: afterSha
        }
    };
}

module.exports = gitCheckoutBeforeAndAfter;