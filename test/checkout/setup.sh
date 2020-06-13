#!/bin/sh

# create a "remote" repo with main plus another branch

rm -rf build

# custom template to use "main" as default branch
mkdir -p build/template
echo "ref: refs/heads/main" > build/template/HEAD

mkdir -p build/remote
cd build/remote
git init --template ../template
git config --local user.email "you@example.com"
git config --local user.name "Your Name"
echo "hello" > file
git add file
git commit -a -m "initial commit"
git checkout -b branch 2> /dev/null
echo "hello world" > file
git commit -a -m "branch commit"

# need the commit hash in the js code, and it's different each run
git rev-parse HEAD > ../commit.hash
