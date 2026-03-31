import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

conn = psycopg2.connect(
  dbname=os.getenv("POSTGRES_DB"),
  user=os.getenv("POSTGRES_USER"),
  password=os.getenv("POSTGRESS_PASSWORD"),
  host=os.getenv("POSTGRES_HOST"),
  port=os.getenv("POSTGRES_PORT"),
)
cur = conn.cursor()