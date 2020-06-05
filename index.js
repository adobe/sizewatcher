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

const { checkoutBranches, currentBranch } = require("./lib/checkout");
const CHECKERS = require('require-dir')("./lib/checkers");
const prettyBytes = require('pretty-bytes');

function printUsage() {
    console.log(`Usage: ${process.argv[1]} [<options>] [<before> [<after>]]`);
    console.log();
    console.log("Arguments:");
    console.log("  <before>   Before branch/commit for comparison. Defaults to 'master'.");
    console.log("  <after>    After branch/commit for comparison. Defaults to current branch.");
    console.log();
    console.log("Options:");
    console.log("  -h     Show help");
}

async function getAfterBranch(argv) {
    return argv[1] || process.env.TRAVIS_BRANCH || process.env.CIRCLE_BRANCH || currentBranch(process.cwd());
}

async function getBeforeBranch(argv) {
    const beforeBranch = argv[0] || "master";

    // TODO: detect if CI environment to parse PR info
    // if (process.env.CI) { ...}

    return beforeBranch;
}

async function runCheckers(beforeDir, afterDir, beforeBranch, afterBranch) {
    const results = [];

    for (const name of Object.keys(CHECKERS)) {
        const checker = CHECKERS[name];

        if (await checker.shouldRun(afterDir)) {
            console.log(`- ${name}`);
            const result = await checker.compare(beforeDir, afterDir, beforeBranch, afterBranch);
            results.push(result);
        }
    }

    return results;
}

async function handleResults(results) {
    for (const result of results) {
        result.percentIncrease = ((result.afterSize - result.beforeSize) / result.beforeSize * 100).toFixed(1);

        const sign = (result.afterSize > result.beforeSize) ? "+" : "";

        result.text = `${result.name}: ${sign}${result.percentIncrease}% (from ${prettyBytes(result.beforeSize)} to ${prettyBytes(result.afterSize)})`;
    }
    console.log(results);

    // TODO: report as PR comment
    // TODO: threshold / aggregation logic
    // TODO: report as status check
}

async function main(argv) {
    try {
        // yes, this should probably use a framework like oclif or yargs.
        // but cli arguments are very limited now and so manual handling is enough
        if (argv[0] === "-h") {
            printUsage();
            process.exit(1);
        }

        const afterBranch = await getAfterBranch(argv);
        const beforeBranch = await getBeforeBranch(argv);
        console.log(`comparing from ${beforeBranch} to ${afterBranch}`);

        const { beforeDir, afterDir } = await checkoutBranches(process.cwd(), beforeBranch, afterBranch);

        const results = await runCheckers(beforeDir, afterDir, beforeBranch, afterBranch);

        await handleResults(results);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

// TODO: detect master = master case
// TODO: cleanup checkout
// TODO: checkout unit tests (travis, circleci, local)

main(process.argv.slice(2));