-- Immutability layer 2 (charter §5): the tracking history is append-only at the
-- database level. Any UPDATE or DELETE on OrderStatusEvent raises an exception,
-- so even a direct SQL statement (bypassing the application) cannot rewrite
-- history. Layer 1 is the repository exposing only append()/list(); layer 3 is
-- the per-order SHA-256 hash chain. Proven by an e2e test.

CREATE OR REPLACE FUNCTION reject_order_status_event_mutation()
  RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION
    'OrderStatusEvent is append-only: % is not permitted', TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_order_status_event_no_update
  BEFORE UPDATE ON "OrderStatusEvent"
  FOR EACH ROW EXECUTE FUNCTION reject_order_status_event_mutation();

CREATE TRIGGER trg_order_status_event_no_delete
  BEFORE DELETE ON "OrderStatusEvent"
  FOR EACH ROW EXECUTE FUNCTION reject_order_status_event_mutation();
