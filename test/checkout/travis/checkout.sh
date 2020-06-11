#!/bin/sh

# checkout like travis ci

cd build
remote=$PWD/remote

git clone --depth=50 --branch=branch $remote checkout
cd checkout
git checkout -qf $1