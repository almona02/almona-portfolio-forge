# ALM 6510 Controller Acceptance Checklist

Binary `.mdb` files are only machine-ready after a witnessed import at a real
controller. This checklist is the bridge between the software (done) and the
workshop sign-off (human). Do not mark any binary export production-ready
until every box is ticked with dated evidence.

## 1. Workshop host setup (one time)

- [ ] Windows host has the Microsoft Access Database Engine 64-bit installed.
      Verify: the ODBC driver list contains
      `Microsoft Access Driver (*.mdb, *.accdb)`.
- [ ] Backend has `pyodbc` installed (`pip install -r requirements.txt`).
- [ ] Template created: `python -m scripts.create_alm6510_template` prints
      `ALM 6510 template ready`, run from `python_backend/`.
- [ ] Health proof: `POST /api/v2/alm6510/generate-mdb-file` with the
      two-cut sample from `tests/test_alm6510_export.py` returns HTTP 200,
      `X-Export-Format: mdb-binary-jet`, and a non-empty `.mdb` download.

## 2. File integrity (per release of the writer)

- [ ] Downloaded file opens in MS Access / MDB Viewer Plus.
- [ ] `Table1` exists with exactly the 38 interchange columns in order
      (see `TABLE1_COLUMNS` in `services/alm6510_mdb_writer.py`).
- [ ] Row count equals the cut count of the source optimization.
- [ ] First and last rows match the first and last cuts
      (LENGTH, BAR_NO, PICE_NO, LEFT_ANGLE, RIGHT_ANGLE).

## 3. Controller import (per machine model, starting with ALM-6510)

- [ ] File imports into the Yilmaz machine software with zero errors.
- [ ] Program/pose/customer fields display as sent (ORDER_NO, POSE_NO,
      CUSTOMER_CODE/NAME).
- [ ] Lengths and angles on screen match the cutting plan exactly,
      including the x10 scaling (e.g. 1500 mm shows as designed).
- [ ] A dry run (no stock) executes the full program without alarms.
- [ ] A first-article cut is measured: lengths within workshop tolerance,
      angles within workshop tolerance. Record both numbers below.

## 4. Sign-off

| Item              | Name | Date | Evidence (photo/measurement/log) |
|-------------------|------|------|----------------------------------|
| Host setup        |      |      |                                  |
| File integrity    |      |      |                                  |
| Controller import |      |      |                                  |
| First article     |      |      |                                  |

## 5. After sign-off (do not do before)

- Remove the amber "controller acceptance still required" notice from the
  production UI for the accepted machine model only.
- Record the accepted writer version (git SHA) and Table1 column hash here:

Accepted writer SHA: _______________
Table1 columns SHA: _______________
Machine model: _______________
