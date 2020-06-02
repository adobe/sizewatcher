#!/usr/bin/env node

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

const git = require("./lib/git");

async function main(argv) {
    // yes, this should probably use a framework like oclif or yargs.
    // but cli arguments are very limited now and so manual handling is enough
    if (argv[0] === "-h") {
        console.log(`Usage: ${process.argv[1]} [options] [BASE]`);
        console.log();
        console.log("  BASE   Base branch or commit ref to compare the current state to. Defaults to 'master'.");
        console.log();
        console.log("Options:");
        console.log("  -h     Show help");
        process.exit(1);
    }

    const baseBranch = argv[0] || "master";

    // TODO: detect if CI environment
    // if (process.env.CI) { ...}

    await git.checkout(baseBranch);
}

main(process.argv.slice(2));