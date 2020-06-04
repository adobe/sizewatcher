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

const debug = require("debug")("sizechecker");
const tmp = require("tmp");
tmp.setGracefulCleanup();
const path = require("path");
const Git = require("simple-git/promise");

async function currentBranch(dir) {
    return Git(dir).revparse(["--abbrev-ref", "HEAD"]);
}

async function cloneAndCheckout(from, to, branch) {
    const git = Git();
    debug(`local clone into : ${to}`);
    await git.clone(from, to, { local: true });

    const toGit = Git(to);
    debug(`checking out '${branch}'...`);
    if (process.env.TRAVIS) {
        debug(`special Travis handling`);
        // travis does a minimal branch only & detached head checkout
        const fromGit = Git(from);
        const remoteUrl = (await fromGit.remote(["get-url", "origin"])).trim();
        await toGit.remote(["set-url", "origin", remoteUrl]);
        await toGit.fetch("origin", `refs/heads/${branch}:refs/remotes/origin/${branch}`);
        await toGit.remote(["set-branches", "--add", "origin", branch]);
    }
    await toGit.checkout(branch);
}

async function checkout(checkoutDir, beforeBranch, afterBranch) {
    const tempDir = tmp.dirSync({unsafeCleanup: true}).name;
    debug(`temporary directory    : ${tempDir}`);

    const afterDir = path.join(tempDir, "after");
    await cloneAndCheckout(checkoutDir, afterDir, afterBranch);
    const beforeDir = path.join(tempDir, "before");
    await cloneAndCheckout(checkoutDir, beforeDir, beforeBranch);

    // const sourceGit = Git(checkoutDir);
    // const remoteUrl = (await sourceGit.remote(["get-url", "origin"])).trim();

    // const git = Git();
    // const afterDir = path.join(tempDir, "after");
    // debug(`local clone into after : ${afterDir}`);
    // await git.clone(checkoutDir, afterDir, { local: true });

    // const afterGit = Git(afterDir);
    // debug(`checking out '${afterBranch}' in after...`);
    // if (process.env.TRAVIS) {
    //     debug(`special Travis handling`);
    //     // travis does a minimal branch only & detached head checkout
    //     await afterGit.remote("set-url", "origin", remoteUrl);
    //     await afterGit.fetch("origin", `refs/heads/${afterBranch}:refs/remotes/origin/${afterBranch}`);
    //     await afterGit.remote(["set-branches", "--add", "origin", afterBranch]);
    // }
    // await afterGit.checkout(afterBranch);

    // const beforeDir = path.join(tempDir, "before");
    // debug(`local clone into before: ${beforeDir}`);
    // await git.clone(checkoutDir, beforeDir, { local: true });
    // await git.remote("set-url", "origin", remoteUrl);

    // const beforeGit = Git(beforeDir);
    // debug(`checking out '${beforeBranch}' in before...`);
    // if (process.env.TRAVIS) {
    //     debug(`special Travis handling`);
    //     await beforeGit.remote(["set-url", "origin", remoteUrl]);
    //     await beforeGit.fetch("origin", `refs/heads/${beforeBranch}:refs/remotes/origin/${beforeBranch}`);
    //     await beforeGit.remote(["set-branches", "--add", "origin", beforeBranch]);
    // }
    // await beforeGit.checkout(beforeBranch);

    debug(`folders ready`);

    return { beforeDir, afterDir };
}

module.exports = {
    currentBranch,
    checkout
};