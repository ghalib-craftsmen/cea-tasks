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
python3 -c "
import zipfile, os
with zipfile.ZipFile('$LAYER_ZIP', 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk('$LAYER_DIR'):
        for f in files:
            fp = os.path.join(root, f)
            zf.write(fp, os.path.relpath(fp, '$LAYER_DIR'))
"

echo "Copying app..."
mkdir -p "$PACKAGE_DIR"
cp -r app    "$PACKAGE_DIR/app"
cp -r config "$PACKAGE_DIR/config"

echo "Creating lambda zip..."
python3 -c "
import zipfile, os
with zipfile.ZipFile('$LAMBDA_ZIP', 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk('$PACKAGE_DIR'):
        for f in files:
            fp = os.path.join(root, f)
            zf.write(fp, os.path.relpath(fp, '$PACKAGE_DIR'))
"

echo "Done — $LAYER_ZIP and $LAMBDA_ZIP created."
