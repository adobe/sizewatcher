#!/bin/sh

# checkout like circleci

cd build
remote=$PWD/remote
mkdir checkout
cd checkout

# note: this tries to simulate a git clone with a remote transport
# using the local directory cloning
git clone -b master --no-hardlinks $remote .

git config --local gc.auto 0
git fetch --force origin "branch:remotes/origin/branch"
git reset --hard "$1"
git checkout -q -B branch
git reset --hard "$1"
