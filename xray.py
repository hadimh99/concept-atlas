import json

print("==================================================")
print("Scanning the raw API data for hidden Sub-Books...")
print("==================================================")

with open("thaqalayn_complete.json", "r", encoding="utf-8") as f:
    library = json.load(f)

# Print all the raw keys and values for the very first Hadith
print(json.dumps(library[0], indent=2, ensure_ascii=False))