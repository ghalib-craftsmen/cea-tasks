#!/bin/bash
set -e

LAYER_DIR="layer"
PACKAGE_DIR="package"
LAYER_ZIP="layer.zip"
LAMBDA_ZIP="lambda.zip"

echo "Cleaning previous build..."
rm -rf "$LAYER_DIR" "$PACKAGE_DIR" "$LAYER_ZIP" "$LAMBDA_ZIP"

echo "Installing dependencies into layer..."
python3 -m pip install -r requirements.txt -t "$LAYER_DIR/python/" \
  --no-cache-dir \
  --platform manylinux2014_aarch64 \
  --implementation cp \
  --python-version 3.12 \
  --only-binary=:all:

echo "Creating layer zip..."
cd "$LAYER_DIR" && zip -r "../$LAYER_ZIP" . && cd ..

echo "Copying app..."
mkdir -p "$PACKAGE_DIR"
cp -r app    "$PACKAGE_DIR/app"
cp -r config "$PACKAGE_DIR/config"

echo "Creating lambda zip..."
cd "$PACKAGE_DIR" && zip -r "../$LAMBDA_ZIP" . && cd ..

echo "Done — $LAYER_ZIP and $LAMBDA_ZIP created."
