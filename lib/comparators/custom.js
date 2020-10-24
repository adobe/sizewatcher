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

// comparators/custom.js - compares custom path

const debug = require("debug")("sizewatcher:custom");
const du = require("du");
const path = require("path");
const fs = require("fs");
const pb = require('pretty-bytes');

module.exports = {

    getPath: function() {
        return this.config && this.config.path;
    },

    shouldRun: async function(beforeDir, afterDir) {
        const p = this.config && this.config.path;
        if (!p) {
            return false;
        }
        if (path.isAbsolute(p)) {
            console.error("Error: custom comparator path must be relative:", p);
            return false;
        }
        return fs.existsSync(path.join(beforeDir, p)) ||
               fs.existsSync(path.join(afterDir, p));
    },

    compare: async function(before, after) {
        debug(`measuring custom ${this.getPath()} in ${before.dir}...`);
        const beforePath = path.join(before.dir, this.getPath());
        const beforeSize = fs.existsSync(beforePath) ? await du(beforePath) : 0;

        debug(`measuring custom ${this.getPath()} in ${after.dir}...`);
        const afterPath = path.join(after.dir, this.getPath());
        const afterSize = fs.existsSync(afterPath) ? await du(afterPath) : 0;

        return {
            name: this.config.name || this.config.path,
            beforeSize,
            afterSize,
            detailsLabel: "New size",
            details: `${pb(afterSize)} ${this.config.path}`
        };
    }
};