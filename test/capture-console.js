/*
 * Copyright 2022 Adobe. All rights reserved.
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

const captureLogs = require("./capture-stdout-stderr");
const { spawn } = require("child_process");

function printLogs() {
    return Boolean(process.env.TEST_PRINT_LOGS);
}

/**
 * Wraps a node:test test function so that all console output (stdout via console.log()
 * and friends, stderr including debug() output) is captured while the test runs.
 *
 * The wrapped function is called as fn(t, output) where `t` is the node:test TestContext
 * and `output` gives live access to the captured logs:
 *
 *     const { describe, it } = require("node:test");
 *     const { captured } = require("./capture-console");
 *
 *     describe("mysuite", () => {
 *         it("my test", captured(async (t, output) => {
 *             // run something
 *             assert(output.stdout.includes("something in stdout"));
 *             assert(output.stderr.includes("something in stderr"));
 *             assert(output.any.includes("something in stdout or stderr"));
 *         }));
 *     });
 *
 * If the test fails (throws or times out), the captured logs are replayed to stderr
 * so they show up in the test report. Passing tests stay silent.
 *
 * Environment variables:
 * - TEST_PRINT_LOGS=1         print all logs live during the test run (no replay on failure)
 * - TEST_LOG_DISABLE_COLOR=1  disable coloring of stderr lines (NO_COLOR works as well)
 */
function captured(fn) {
    return async function(t) {
        const session = captureLogs.start({ print: printLogs() });

        // on a timeout node:test aborts the signal but the test body keeps running,
        // so replay now and stop capturing before the next test starts
        const onAbort = () => {
            if (!printLogs()) {
                captureLogs.replay();
            }
            captureLogs.stop(session);
        };
        t.signal.addEventListener("abort", onAbort, { once: true });

        try {
            await fn(t, captureLogs.output);
        } catch (e) {
            if (!printLogs()) {
                captureLogs.replay();
            }
            throw e;
        } finally {
            t.signal.removeEventListener("abort", onAbort);
            captureLogs.stop(session);
        }
    };
}

/**
 * Executes a shell command as child process, using a shell.
 * Async function. Stdout and stderr of the child process are passed through
 * console.log() and console.error() so they are part of the captured logs.
 */
async function exec(command, dir) {
    const cmdArgs = command.split(" ");

    const proc = spawn(cmdArgs[0], cmdArgs.slice(1), {
        cwd: dir,
        shell: true
    });

    proc.stdout.on("data", (data) => console.log(data.toString('utf-8')));
    proc.stderr.on("data", (data) => console.error(data.toString('utf-8')));

    return new Promise((resolve, reject) => {
        proc.on("close", (code) => code !== 0 ? reject(code) : resolve());
        proc.on("error", reject);
    });
}

module.exports = {
    captured,
    exec
};
