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
const xbytes = require('xbytes');
const path = require("path");

async function runComparator(comparator, before, after, deltas) {
    try {
        if (await comparator.shouldRun(before.dir, after.dir)) {
            console.log(`- ${comparator.name}`);
            const delta = await comparator.compare(before, after);
            // force same name for consistency with config
            delta.name = comparator.name;
            delta.config = comparator.config;

            deltas.push(delta);
        } else {
            debug(`skipping '${comparator.name}' because it detected it should not run`);
        }
    } catch (e) {
        console.error(`comparator ${comparator.name} failed:`, e);

        deltas.push({
            name: comparator.name,
            error: e
        });
    }
}

async function compare(before, after) {
    const deltas = [];

    console.log("Calculating size changes for");

    for (const name of Object.keys(COMPARATORS)) {
        const comparator = COMPARATORS[name];

        if (name === "custom") {
            // custom comparator, multiple could be configured
            let customConfigs = config.comparators.custom;
            if (!customConfigs) {
                continue;
            }
            if (!Array.isArray(customConfigs)) {
                customConfigs = [ customConfigs ];
            }
            for (const customConfig of customConfigs) {
                comparator.name = customConfig.name || customConfig.path;
                comparator.config = customConfig || {};
                await runComparator(comparator, before, after, deltas);
            }

        } else {
            // fixed comparators
            const comparatorConfig = config.comparators[name];
            if (comparatorConfig === false) {
                debug(`skipping '${name}' because disabled in config`);
                continue;
            }
            let dirs = ["."];
            if (comparatorConfig && comparatorConfig.dir) {
                if (Array.isArray(comparatorConfig.dir)) {
                    dirs = comparatorConfig.dir;
                } else {
                    dirs = [comparatorConfig.dir];
                }
            }
            for (const dir of dirs) {
                if (dir !== ".") {
                    comparator.name = `${name} [${dir}]`;
                } else {
                    comparator.name = name;
                }
                comparator.config = comparatorConfig || {};

                await runComparator(comparator, {
                    ...before,
                    dir: path.join(before.dir, dir)
                }, {
                    ...after,
                    dir: path.join(after.dir, dir)
                }, deltas);
            }
        }
    }

    deltas.before = before;
    deltas.after = after;

    return process(deltas);
}

function exceeds(value, increasePct, limit) {
    // percentage
    if (typeof limit === "string") {
        limit = limit.trim();
        if (limit.endsWith("%")) {
            // "50%" parses as 50
            return increasePct >= Number.parseInt(limit);
        } else {
            const bytes = xbytes.parseSize(limit);
            if (bytes === undefined) {
                return false;
            }
            return value >= bytes;
        }
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
        fail: 0,
        error: 0
    };

    for (const d of deltas) {
        if (d.error) {
            summary.error++;
            continue;
        }
        // merge limit config, comparator-specific one wins over global
        const limits = {
            ...config.limits,
            ...d.config.limits
        };

        let increase;
        if (d.beforeSize <= 0) {
            if (d.afterSize <= 0) {
                increase = 0;
            } else {
                increase = -100;
            }
        } else {
            increase = d.beforeSize <= 0 ? -100 : (d.afterSize - d.beforeSize) / d.beforeSize * 100;
        }
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
    if (summary.error >= 1) {
        deltas.summary = "error";
    } else if (summary.fail >= 1) {
        deltas.summary = "fail";
    } else if (summary.warn >= 1) {
        deltas.summary = "warn";
    } else if (summary.cheers >= 1) {
        deltas.summary = "cheers";
    }

    return deltas;
}

module.exports = compare;