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
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");
const { getFileSize, getFolderRegex } = require("../size");

async function getSize(dir) {
    debug(`calculating folder size of ${dir}...`);

    return getFileSize(dir, {
        // do not include .git folder
        ignore: getFolderRegex(path.join(dir, ".git"))
    });
}

async function getLargestCommits(dir, beforeBranch, afterBranch) {
    debug(`determining largest objects in commits between ${beforeBranch} and ${afterBranch}...`);
    // 1. we need to fetch the beforeBranch/sha because it might not be present in the afterDir checkout yet
    // 2. we then get the list of objects in the range
    // 3. calculate the size of each object
    // 4. sort the objects by size
    // 5. format the output nicely (human readable KiB, MiB, GiB, etc)
    return execSync(`git fetch -q origin ${beforeBranch} && \
        git rev-list --objects ${beforeBranch}..${afterBranch} \
        | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' \
        | sed -n 's/^blob //p' \
        | sort -r --numeric-sort --key=2 \
        | cut -c 1-12,41- \
        | $(command -v gnumfmt || echo numfmt) --field=2 --to=iec-i --suffix=B --padding=7 --round=nearest`, { cwd: dir }).toString();

    // Note: even if the command will fail this will not throw an error (because of the shell piping)
    //       this is ok because this is an informational output only
}

async function getLargestFiles(dir) {
    debug(`determining largest objects in repo...`);
    // 1. get the list of objects in the repo
    // 2. sort the objects by size
    // 3. show the top 10
    // 3. format the output nicely (human readable KiB, MiB, GiB, etc)
    return execSync(`git ls-tree -r --long HEAD \
        | sort --key 4 -n -r \
        | head -n 10 \
        | cut -c 53- \
        | $(command -v gnumfmt || echo numfmt) --field=1 --to=iec-i --suffix=B --padding=7 --round=nearest`, { cwd: dir }).toString();

    // Note: even if the command will fail this will not throw an error (because of the shell piping)
    //       this is ok because this is an informational output only
}

module.exports = {

    shouldRun: async function(beforeDir, afterDir) {
        return fs.existsSync(path.join(afterDir, ".git"));
    },

    compare: async function(before, after) {
        const beforeSize = await getSize(before.dir);
        const afterSize = await getSize(after.dir);

        const largestCommits = await getLargestCommits(after.dir, before.sha, after.sha);
        const largestFiles = await getLargestFiles(after.dir);

        let details = `Largest files in repository checkout:\n\n${largestFiles}\n`;
        if (largestCommits.length > 0) {
            details += `Largest files among new changes:\n\n${largestCommits}`;
        }

        return {
            beforeSize,
            afterSize,
            detailsLabel: "Largest files",
            details
        };
    }
};