#!/bin/sh

# simple clone + checkout

cd build
remote=$PWD/remote

# note: this tries to simulate a git clone with a remote transport
# using the local directory cloning
git clone -b main --no-hardlinks $remote checkout

cd checkout
git checkout branch
