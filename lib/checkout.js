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

async function cloneAndCheckout(from, to, branch) {
    const git = Git();
    debug(`local clone into : ${to}`);
    await git.clone(from, to, { local: true });

    // if (branch === "HEAD") {
    //     debug("detached HEAD detected");
    //     // just keep ref
    //     return;
    // }

    const toGit = Git(to);

    const currentRef = await toGit.revparse(["HEAD"]);
    if (currentRef === branch) {
        return;
    }

    debug(`checking out '${branch}'...`);
    if (process.env.TRAVIS || process.env.GITHUB_ACTIONS) {
        // they do a minimal branch only & detached head checkout,
        // so we have to set remotes & fetch other branches manually
        debug("handling sparse checkout (travis or github actions)");
        const fromGit = Git(from);
        const remoteUrl = (await fromGit.remote(["get-url", "origin"])).trim();
        await toGit.remote(["set-url", "origin", remoteUrl]);
        await toGit.fetch("origin", `refs/heads/${branch}:refs/remotes/origin/${branch}`);
        await toGit.remote(["set-branches", "--add", "origin", branch]);
    }
    await toGit.checkout(branch);
}

async function checkoutBranches(checkoutDir, beforeBranch, afterBranch) {
    const tempDir = tmp.dirSync({unsafeCleanup: true}).name;
    debug(`temporary directory    : ${tempDir}`);

    const afterDir = path.join(tempDir, "after");
    await cloneAndCheckout(checkoutDir, afterDir, afterBranch);
    const beforeDir = path.join(tempDir, "before");
    await cloneAndCheckout(checkoutDir, beforeDir, beforeBranch);

    debug("folders ready");

    return { beforeDir, afterDir };
}

module.exports = {
    currentBranch,
    checkoutBranches
};