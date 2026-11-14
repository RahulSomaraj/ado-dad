# Deploy — Sell flow (CREATE-06 + edit)

Covers: `GET /v2/sell/config`, `POST /v2/media/intents`, `POST /v2/media/:id/complete`,
hardened `POST /v2/ads`, `GET /v2/ads/:id/edit`, `PATCH /v2/ads/:id`, and the hourly media cleanup job.
Checklist of what was built: `BACKEND_FIX_CHECKLIST.md` → "SELL-FLOW (CREATE-06)".

---

## 1. Environment variables

| Variable | Required | Used by | Notes |
|---|---|---|---|
| `AWS_ACCESS_KEY_ID` | yes | `S3Service` | App **refuses to boot** without all four AWS vars |
| `AWS_SECRET_ACCESS_KEY` | yes | `S3Service` | |
| `AWS_REGION` | yes | `S3Service` | Also part of public URLs: `https://<AWS_S3_BUCKET_NAME>.s3.<AWS_REGION>.amazonaws.com/<key>` |
| `AWS_S3_BUCKET_NAME` | yes | `S3Service` | Bucket for `media/<userId>/<uuid>.<ext>` |
| `CHAT_MEDIA_HOSTS` | no | `S3Service.getMediaHosts` | Comma list of extra hosts (e.g. a CloudFront domain) accepted for legacy `data.images` URLs |
| `MEDIA_CLEANUP_DISABLED` | no | `MediaCleanupService` | `true` stops the hourly orphan sweep on this instance |
| `MONGO_URI` | yes | app | Must point at a **replica set** (see §4) |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` / `REDIS_DB` | yes | idempotency, throttles, cleanup lock, caches | `REDIS_PASSWORD` is mandatory when `NODE_ENV=production` (otherwise Redis is disabled: no idempotency, no throttles, cleanup never runs) |

No new npm dependencies.

### IAM permissions for the app's AWS key

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SellFlowMedia",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::<AWS_S3_BUCKET_NAME>/media/*"
    }
  ]
}
```
`HeadObject` (used by `/complete`) is authorised by `s3:GetObject`. The presigned PUT is signed with this key, so the key itself needs `s3:PutObject`.

---

## 2. S3 bucket policy (public read of `media/*`)

