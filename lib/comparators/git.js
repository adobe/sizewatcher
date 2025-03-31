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

// comparators/git.js - compares git repo size

const debug = require("debug")("sizewatcher:git");
const du = require("du");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

async function getSize(dir) {
    debug(`calculating folder size of ${dir}...`);
    const dotgitPath = path.join(dir, ".git/");
    return await du(dir, {
        filter: (dir) => {
            // do not include .git folder in size calculation
            return !dir.startsWith(dotgitPath);
        }
    });
}

async function getObjectCount(dir) {
    process.chdir(dir);
    debug(`determining repo metadata...`);
    return execSync(`git count-objects -H`).toString();
}

async function getLargestCommits(dir, beforeBranch, afterBranch) {
    process.chdir(dir);
    debug(`determining largest objects in new commits...`);
    return execSync(`git rev-list --objects ${beforeBranch}..${afterBranch} \
        | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' \
        | sed -n 's/^blob //p' \
        | sort -r --numeric-sort --key=2 \
        | cut -c 1-12,41- \
        | $(command -v gnumfmt || echo numfmt) --field=2 --to=iec-i --suffix=B --padding=7 --round=nearest`).toString();
}

async function getLargestFiles(dir) {
    process.chdir(dir);
    debug(`determining largest objects in repo...`);
    return execSync(`git ls-tree -r --long HEAD \
        | sort --key 4 -n -r \
        | head -n 10 \
        | cut -c 53- \
        | $(command -v gnumfmt || echo numfmt) --field=1 --to=iec-i --suffix=B --padding=7 --round=nearest`).toString();
}

module.exports = {

    shouldRun: async function(beforeDir, afterDir) {
        return fs.existsSync(path.join(afterDir, ".git"));
    },

    compare: async function(before, after) {
        const beforeSize = await getSize(before.dir);
        const afterSize = await getSize(after.dir);

        const objectCount = await getObjectCount(after.dir);
        const largestCommits = await getLargestCommits(after.dir, before.branch, after.sha);
        const largestFiles = await getLargestFiles(after.dir);

        let details = `Total repository size:\n\n${objectCount}\n`;
        details += `Largest files in repository:\n\n${largestFiles}\n`;
        if (largestCommits.length > 0) {
            details += `Largest objects & files in new changes:\n\n${largestCommits}`;
        }

        return {
            beforeSize,
            afterSize,
            detailsLabel: "Largest files",
            details
        };
    }
};