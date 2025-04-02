#!/bin/sh

set -x

# checkout like github actions
# actions/checkout@v2 +

cd build
remote=$PWD/remote

cd remote
# GH creates another merge commit with the PR branch merged into main
git checkout main
git checkout -b pr-merge
git merge --no-ff $1 -m "Merge $(git rev-parse $1) into $(git rev-parse main)"
git show -1
SHA=$(git rev-parse HEAD)
cd ..

mkdir checkout
cd checkout

git init
git remote add origin $remote
git config --local gc.auto 0
git -c protocol.version=2 fetch --no-tags --prune --progress --no-recurse-submodules --depth=1 \
  origin +$SHA:refs/remotes/pull/1/merge
git checkout --progress --force refs/remotes/pull/1/merge
