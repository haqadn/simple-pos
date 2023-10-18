#!/bin/bash

# This script is used to pack the files into a zip file.

rm simple-pos.zip

# Bump version
# Extract the current version from simple-pos.php
current_version=$(awk -F' ' '/Version:/ {print $NF}' simple-pos.php)

# Increment the version
new_version=$(echo "$current_version + 0.1" | bc)

# Update the version in simple-pos.php
awk -v new_version="$new_version" -F' ' '/Version:/ {$NF=new_version} 1' simple-pos.php > temp.php && mv temp.php simple-pos.php

DIR="simple-pos"
rm -rf $DIR

mkdir $DIR
cp -r vendor $DIR
cp -r utils $DIR
cp simple-pos.php $DIR
mkdir $DIR/front-end
cp -pr front-end/dist $DIR/front-end/dist

zip -r simple-pos.zip $DIR

rm -rf $DIR