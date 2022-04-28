#!/bin/sh

# checkout like travis ci

cd build
remote=$PWD/remote

git clone --depth=50 $remote checkout
cd checkout
git fetch origin +refs/heads/branch:
git checkout -qf $1