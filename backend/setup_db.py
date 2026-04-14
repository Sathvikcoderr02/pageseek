"""
Run this once before `python manage.py migrate`.
It creates the PostgreSQL database if it doesn't exist yet.

Usage:
    python setup_db.py
"""

import os
import sys
from dotenv import load_dotenv
import psycopg2
from psycopg2 import sql
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

load_dotenv()

DB_NAME = os.getenv("DB_NAME", "booksearch")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")


def create_database():
    # Connect to the default 'postgres' maintenance database
    conn = psycopg2.connect(
        dbname="postgres",
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT,
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()

    # Check if the database already exists
    cursor.execute(
        "SELECT 1 FROM pg_database WHERE datname = %s", (DB_NAME,)
    )
    exists = cursor.fetchone()

    if exists:
        print(f"Database '{DB_NAME}' already exists — skipping creation.")
    else:
        cursor.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(DB_NAME)))
        print(f"Database '{DB_NAME}' created successfully.")

    cursor.close()
    conn.close()


if __name__ == "__main__":
    try:
        create_database()
    except psycopg2.OperationalError as e:
        print(f"Could not connect to PostgreSQL: {e}")
        print("Make sure PostgreSQL is running and your .env credentials are correct.")
        sys.exit(1)
