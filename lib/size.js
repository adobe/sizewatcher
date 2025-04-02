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

const debug = require("debug")("sizewatcher:size");

let _getFolderSize;

/**
 * Get the size of a folder or file
 *
 * @param {String} dir Path to the folder or file
 * @param {Object} options Supported options:
 *  - ignore: Regex pattern. Any file or folder with a path that matches the pattern will not be counted in the total folder size.
 * @returns {Promise<Number>} The size of the folder or file in bytes
 */
async function getFileSize(dir, options) {
    // lazy load get-folder-size due to ESM vs. CommonJS
    if (!_getFolderSize) {
        _getFolderSize = (await import("get-folder-size")).default;
    }

    const result = await _getFolderSize(dir, options);
    if (result.errors) {
        debug(`get-folder-size of ${dir} returned some errors:`, result.errors);
    }
    return result.size;
}

function escapeRegex(string) {
    return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
}

/**
 * Get a regex pattern that matches a directory and all its descendants.
 *
 * @param {String} dir Path to the directory
 * @returns {RegExp} The regex pattern
 */
function getFolderRegex(dir) {
    return new RegExp(`^${escapeRegex(dir)}(\\/.*)?$`);
}

/**
 * Get a regex pattern that matches a file exactly.
 *
 * @param {String} file Path to the file
 * @returns {RegExp} The regex pattern
 */
function getFileRegex(file) {
    return new RegExp(`^${escapeRegex(file)}$`);
}

module.exports = {
    getFileSize,
    getFolderRegex,
    getFileRegex
};
