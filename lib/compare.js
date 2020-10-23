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

// compare.js - runs the comparators on the before/after checkouts

const debug = require("debug")("sizewatcher");
const config = require("./config").get();
const COMPARATORS = require('require-dir')("./comparators");

async function compare(before, after) {
    const deltas = [];

    console.log("Calculating size changes for");

    for (const name of Object.keys(COMPARATORS)) {
        const comparator = COMPARATORS[name];

        const comparatorConfig = config.comparators[name];
        if (comparatorConfig === false) {
            debug(`skipping '${name}' because disabled in config`);
            continue;
        }

        if (await comparator.shouldRun(after.dir)) {
            console.log(`- ${name}`);
            const delta = await comparator.compare(before, after);
            // force same name for consistency with config
            delta.name = name;
            deltas.push(delta);
        }
    }

    deltas.before = before;
    deltas.after = after;

    return process(deltas);
}

function exceeds(value, increasePct, limit) {
    // percentage
    if (typeof limit === "string") {
        // "50%" parses as 50
        return increasePct >= Number.parseInt(limit);
    } else {
        // absolute value
        return value >= limit;
    }
}

function process(deltas) {
    const summary = {
        cheers: 0,
        ok: 0,
        warn: 0,
        fail: 0
    };

    for (const d of deltas) {
        const comparatorConfig = config.comparators[d.name];
        // merge limit config, comparator-specific one wins over global
        const limits = {
            ...config.limits,
            ...comparatorConfig.limits
        };

        const increase = (d.afterSize - d.beforeSize) / d.beforeSize * 100;
        d.increase = increase.toFixed(1);

        if (exceeds(d.afterSize, increase, limits.fail)) {
            d.result = "fail";
            summary.fail++;

        } else if (exceeds(d.afterSize, increase, limits.warn)) {
            d.result = "warn";
            summary.warn++;

        } else if (exceeds(d.afterSize, increase, limits.ok)) {
            d.result = "ok";
            summary.ok++;

        } else {
            // decrease - yay
            d.result = "cheers";
            summary.cheers++;
        }
    }

    deltas.summary = "ok";
    if (summary.fail >= 1) {
        deltas.summary = "fail";
    } else if (summary.warn >= 1) {
        deltas.summary = "warn";
    } else if (summary.cheers >= 1) {
        deltas.summary = "cheers";
    }

    return deltas;
}

module.exports = compare;