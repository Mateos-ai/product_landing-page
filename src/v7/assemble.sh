#!/bin/bash
# Concatenate v7 part files into the site's v7.css and v7.js (atomic writes).
# Order matters: core first, components by id, page parts, then ZZ-boot.js last.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"; P="$HERE/v7parts"; OUT="$(cd "$HERE/../.." && pwd)/site/assets"
ORDER="C1 C2 M0 M1 M3 M4 M5 M6 M7 M8 M9 M10 M11 M12 M13 M14 M15 M16 M17 M18 M19 M20 M21 M22 M23 K1 K2 S1 T1 P-HOME P-PROD P-IND P-INDX P-HWW P-SEC P-ABOUT P-HE P-HE2"
tc=$(mktemp "$OUT/.v7css.XXXX"); tj=$(mktemp "$OUT/.v7js.XXXX")
echo "/* Mateos v7 styles. Built from parts by assemble.sh; edit the parts, not this file. */" > "$tc"
echo "/* Mateos v7 motion and components. Built from parts by assemble.sh; edit the parts, not this file. */" > "$tj"
for id in $ORDER; do
  [ -f "$P/$id.css" ] && { cat "$P/$id.css"; echo; } >> "$tc"
  [ -f "$P/$id.js" ] && { cat "$P/$id.js"; echo ";"; } >> "$tj"
done
[ -f "$P/ZZ-boot.js" ] && cat "$P/ZZ-boot.js" >> "$tj"
mv "$tc" "$OUT/v7.css"; mv "$tj" "$OUT/v7.js"; chmod 644 "$OUT/v7.css" "$OUT/v7.js"
node --check "$OUT/v7.js" && echo "assembled: $(wc -c < "$OUT/v7.css") bytes css, $(wc -c < "$OUT/v7.js") bytes js"
