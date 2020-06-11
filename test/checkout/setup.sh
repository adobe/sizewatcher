#!/bin/sh

# create a "remote" repo with master plus another branch

rm -rf build
mkdir -p build/remote
cd build/remote
git init
git config --local user.email "you@example.com"
git config --local user.name "Your Name"
echo "hello" > file
git add file
git commit -a -m "initial commit"
git checkout -b branch 2> /dev/null
echo "hello world" > file
git commit -a -m "branch commit"
git rev-parse HEAD
