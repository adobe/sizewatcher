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
const { getFileSize, getFolderRegex, formatIecSize } = require("../size");

async function getSize(dir) {
    debug(`calculating folder size of ${dir}...`);

    return getFileSize(dir, {
        // do not include .git folder
        ignore: getFolderRegex(path.join(dir, ".git"))
    });
}

// sort by size (largest first) and format nicely (human readable KiB, MiB, GiB, etc)
// note: sorting and formatting is done in JS and not using sort/numfmt in the shell,
// as these differ across platforms (e.g. uutils coreutils on ubuntu 26.04)
function formatFileList(files, limit) {
    return files
        .sort((a, b) => b.size - a.size)
        .slice(0, limit)
        .map(f => `${formatIecSize(f.size)} ${f.path}\n`)
        .join("");
}

async function getLargestCommits(dir, beforeBranch, afterBranch) {
    debug(`determining largest objects in commits between ${beforeBranch} and ${afterBranch}...`);
    // 1. we then get the list of objects in the range
    // 2. calculate the size of each object
    const output = execSync(`git rev-list --objects ${beforeBranch}..${afterBranch} \
        | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)'`, { cwd: dir }).toString();

    // Note: even if git rev-list fails this will not throw an error (because of the shell piping)
    //       this is ok because this is an informational output only

    // format: "blob <sha> <size> <path>"
    const files = [];
    for (const line of output.split("\n")) {
        const match = line.match(/^blob \S+ (\d+) (.*)$/);
        if (match) {
            files.push({ size: Number(match[1]), path: match[2] });
        }
    }
    return formatFileList(files);
}

async function getLargestFiles(dir) {
    debug(`determining largest objects in repo...`);
    const output = execSync("git ls-tree -r --long HEAD", { cwd: dir }).toString();

    // format: "<mode> <type> <sha> <padded size>\t<path>"
    // size is "-" for submodules (type commit)
    const files = [];
    for (const line of output.split("\n")) {
        const match = line.match(/^\S+ blob \S+ +(\d+)\t(.*)$/);
        if (match) {
            files.push({ size: Number(match[1]), path: match[2] });
        }
    }
    // show the top 10
    return formatFileList(files, 10);
}

module.exports = {

    shouldRun: async function(beforeDir, afterDir) {
        return fs.existsSync(path.join(afterDir, ".git"));
    },

    compare: async function(before, after) {
        const beforeSize = await getSize(before.dir);
        const afterSize = await getSize(after.dir);

        const largestFiles = await getLargestFiles(after.dir);
        const largestCommits = await getLargestCommits(before.dir, before.branch, after.branch);

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