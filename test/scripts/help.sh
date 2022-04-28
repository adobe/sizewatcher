#!/bin/sh

# test help

set +e

help=$(DEBUG=sizewatcher* node ../../index.js -h)
code=$?
set -e

if [ "$code" != "1" ]; then
    echo "expected exit code 1, but got $code"
    exit 1
fi

if ! (echo "$help" | grep -F "Usage: sizewatcher [<options>] [<before> [<after>]]" > /dev/null) then
    echo "help output missing expected usage line"
    exit 1
fi