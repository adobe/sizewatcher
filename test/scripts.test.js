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

const { execSync } = require("child_process");
const fs = require("fs");

function exec(dir, command) {
    execSync(command, {cwd: dir, stdio: 'inherit'});
}

const SCRIPT_DIR = "test/scripts";

describe("scripts", function() {

    // for each shell script found in the SCRIPT_DIR
    // dynamically register a test case (it()) that will just run the script
    fs.readdirSync(SCRIPT_DIR).forEach(file => {
        if (file.endsWith('.sh')) {
            it(file, async function() {
                this.timeout(30000);

                exec(SCRIPT_DIR, `./${file}`);
            });
        }
    });

    // TODO: explicit it() test cases, allowing nodejs code, with exec('test/scripts/foo.sh')
    // TODO: explicit it() test cases, allowing nodejs code, with exec('test/scripts/foo.sh')
    // TODO: explicit it() test cases, allowing nodejs code, with exec('test/scripts/foo.sh')
    // TODO: explicit it() test cases, allowing nodejs code, with exec('test/scripts/foo.sh')
    // TODO: explicit it() test cases, allowing nodejs code, with exec('test/scripts/foo.sh')
    // TODO: explicit it() test cases, allowing nodejs code, with exec('test/scripts/foo.sh')
    // TODO: explicit it() test cases, allowing nodejs code, with exec('test/scripts/foo.sh')
    // TODO: explicit it() test cases, allowing nodejs code, with exec('test/scripts/foo.sh')
    // TODO: figure out how to get coverage when doing main()
});