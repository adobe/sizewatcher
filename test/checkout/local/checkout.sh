#!/bin/sh

# plain local setup, no CI checkout
# used with custom before and after branches in command

cd build
remote=$PWD/remote

cp -R $remote checkout
cd checkout