Add this statement to the bucket policy of `<AWS_S3_BUCKET_NAME>` (merge with existing statements — do not replace them):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadSellMedia",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::<AWS_S3_BUCKET_NAME>/media/*"
    }
  ]
}
```

- Bucket → Permissions → Block Public Access: "Block public access … through new/any public bucket policies" must be **off** for this statement to take effect (existing `uploads/` and `chat/` URLs already rely on public reads, so check what is configured today before changing anything).
- **Presigned PUT needs no public policy.** The URL is signed with the app's IAM key; S3 authorises it against that key's `s3:PutObject`. Only reads need to be public.
- Optional: lifecycle rule expiring `media/` objects that were never attached is not possible by tag today; the hourly cleanup job covers it.

## 3. S3 CORS

- **Native Android/iOS apps: not needed.** CORS is a browser rule.
- **Web clients (admin / ado-dad-web) uploading directly:** add

```json
[
  {
    "AllowedOrigins": ["https://<your-web-origin>"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

Also, for browsers calling the API: `Idempotency-Key` and `If-None-Match` are not in the API's CORS `allowedHeaders` (`src/main.ts`) — add them if a web client will send them.

## 4. MongoDB replica set

`POST /v2/ads` and `PATCH /v2/ads/:id` use `session.withTransaction()`. Transactions only work on a replica set or sharded cluster. A standalone `mongod` fails every create/edit with *"Transaction numbers are only allowed on a replica set member or mongos"* (returned as 500 `INTERNAL` with a `traceId`).

- Atlas: always a replica set — nothing to do.
- Self-hosted / docker: start with `--replSet rs0`, run `rs.initiate()` once, add `?replicaSet=rs0` to `MONGO_URI`.
- Check: `mongosh "$MONGO_URI" --eval 'db.hello().setName'` must print a name.

New collection `media` (indexes `owner`, `key` unique, `{owner,status}`, `{status,createdAt}`) is created by Mongoose on first boot when autoIndex is on; otherwise create them manually.

---

## 5. Rollout order

1. Confirm §1 env vars on the target (`.env.prod` / `.env.uat`), §4 replica set, §2 bucket policy.
2. Deploy backend (`npm ci && npm run build`, restart PM2). Watch logs for `S3Service` / Redis / Mongo errors.
3. Run the smoke tests below against the deployed host.
4. Release the Flutter build that uses the new endpoints. Old app versions keep working (legacy `images[]` on our bucket are still accepted).

### Smoke tests

```bash
API=https://<api-host>
TOKEN=<user access token>
AUTH="Authorization: Bearer $TOKEN"

# 1) Config (public) + ETag
curl -si "$API/v2/sell/config?category=private_vehicle" | head -20
ETAG=$(curl -si "$API/v2/sell/config?category=private_vehicle" | awk -F': ' 'tolower($1)=="etag"{print $2}' | tr -d '\r')
curl -si -H "If-None-Match: $ETAG" "$API/v2/sell/config?category=private_vehicle" | head -1   # expect 304

# 2) Upload intent for a local photo
FILE=./car.jpg
SIZE=$(wc -c < "$FILE" | tr -d ' ')
INTENT=$(curl -s -X POST "$API/v2/media/intents" -H "$AUTH" -H 'Content-Type: application/json' \
  -d "{\"kind\":\"ad_image\",\"contentType\":\"image/jpeg\",\"size\":$SIZE}")
echo "$INTENT"
MEDIA_ID=$(echo "$INTENT" | jq -r .mediaId)
UPLOAD_URL=$(echo "$INTENT" | jq -r .uploadUrl)

# 3) PUT the bytes to S3 (Content-Type must match exactly — it is signed)
curl -si -X PUT "$UPLOAD_URL" -H 'Content-Type: image/jpeg' --data-binary @"$FILE" | head -1   # expect 200

# 4) Complete → status uploaded, public url
curl -s -X POST "$API/v2/media/$MEDIA_ID/complete" -H "$AUTH" | jq
curl -sI "$(curl -s -X POST "$API/v2/media/$MEDIA_ID/complete" -H "$AUTH" | jq -r .url)" | head -1   # expect 200 (bucket policy)

# 5) Create with Idempotency-Key (replace ids with real inventory ids from the config/manufacturer endpoints)
KEY=$(uuidgen)
BODY=$(cat <<JSON
{ "category": "private_vehicle",
  "data": { "title": "2019 Maruti Suzuki Swift VXi", "description": "Single owner, full service history, new tyres.",
            "price": 450000, "location": "Kakkanad, Kochi", "latitude": 10.01, "longitude": 76.34,
            "mediaIds": ["$MEDIA_ID"] },
  "vehicle": { "vehicleType": "four_wheeler", "manufacturerId": "<id>", "modelId": "<id>", "year": 2019,
               "mileage": 42000, "transmissionTypeId": "<id>", "fuelTypeId": "<id>", "color": "White", "ownerCount": 1 } }
JSON
)
CREATED=$(curl -s -X POST "$API/v2/ads" -H "$AUTH" -H 'Content-Type: application/json' -H "Idempotency-Key: $KEY" -d "$BODY")
echo "$CREATED" | jq '{id, status}'
AD_ID=$(echo "$CREATED" | jq -r .id)
# replay → same body, no second ad
curl -s -X POST "$API/v2/ads" -H "$AUTH" -H 'Content-Type: application/json' -H "Idempotency-Key: $KEY" -d "$BODY" | jq .id

# 6) Edit form payload (owner only)
curl -s "$API/v2/ads/$AD_ID/edit" -H "$AUTH" | jq

# 7) Edit: change price, keep the photo, remove video
EDIT=$(curl -s "$API/v2/ads/$AD_ID/edit" -H "$AUTH" | jq '{category, data: (.data | del(.videoUrl) | .price = 440000 | .removeVideo = true), vehicle: (.vehicle | del(.manufacturerName, .modelName, .variantName))}')
curl -s -X PATCH "$API/v2/ads/$AD_ID" -H "$AUTH" -H 'Content-Type: application/json' -d "$EDIT" | jq '{id, status, price}'
curl -s "$API/v2/ads/$AD_ID" | jq '{price, previousPrice}'   # previousPrice 450000

# Negative checks
curl -s -X POST "$API/v2/ads" -H "$AUTH" -H 'Content-Type: application/json' -d '{"category":"private_vehicle","data":{}}' | jq   # 422 VALIDATION_FAILED with fields
curl -s "$API/v2/ads/$AD_ID/edit" -H "Authorization: Bearer <other user token>" | jq .code                                    # NOT_FOUND
```

## 6. Rollback

- **Code:** redeploy the previous build. All schema changes are additive or relax constraints (`commercialVehicleType` enum removed, `bodyType`/`payloadCapacity`/`axleCount`/two-wheeler `transmissionTypeId` optional, new optional `ownerCount`, `isFirstOwner` (commercial), `landAreaSqft`, `furnishing`). Old code reads these documents fine.
- **Data created by the new flow that old code may reject on v1 edit:** commercial ads with types outside the old enum (e.g. `auto_rickshaws`), and two-wheelers without a transmission — v1 `PATCH /ads/:id` validation may refuse to save them until fixed forward.
- **App:** a Flutter build that calls `/v2/sell/config`, `/v2/media/*`, `/v2/ads/:id/edit` or `PATCH /v2/ads/:id` breaks on the old backend (404). Roll back the app first, or keep the backend.
- **`media` collection / S3 `media/` objects:** safe to leave. Set `MEDIA_CLEANUP_DISABLED=true` if you want nothing deleted while investigating. Attached media URLs are stored on the ads themselves, so ads keep their photos even if the `media` collection is dropped.
- **Redis:** idempotency (`ads:v2:create:*`, 15 min) and throttle keys expire on their own; nothing to clean.

## 7. Open decisions

- Edits do **not** change `status` / `isApproved`. Should an edit to an approved ad send it back to moderation?
- Pending ads are readable by anyone with the id via `GET /v2/ads/:id`, not only the owner.
- Throttles count every attempt, including 422 responses (create 20/h, edit 60/h, intents 120/h per user).
