#!/usr/bin/env bash
# Curate the app's "Popular" brands (checklist C6 / MT-3).
# Sets isPopular + popularityRank on manufacturers via the admin API — never touches the DB directly.
#
# Usage:
#   API=https://api.example.com TOKEN=<admin JWT> ./scripts/set-popular-brands.sh --dry-run
#   API=https://api.example.com TOKEN=<admin JWT> ./scripts/set-popular-brands.sh
#
# --dry-run prints what would be updated without writing anything.
# Requires: curl, jq. Idempotent — safe to re-run.

set -euo pipefail

API="${API:?set API, e.g. API=https://api.rahulsomraj.com}"
TOKEN="${TOKEN:?set TOKEN to a SUPER_ADMIN/ADMIN JWT}"
DRY_RUN=0
[ "${1:-}" = "--dry-run" ] && DRY_RUN=1

# category|displayName (matched case-insensitively, exact then substring)|rank
BRANDS="
two_wheeler|Hero|1
two_wheeler|Honda|2
two_wheeler|Bajaj|3
two_wheeler|TVS|4
two_wheeler|Royal Enfield|5
two_wheeler|Yamaha|6
two_wheeler|Suzuki|7
two_wheeler|KTM|8
two_wheeler|Ola Electric|9
two_wheeler|Ather|10
passenger_car|Maruti Suzuki|1
passenger_car|Hyundai|2
passenger_car|Tata|3
passenger_car|Mahindra|4
passenger_car|Toyota|5
passenger_car|Kia|6
passenger_car|Honda|7
passenger_car|Renault|8
passenger_car|Volkswagen|9
passenger_car|Skoda|10
commercial_vehicle|Tata|1
commercial_vehicle|Ashok Leyland|2
commercial_vehicle|Mahindra|3
commercial_vehicle|Eicher|4
commercial_vehicle|BharatBenz|5
commercial_vehicle|Force|6
"

fetch_category() {
  # page=1&limit=100 => the service returns ALL rows for the category (no pagination)
  curl -sf "$API/vehicle-inventory/manufacturers?page=1&limit=100&category=$1"
}

match_id() { # $1=list json, $2=name  -> prints "_id displayName" or nothing
  jq -r --arg n "$2" '
    .data as $d
    | ( [ $d[] | select((.displayName|ascii_downcase) == ($n|ascii_downcase)) ]
        + [ $d[] | select((.displayName|ascii_downcase) | contains($n|ascii_downcase)) ] )
    | unique_by(._id) | .[0] // empty | "\(._id)\t\(.displayName)"
  ' <<<"$1"
}

MISSES=()
CURRENT_CAT=""
LIST=""

while IFS='|' read -r cat name rank; do
  [ -z "${cat:-}" ] && continue
  if [ "$cat" != "$CURRENT_CAT" ]; then
    CURRENT_CAT="$cat"
    LIST=$(fetch_category "$cat")
    echo "== $cat ($(jq '.total' <<<"$LIST") manufacturers on server) =="
  fi
  HIT=$(match_id "$LIST" "$name")
  if [ -z "$HIT" ]; then
    echo "   MISS: '$name' not found in $cat"
    MISSES+=("$cat/$name")
    continue
  fi
  ID=$(cut -f1 <<<"$HIT"); MATCHED=$(cut -f2 <<<"$HIT")
  if [ "$DRY_RUN" = 1 ]; then
    echo "   would set: $MATCHED (rank $rank)  [$ID]"
  else
    RES=$(curl -sf -X PUT "$API/vehicle-inventory/manufacturers/$ID" \
      -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
      -d "{\"isPopular\": true, \"popularityRank\": $rank}")
    echo "   set: $MATCHED -> rank $rank  (isPopular=$(jq -r '.isPopular // .data.isPopular // "?"' <<<"$RES"))"
  fi
done <<<"$BRANDS"

echo
if [ ${#MISSES[@]} -gt 0 ]; then
  echo "Unmatched (fix names in this script or seed them): ${MISSES[*]}"
fi

echo "Verify ordering:"
for cat in two_wheeler passenger_car commercial_vehicle; do
  echo "-- $cat --"
  curl -sf "$API/vehicle-inventory/manufacturers?page=1&limit=12&category=$cat&sortBy=popularity" \
    | jq -r '.data[] | "\(.popularityRank)\t\(.isPopular)\t\(.displayName)"'
done
