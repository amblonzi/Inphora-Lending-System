#!/usr/bin/env python3
"""
Upload 2026 loan applications to Tytahj Express backend.
Source: Loan_Applications__Tytahj_Express.csv
Target: https://tytahj.inphora.net/api/loans
"""

import pandas as pd
import requests
import json
import sys
from datetime import datetime

# ── Config ────────────────────────────────────────────────────────────────────
BASE_URL = "https://tytahj.inphora.net/api"
CSV_PATH = "Loan_Applications__Tytahj_Express.csv"

# Set your auth token here if the API requires it
AUTH_TOKEN = ""   # e.g. "Bearer eyJ..."

# ── Load & filter ─────────────────────────────────────────────────────────────
def load_2026_loans(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    df["Date Created"] = pd.to_datetime(df["Date Created"], dayfirst=True)
    df = df[df["Date Created"].dt.year == 2026].copy()

    # Strip currency formatting from money columns
    for col in ["Amount", "Processing Fee", "Repayable", "Repaid"]:
        df[col] = (
            df[col]
            .str.replace("Ksh", "", regex=False)
            .str.replace(",", "", regex=False)
            .str.strip()
            .astype(float)
            .astype(int)
        )

    df["Date Created"] = df["Date Created"].dt.strftime("%Y-%m-%d")
    df = df.drop(columns=["Action"], errors="ignore")
    return df.reset_index(drop=True)


# ── Map row → API payload ──────────────────────────────────────────────────────
def row_to_payload(row: pd.Series) -> dict:
    return {
        "loan_no":          int(row["Loan No"]),
        "customer_name":    row["Customer"].strip(),
        "loan_type":        row["Loan Type"].strip(),
        "loan_product":     row["Loan Product"].strip(),
        "loan_sequence":    row["Loan Sequence"].strip(),
        "amount":           int(row["Amount"]),
        "processing_fee":   int(row["Processing Fee"]),
        "repayable":        int(row["Repayable"]),
        "repaid":           int(row["Repaid"]),
        "applied_by":       row["Applied By"].strip(),
        "date_created":     row["Date Created"],
        "status":           row["Status"].strip(),
    }


# ── Upload ────────────────────────────────────────────────────────────────────
def upload_loans(df: pd.DataFrame):
    headers = {"Content-Type": "application/json"}
    if AUTH_TOKEN:
        headers["Authorization"] = AUTH_TOKEN

    endpoint = f"{BASE_URL}/loans"

    success, failed = 0, []

    for idx, row in df.iterrows():
        payload = row_to_payload(row)
        loan_no = payload["loan_no"]

        try:
            resp = requests.post(endpoint, json=payload, headers=headers, timeout=15)

            if resp.status_code in (200, 201):
                print(f"  [OK]  Loan {loan_no} — {payload['customer_name']}")
                success += 1
            else:
                print(f"  [FAIL] Loan {loan_no} — HTTP {resp.status_code}: {resp.text[:120]}")
                failed.append({"loan_no": loan_no, "status_code": resp.status_code, "error": resp.text})

        except requests.exceptions.RequestException as e:
            print(f"  [ERR]  Loan {loan_no} — {e}")
            failed.append({"loan_no": loan_no, "status_code": None, "error": str(e)})

    return success, failed


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    print(f"\n{'='*60}")
    print(f"  Tytahj Express — 2026 Loan Upload")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}\n")

    # Load data
    df = load_2026_loans(CSV_PATH)
    print(f"Loaded {len(df)} loans from 2026\n")

    # Preview
    print("Preview (first 3 rows):")
    for _, row in df.head(3).iterrows():
        print(f"  #{row['Loan No']}  {row['Customer']}  Ksh{row['Amount']:,}  {row['Status']}")
    print()

    # Confirm before uploading
    confirm = input(f"Upload all {len(df)} loans to {BASE_URL}? [y/N] ").strip().lower()
    if confirm != "y":
        print("Aborted.")
        sys.exit(0)

    print()
    success, failed = upload_loans(df)

    # Summary
    print(f"\n{'='*60}")
    print(f"  Done: {success}/{len(df)} uploaded successfully")
    if failed:
        print(f"  Failed ({len(failed)}):")
        for f in failed:
            print(f"    Loan {f['loan_no']}: {f['error'][:80]}")
    print(f"{'='*60}\n")

    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
