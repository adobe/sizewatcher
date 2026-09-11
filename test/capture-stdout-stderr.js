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

"use strict";

// Captures console output during tests.
//
// stdout is captured on the console.log()/info()/debug() level and NOT by overriding
// process.stdout.write(): the node:test runner reports test results to its parent
// process through stdout, overriding it would swallow the results.
// stderr is captured by overriding process.stderr.write(), which also catches
// console.error()/warn() and the output of the debug module.
// Replayed or live printed logs always go to the original stderr.

const util = require("util");

function useColor() {
    if (process.env.NO_COLOR || process.env.TEST_LOG_DISABLE_COLOR) {
        return false;
    }
    if (process.env.FORCE_COLOR) {
        return true;
    }
    return Boolean(process.stderr.isTTY && typeof process.stderr.hasColors === "function" && process.stderr.hasColors());
}

function color(code, str) {
    return useColor() ? `\u001b[${code}m${str}\u001b[0m` : str;
}

function stderrColor(str) {
    return color(33, str);
}

function chunkToString(chunk) {
    if (typeof chunk === 'string') {
        return chunk;
    }
    return chunk.toString('utf8');
}

const original = {
    stderrWrite: process.stderr.write,
    log: console.log,
    info: console.info,
    debug: console.debug
};

function writeStderr(str) {
    original.stderrWrite.call(process.stderr, str);
}

const lines = [];
let print = false;
let currentSession = 0;

function record(std, str) {
    lines.push({ [std]: str });
    if (print) {
        writeStderr(std === "stderr" ? stderrColor(str) : str);
    }
}

function separator() {
    writeStderr(color(31, "-".repeat(80)) + "\n");
}

module.exports = {
    /**
     * Start capturing. Returns a session token to be passed to stop().
     * With option `print` set, logs are also printed live (to stderr).
     */
    start(options = {}) {
        lines.length = 0;
        print = Boolean(options.print);
        currentSession++;

        console.log = console.info = console.debug = (...args) => record("stdout", util.format(...args) + "\n");
        process.stderr.write = (chunk) => {
            record("stderr", chunkToString(chunk));
            return true;
        };

        return currentSession;
    },

    /**
     * Stop capturing. Ignored if `session` is not the current session, so that a
     * timed out test cannot stop the capturing of the test that runs after it.
     */
    stop(session) {
        if (session !== currentSession) {
            return;
        }
        console.log = original.log;
        console.info = original.info;
        console.debug = original.debug;
        process.stderr.write = original.stderrWrite;
        print = false;
    },

    get output() {
        return {
            get stdout() {
                return lines.map((l) => l.stdout || "").join("");
            },
            get stderr() {
                return lines.map((l) => l.stderr || "").join("");
            },
            get any() {
                return lines.map((l) => l.stdout || l.stderr).join("");
            }
        };
    },

    /**
     * Print all captured logs to stderr, framed by separator lines.
     */
    replay() {
        separator();
        for (const line of lines) {
            if (line.stdout) {
                writeStderr(line.stdout);
            } else if (line.stderr) {
                writeStderr(stderrColor(line.stderr));
            }
        }
        separator();
    }
};
