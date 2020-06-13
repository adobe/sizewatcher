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

const debug = require("debug")("sizewatcher:git");
const du = require("du");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

async function getSize(dir) {
    process.chdir(dir);
    debug(`calculating folder size of ${dir}/.git...`);
    return du(path.join(dir, ".git"));
}

async function largestCommits(dir, beforeBranch, afterBranch) {
    process.chdir(dir);
    debug(`determining object sizes in new commits...`);
    // get size of objects in the new commits
    return execSync(`git rev-list --objects ${beforeBranch}..${afterBranch} \
        | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' \
        | sed -n 's/^blob //p' \
        | sort -r --numeric-sort --key=2 \
        | cut -c 1-12,41- \
        | $(command -v gnumfmt || echo numfmt) --field=2 --to=iec-i --suffix=B --padding=7 --round=nearest`).toString();
}

module.exports = {

    shouldRun: async function(dir) {
        return fs.existsSync(path.join(dir, ".git"));
    },

    compare: async function(beforeDir, afterDir, beforeBranch, afterBranch) {
        const beforeSize = await getSize(beforeDir);
        const afterSize = await getSize(afterDir);
        // use beforeDir as this has both before and after branch available
        const details = await largestCommits(beforeDir, beforeBranch, afterBranch);

        return {
            name: "git repo",
            beforeSize,
            afterSize,
            details
        };
    }
};