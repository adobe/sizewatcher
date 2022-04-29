#!/bin/sh

# simulate a fork PR in github actions

mkdir remote
cd remote
REMOTE=$PWD

# setup new git repo
git init --initial-branch=main
# needed for git run in CI context where none of this is set
git config --local user.email "you@example.com"
git config --local user.name "Your Name"

echo "hello" > file
git add file
git commit -a -m "initial commit"

# new local branch
git checkout -b branch
echo "hello2" > file
git commit -a -m "branch commit"

# need the commit hash in the js code, and it's different each run
git rev-parse HEAD > ../commit.hash
SHA=$(cat ../commit.hash)

# checkout like github actions
# actions/checkout@v2 and v3

cd ..
mkdir checkout
cd checkout

git init
git remote add origin $REMOTE
git config --local gc.auto 0
git -c protocol.version=2 fetch --no-tags --prune --progress --no-recurse-submodules --depth=1 \
  origin +$SHA:refs/remotes/pull/1/merge
git checkout --progress --force refs/remotes/pull/1/merge
