#!/bin/bash
# Shrinks every photo in the photos/ folder next to this script:
# longest side at most 1600 px, JPEG quality 80.
# Uses "sips", which is built into macOS. Nothing to install.
#
# How to run: double-click this file in Finder.
# If macOS refuses ("unidentified developer"): right-click → Open → Open.
#
# PNG and HEIC files are converted to .jpg with the same name.
# The original PNG/HEIC is deleted after a successful conversion,
# so put COPIES of your photos into photos/, not your only originals.

cd "$(dirname "$0")/photos" || { echo "photos/ folder not found"; read -r -p "Press Enter to close"; exit 1; }

MAX=1600
QUALITY=80
shopt -s nullglob nocaseglob

count=0
for f in *.jpg *.jpeg *.png *.heic; do
  w=$(sips -g pixelWidth "$f" | awk '/pixelWidth/ {print $2}')
  h=$(sips -g pixelHeight "$f" | awk '/pixelHeight/ {print $2}')
  long=$(( w > h ? w : h ))
  ext="${f##*.}"
  ext_lower=$(echo "$ext" | tr '[:upper:]' '[:lower:]')

  if [ "$ext_lower" = "jpg" ] || [ "$ext_lower" = "jpeg" ]; then
    # Skip JPEGs that are already small, so re-running does not lower quality again.
    if [ "$long" -le "$MAX" ]; then
      echo "ok      $f (${w}x${h})"
      continue
    fi
    sips -Z "$MAX" -s format jpeg -s formatOptions "$QUALITY" "$f" --out "$f" >/dev/null
    echo "resized $f"
  else
    out="${f%.*}.jpg"
    if [ "$long" -gt "$MAX" ]; then
      sips -Z "$MAX" -s format jpeg -s formatOptions "$QUALITY" "$f" --out "$out" >/dev/null
    else
      sips -s format jpeg -s formatOptions "$QUALITY" "$f" --out "$out" >/dev/null
    fi
    if [ -f "$out" ]; then
      rm "$f"
      echo "converted $f -> $out"
    fi
  fi
  count=$((count + 1))
done

echo
echo "Done. Changed $count file(s)."
read -r -p "Press Enter to close"
