-- "Generate now" pressed twice left two identical digests for the same day. The service now replaces
-- the day's digest; this keeps the newest of any that already exist and makes a duplicate impossible.
DELETE FROM digests d
 USING digests newer
 WHERE d.vc_firm_id = newer.vc_firm_id
   AND d.period_end = newer.period_end
   AND (d.created_at < newer.created_at OR (d.created_at = newer.created_at AND d.id < newer.id));

CREATE UNIQUE INDEX uq_digests_firm_day ON digests (vc_firm_id, period_end);
