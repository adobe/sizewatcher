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
const { spawn } = require('child_process');
const glob = require("glob");

async function spawnProcess(command, args, options) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, options);

        child.on("error", (err) => reject(err));
        child.on("exit", (code, signal) => {
            if (code !== 0) {
                let cmdString = command;
                if (args.length > 0) {
                    cmdString += ` ${args.join(" ")}`;
                }
                const err = new Error(`\`${cmdString}\` failed with exit code ${code}${signal ? `(received signal: ${signal})` : ""}`);
                err.exitCode = code;
                err.signal = signal;
                reject(err);
            }
            resolve();
        });
    });
}

async function runScript(script, path) {
    await spawnProcess(script, [], {
        shell: true,
        cwd: path,
        // log / pass-through all output
        stdio: "inherit"
    });
}

async function measure(baseDir, globPath, fileListing) {
    let total = 0;
    const files = glob.sync(path.join(baseDir, globPath));
    console.log(files);
    for (const file of files) {
        if (fs.existsSync(file)) {
            const fileSize = await du(file);
            total += fileSize;

            if (fileListing) {
                fileListing.push(`${pb(fileSize)} ${path.relative(baseDir, file)}`);
            }
        }
    }
    return total;
}

module.exports = {

    shouldRun: async function(beforeDir, afterDir) {
        if (!this.config.path || typeof this.config.path !== "string") {
            return false;
        }
        // if it has a script, we have to run (the script might create the files)
        if (typeof this.config.script === "string") {
            return true;
        }

        if (this.config.path.startsWith("/")) {
            console.error("Error: custom comparator path must be relative:", this.config.path);
            return false;
        }
        return glob.sync(path.join(beforeDir, this.config.path)).length > 0 ||
                glob.sync(path.join(afterDir, this.config.path)).length > 0;
    },

    compare: async function(before, after) {
        if (this.config.script) {
            debug(`running script in ${before.dir}: ${this.config.script}`);
            await runScript(this.config.script, before.dir);

            debug(`running script in ${after.dir}: ${this.config.script}`);
            await runScript(this.config.script, after.dir);
        }

        const fileListing = [];

        debug(`measuring ${this.config.path} in ${before.dir}...`);
        const beforeSize = await measure(before.dir, this.config.path);

        debug(`measuring ${this.config.path} in ${after.dir}...`);
        const afterSize = await measure(after.dir, this.config.path, fileListing);

        return {
            name: this.config.name || this.config.path,
            beforeSize,
            afterSize,
            detailsLabel: "New size",
            details: fileListing.join("\n")
        };
    }
};