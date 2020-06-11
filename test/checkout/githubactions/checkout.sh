#!/bin/sh

set -x

# checkout like github actions

cd build
remote=$PWD/remote
mkdir checkout
cd checkout

git init
git remote add origin $remote
git config --local gc.auto 0
git -c protocol.version=2 fetch --no-tags --prune --progress --no-recurse-submodules --depth=1 \
  origin +$1:refs/remotes/pull/1/merge
git checkout --progress --force refs/remotes/pull/1/merge
