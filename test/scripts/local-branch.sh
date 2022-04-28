#!/bin/sh

# checkout local branch but without remote branch

rm -rf build
mkdir build
cd build

# setup new git repo
git init
# needed for git run in CI context where none of this is set
git config --local user.email "you@example.com"
git config --local user.name "Your Name"

echo "hello" > file
git add file
git commit -a -m "initial commit"

# new local branch
git checkout -b new
echo "hello2" > file

# run sizewatcher
DEBUG=sizewatcher* node ../../../index.js
