# Supabase Setup Instructions

## Create the Database Table

1. Go to your Supabase dashboard: https://app.supabase.com/project/uhgcvarlagygvafcawnd
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Paste the following SQL and click "Run":

```sql
CREATE TABLE IF NOT EXISTS podcast_scripts (
  id SERIAL PRIMARY KEY,
  topic TEXT NOT NULL,
  speakers INTEGER NOT NULL,
  script_content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

5. After running the query, you should see a success message
6. You can verify the table was created by going to "Table Editor" and looking for `podcast_scripts`

## Test the Application

Once the table is created, refresh your browser and try generating a podcast again!
