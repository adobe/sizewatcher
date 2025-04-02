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

// main cli entry point

const debug = require("debug")("sizewatcher");
const gitCheckoutBeforeAndAfter = require("./checkout");
const compare = require("./compare");
const report = require("./report");
const Git = require("simple-git");

function printUsage() {
    console.error(`Usage: sizewatcher [<options>] [<before> [<after>]]`);
    console.error();
    console.error("Arguments:");
    console.error("  <before>   Before branch/commit for comparison. Defaults to default branch or main/master.");
    console.error("  <after>    After branch/commit for comparison. Defaults to current branch.");
    console.error();
    console.error("Options:");
    console.error("  -h     Show help");
}

async function sizewatcher(argv) {
    try {
        if (!argv) argv = [];

        // yes, this should probably use a framework like oclif or yargs.
        // but cli arguments are very limited now and so manual handling is enough
        if (argv[0] === "-h") {
            printUsage();
            return process.exit(1);
        }

        debug(`Running inside ${process.cwd()}`);

        if (!await Git().checkIsRepo()) {
            throw new Error(`Not inside a git checkout: ${process.cwd()}`);
        }

        console.log(`Checking out git branches...`);
        const { before, after } = await gitCheckoutBeforeAndAfter(process.cwd(), argv[0], argv[1]);

        if (before.branch === after.branch) {
            console.log(`Branches are identical, nothing to compare (${before.branch}=${after.branch}). Compare selected branches using 'sizewatcher <before> <after>'.`);
            return process.exit();
        }

        console.log(`Comparing changes from '${before.branch}' (sha ${before.sha}) to '${after.branch}' (sha ${after.sha})\n`);

        const deltas = await compare(before, after);

        await report(deltas);

        console.log("Done. Cleaning up...");

    } catch (e) {
        debug(e);
        console.error("Error:", e.message || e);
        return process.exit(1);
    }
}

module.exports = sizewatcher;
