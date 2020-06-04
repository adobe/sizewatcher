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

async function checkout(checkoutDir, beforeBranch, afterBranch) {
    const tempDir = tmp.dirSync({unsafeCleanup: true}).name;
    debug(`temporary directory    : ${tempDir}`);

    const git = Git();

    const afterDir = path.join(tempDir, "after");
    debug(`local clone into after : ${afterDir}`);
    await git.clone(checkoutDir, afterDir, { local: true });

    const afterGit = Git(afterDir);
    debug(`checking out '${afterBranch}' in after...`);
    await git.fetch("origin", afterBranch);
    await afterGit.checkout(afterBranch);

    const beforeDir = path.join(tempDir, "before");
    debug(`local clone into before: ${beforeDir}`);
    await git.clone(checkoutDir, beforeDir, { local: true });

    const beforeGit = Git(beforeDir);
    debug(`checking out '${beforeBranch}' in before...`);
    await git.fetch("origin", beforeBranch);
    await beforeGit.checkout(beforeBranch);

    debug(`folders ready`);

    return { beforeDir, afterDir };
}

module.exports = {
    currentBranch,
    checkout
};