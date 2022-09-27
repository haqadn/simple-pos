#!/bin/bash

# This script is used to pack the files into a zip file.

rm simple-pos.zip

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