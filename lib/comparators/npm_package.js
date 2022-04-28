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

// comparators/npm_package.js - compares npm package (tarball) size

const debug = require("debug")("sizewatcher:node_modules");
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const path = require("path");
const fs = require("fs");
const xbytes = require("xbytes");

const PACKSIZE_REGEX = /package size: (.*)/;

async function getSize(dir) {
    if (!fs.existsSync(path.join(dir, "package.json"))) {
        return {
            size: 0
        };
    }

    debug(`running npm publish --dry-run inside ${dir}...`);
    let { stderr } = await exec("npm publish --dry-run", { cwd: dir });

    stderr = stderr.replace(/npm notice /g, "");

    const found = stderr.match(PACKSIZE_REGEX);
    const size = found ? xbytes.parseSize(found[1].trim()) : 0;

    return {
        size,
        output: stderr
    };
}

module.exports = {

    shouldRun: async function(beforeDir, afterDir) {
        const pkgJsonPath = path.join(afterDir, "package.json");
        if (!fs.existsSync(pkgJsonPath)) {
            return false;
        }

        const pkgJson = require(pkgJsonPath);
        if (pkgJson.private || !pkgJson.version) {
            debug("skpping npm_package: private package or no version in package.json");
            return false;
        }
        return true;
    },

    compare: async function(before, after) {
        const beforeResult = await getSize(before.dir);
        const afterResult = await getSize(after.dir);

        return {
            beforeSize: beforeResult.size,
            afterSize: afterResult.size,
            detailsLabel: "Package contents",
            details: afterResult.output
        };
    }
};