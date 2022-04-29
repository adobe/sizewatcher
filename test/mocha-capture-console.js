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
const supportsColor = require("supports-color");

function isCaptureConsole(ctx) {
    const test = ctx.test || ctx.currentTest;
    // setting on test wins over suite
    if (typeof test.captureConsole !== "undefined") {
        return test.captureConsole;
    }
    // setting on suite (test.parent) is used otherwise
    return test.parent.captureConsole;
}

function printLine() {
    if (supportsColor.stdout) {
        console.log(`\u001b[31m${"-".repeat(80)}\u001b[0m`);
    } else {
        console.log("-".repeat(80));
    }
}

function captureAfterEach() {
    if (isCaptureConsole(this)) {
        if (!process.env.TEST_PRINT_LOGS && this.currentTest.state !== 'passed') {
            printLine();
            captureLogs.replay();
            printLine();
        }
    }
}

function wrapTestFn(testFn) {
    return async function() {
        if (!isCaptureConsole(this)) {
            await testFn.apply(this);
            return;
        }

        this.output = captureLogs.output;
        this.stdout = captureLogs.stdout;
        this.stderr = captureLogs.stderr;

        try {
            captureLogs.start();


            if (process.env.TEST_PRINT_LOGS) {
                captureLogs.print = true;
            }

            await testFn.apply(this);

            captureLogs.stop();

        } catch (e) {
            captureLogs.stop();

            throw e;
        } finally {
            captureLogs.print = false;
        }
    };
}

function enableMochaCaptureConsole() {

    // wrap describe(), adding extensions
    const originalDescribe = global.describe;
    global.describe = function (name, fn) {
        return originalDescribe(name, function() {
            afterEach(captureAfterEach);
            fn.apply(this);
        });
    };
    global.describe.only = originalDescribe.only;
    global.describe.skip = originalDescribe.skip;

    // wrap it(), adding extensions
    const originalIt = global.it;
    global.it = function(name, testFn) {
        return originalIt(name, wrapTestFn(testFn));
    };
    global.it.only = originalIt.only;
    global.it.skip = originalIt.skip;
    global.it.retries = originalIt.retries;
}

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
    /**
     * Enables log capturing for mocha unit tests.
     *
     * -------------------------------------------------
     *
     * Enable on test suite:
     *
     *     describe("mysuite", function() {
     *         this.captureConsole = true;
     *         // ...
     *     });
     *
     * -------------------------------------------------
     *
     * Enable/disable on particular test case:
     *
     *     it("my test", function() {
     *         // test something
     *     }).captureConsole = true; // or false
     *
     * -------------------------------------------------
     *
     * Assert on test log output:
     *
     *     it("my test", function() {
     *         assert(this.output.stdout.includes("something in stdout"));
     *         assert(this.output.stderr.includes("something in stderr"));
     *         assert(this.output.any.includes("something in stdout or stderr"));
     *     }).captureConsole = true;
     *
     * -------------------------------------------------
     *
     * Print all logs during test runs:
     *
     * Set environment variable TEST_PRINT_LOGS=1 (any value)
     *
     *     TEST_PRINT_LOGS=1 npm test
     *
     * -------------------------------------------------
     *
     * Disable color (for stderr)
     *
     * Set environment variable TEST_LOG_DISABLE_COLOR=1 (any value)
     *
     *     TEST_LOG_DISABLE_COLOR=1 npm test
     *
     **/
    enableMochaCaptureConsole,

    /**
     * Executes a shell command as child process, using a shell.
     * Async function. Stdout and stderr of the child process will be
     * captured properly.
     */
    exec
};