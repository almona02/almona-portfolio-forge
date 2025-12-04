import asyncio
import os
import sys
from uuid import uuid4
from datetime import date

# Add python_backend to path to simulate app structure
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "python_backend"))

from core.supabase_client import supabase_client

# Use the raw client proxy for simple scripting (bypassing async pool complexity if desired)
# But since we are in async context, we can use the .client property which handles init
client = supabase_client.client

async def seed_egyptian_library():
    print("🚀 Starting Egyptian Library Seed...")

    # 1. Create System Packs (The 'Parents')
    # We'll use IDs that are easy to reference (TEXT based on previous fix)
    system_packs = [
        {
            "id": "alumil-m11000",
            "name": "Alumil M11000 Alutherm Plus",
            "description": "Thermal break system for windows and doors, ideal for Egyptian climate.",
            "manufacturer": "Alumil",
            "series_name": "M11000",
            "type": "window",
            "scope": "global",
            "is_active": True
        },
        {
            "id": "ps-9600",
            "name": "PS 9600",
            "description": "Economy sliding system, very popular in Egyptian mass housing.",
            "manufacturer": "Local Extrusion",
            "series_name": "PS9600",
            "type": "slider",
            "scope": "global",
            "is_active": True
        },
        {
            "id": "volcano-kitchen",
            "name": "Volcano Kitchen Profile",
            "description": "Standard kitchen cabinet profile system.",
            "manufacturer": "Volcano",
            "series_name": "Kitchen",
            "type": "window", # Technically furniture, but fits window logic
            "scope": "global",
            "is_active": True
        }
    ]

    print(f"📦 Seeding {len(system_packs)} System Packs...")
    for pack in system_packs:
        # Check if exists first to avoid duplicates
        existing = client.table("fabricator_system_packs").select("id").eq("id", pack["id"]).execute()
        if not existing.data:
            client.table("fabricator_system_packs").insert(pack).execute()
            print(f"   ✅ Created {pack['name']}")
        else:
            print(f"   ⚠️  Skipped {pack['name']} (Already exists)")

    # 2. Create Parametric Models
    models = [
        # --- ALUMIL M11000 ---
        {
            "name": "M11000 Turn-Tilt Window",
            "category": "window",
            "system_pack_id": "alumil-m11000",
            "preview_image_url": "https://placehold.co/600x400/png?text=M11000+Turn+Tilt",
            "metadata": {
                "type": "turn_tilt", 
                "sash_count": 1,
                "opening_direction": "inward"
            },
            "variants": [
                {
                    "variant_name": "Standard Bathroom",
                    "dimensions": {"width": 600, "height": 600},
                    "price_estimate": 4500.00,
                    "energy_rating": "B"
                },
                {
                    "variant_name": "Bedroom Single",
                    "dimensions": {"width": 1000, "height": 1200},
                    "price_estimate": 7800.00,
                    "energy_rating": "A"
                }
            ]
        },
        {
            "name": "M11000 Double Sash Balcony",
            "category": "door",
            "system_pack_id": "alumil-m11000",
            "preview_image_url": "https://placehold.co/600x400/png?text=M11000+Balcony",
            "metadata": {
                "type": "double_sash", 
                "sash_count": 2,
                "opening_direction": "inward"
            },
            "variants": [
                {
                    "variant_name": "Living Room Standard",
                    "dimensions": {"width": 1600, "height": 2200},
                    "price_estimate": 18500.00,
                    "energy_rating": "A"
                }
            ]
        },
        # --- PS 9600 ---
        {
            "name": "PS 9600 Sliding Window (2 Track)",
            "category": "slider",
            "system_pack_id": "ps-9600",
            "preview_image_url": "https://placehold.co/600x400/png?text=PS9600+Slider",
            "metadata": {
                "type": "sliding", 
                "track_count": 2,
                "sash_count": 2
            },
            "variants": [
                {
                    "variant_name": "Reception Large",
                    "dimensions": {"width": 2000, "height": 1200},
                    "price_estimate": 6500.00,
                    "energy_rating": "C"
                },
                {
                    "variant_name": "Kitchen Standard",
                    "dimensions": {"width": 1200, "height": 1000},
                    "price_estimate": 4200.00,
                    "energy_rating": "C"
                }
            ]
        }
    ]

    print(f"🖼️  Seeding {len(models)} Parametric Models...")
    for model in models:
        variants = model.pop("variants")
        
        # Insert Model
        # Check existence by name for simplicity
        existing_model = client.table("parametric_models").select("id").eq("name", model["name"]).execute()
        
        model_id = None
        if not existing_model.data:
            res = client.table("parametric_models").insert(model).execute()
            model_id = res.data[0]["id"]
            print(f"   ✅ Created Model: {model['name']}")
        else:
            model_id = existing_model.data[0]["id"]
            print(f"   ⚠️  Skipped Model: {model['name']} (Already exists)")

        # Insert Variants
        for variant in variants:
            variant["model_id"] = model_id
            # Check existence
            existing_variant = client.table("model_variants")\
                .select("id")\
                .eq("model_id", model_id)\
                .eq("variant_name", variant["variant_name"])\
                .execute()
                
            if not existing_variant.data:
                client.table("model_variants").insert(variant).execute()
                print(f"      🔹 Added Variant: {variant['variant_name']}")

    # 3. Create Grid Pricing
    # Alumil M11000 Pricing Matrix (Simplified)
    pricing_entries = [
        {
            "system_pack_id": "alumil-m11000",
            "dimension_w_min": 0, "dimension_w_max": 1000,
            "dimension_h_min": 0, "dimension_h_max": 1000,
            "base_price": 5000.00,
            "region_code": "EG"
        },
        {
            "system_pack_id": "alumil-m11000",
            "dimension_w_min": 1001, "dimension_w_max": 2000,
            "dimension_h_min": 0, "dimension_h_max": 1000,
            "base_price": 7500.00,
            "region_code": "EG"
        },
        # PS 9600 Pricing Matrix
        {
            "system_pack_id": "ps-9600",
            "dimension_w_min": 0, "dimension_w_max": 1500,
            "dimension_h_min": 0, "dimension_h_max": 1200,
            "base_price": 3500.00,
            "region_code": "EG"
        }
    ]
    
    print(f"💲 Seeding {len(pricing_entries)} Pricing Grid Entries...")
    for entry in pricing_entries:
        # Basic duplicate check
        existing = client.table("grid_pricing")\
            .select("id")\
            .eq("system_pack_id", entry["system_pack_id"])\
            .eq("base_price", entry["base_price"])\
            .execute()
            
        if not existing.data:
            client.table("grid_pricing").insert(entry).execute()
            print(f"   ✅ Added Price Grid: {entry['system_pack_id']} - {entry['base_price']} EGP")

    print("✨ Seeding Complete!")

if __name__ == "__main__":
    # Set stdout/stderr to utf-8
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
    asyncio.run(seed_egyptian_library())

