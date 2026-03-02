import json
import sqlite3

print("Loading the heavy 74MB JSON library (this may take a few seconds)...")
with open('thaqalayn_complete.json', 'r', encoding='utf-8') as f:
    library = json.load(f)

print(f"Successfully loaded {len(library)} entries. Building the database...")

# Create the new, memory-light database
conn = sqlite3.connect('thaqalayn.db')
cursor = conn.cursor()

# Create a table that matches Pinecone's ID system
cursor.execute('''
    CREATE TABLE IF NOT EXISTS hadiths (
        id INTEGER PRIMARY KEY,
        raw_data TEXT
    )
''')

# Clear out any old data just in case
cursor.execute('DELETE FROM hadiths')

# Pack every entry into the database shelf
for i, item in enumerate(library):
    # We save it as a text string so Python doesn't have to parse it all at once later
    cursor.execute('INSERT INTO hadiths (id, raw_data) VALUES (?, ?)', (i, json.dumps(item, ensure_ascii=False)))

conn.commit()
conn.close()

print("Success! thaqalayn.db has been created and is ready for production.")