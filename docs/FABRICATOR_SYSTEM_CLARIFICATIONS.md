# Fabricator System Clarifications

## Overview

This document provides clarifications on common system naming conventions and classifications in the Turkish and Egyptian aluminum fabrication markets.

---

## ROCK 60 Clarification

### What ROCK 60 Actually Is

**ROCK 60** does **NOT** refer to an aluminum profile system. Instead, it refers to:

- **Product Name:** ROCKWOOL Conrock® 60
- **Type:** Rigid stone wool insulation board
- **Application:** Acoustic panels and curtain wall systems
- **Purpose:** Thermal and acoustic insulation

### In the Context of Almona Portfolio Forge

In your platform, ROCK 60 should be classified as:

- **Category:** Accessory / Material
- **Not a Profile:** It is not a profile to be cut or machined
- **Usage:** Used within curtain wall systems to provide:
  - Thermal insulation
  - Acoustic insulation
  - Fire resistance (depending on grade)

### Technical Specifications (Example)

- **Thickness:** 60mm (standard)
- **Material:** Stone wool
- **Density:** Varies by grade
- **Thermal Conductivity:** ~0.035 W/m·K
- **Application:** Installed between curtain wall panels

### Implementation Recommendation

When users reference "ROCK 60" in your system:

1. **Do NOT** create it as a profile system
2. **DO** create it as an accessory/material in the `FabricatorAccessory` table
3. **DO** link it to curtain wall system packs
4. **DO** include it in BOM (Bill of Materials) for curtain wall projects

---

## YILMAZ W60 Clarification

### What YILMAZ Actually Is

**YILMAZ** is **NOT** a profile manufacturer. Instead:

- **Company:** Yılmaz Makine (Yilmaz Machine)
- **Business:** Manufacturer of **machinery** for processing aluminum and UPVC profiles
- **Products:** CNC machines, profile processing centers, cutting machines

### What W60 Refers To

**W60** is a **generic building material category**, not a specific brand:

- **Type:** Uninsulated 60mm deep aluminum joinery system
- **Classification:** Generic profile depth category
- **Not Brand-Specific:** Multiple manufacturers produce W60 profiles

### Common W60 Profile Suppliers

- Winperax
- Local Egyptian manufacturers
- Various Turkish manufacturers
- Generic/unbranded suppliers

### Yilmaz Machine Integration

Yilmaz machines (like the **AIM 7510 Profile Processing Center**) can process:

- W60 profiles (from any supplier)
- Other profile depths (W70, W80, etc.)
- Various profile systems

### In the Context of Almona Portfolio Forge

When users reference "YILMAZ W60":

1. **Profile System:** Create as "W60" (generic 60mm system)
2. **Machine Compatibility:** Link to Yilmaz machine export profiles
3. **CNC Integration:** Generate G-code compatible with Yilmaz machines
4. **Supplier:** Allow users to specify actual profile supplier (Winperax, etc.)

### Implementation Recommendation

1. **System Pack:** Create a generic "W60" system pack
2. **Machine Export:** Include Yilmaz machine export profile
3. **Profile Supplier:** Allow users to select actual supplier
4. **CNC Export:** Generate Yilmaz-compatible G-code for W60 profiles

---

## System Classification Guide

### Profile Systems (To Be Cut)

These are aluminum profiles that need to be cut and machined:

- ✅ PS 100, PS 9600, PS 6600 (Caluminium)
- ✅ Jumbo 100 (Elsherif)
- ✅ Kale 70 (Kale Kilit)
- ✅ ASAŞ Rescara RWT75, R50
- ✅ W60 (generic, from various suppliers)

### Accessories/Materials (Not Cut)

These are accessories or materials used in fabrication:

- ✅ ROCK 60 (ROCKWOOL insulation board)
- ✅ Hardware (hinges, locks, handles)
- ✅ Gaskets and seals
- ✅ Glass panels
- ✅ Fasteners

### Machinery (Export Compatibility)

These are machines that process profiles:

- ✅ Yilmaz machines (AIM 7510, etc.)
- ✅ Elumatec machines
- ✅ FOMM machines
- ✅ Emmegi machines

---

## Best Practices

1. **Always verify** if a reference is a profile system, accessory, or machine
2. **Use generic names** for common categories (W60, W70, etc.)
3. **Link suppliers** to generic systems where applicable
4. **Separate** profile systems from accessories in the database
5. **Include machine compatibility** in export profiles

---

## References

- ROCKWOOL Conrock® 60: [rockwool.com](https://www.rockwool.com)
- Yilmaz Machine: [yilmazmachine.com.tr](https://www.yilmazmachine.com.tr)
- Caluminium: [caluminium.com](https://www.caluminium.com)
- ASAŞ: [asastr.com](https://www.asastr.com)
- Kale Kilit: [kalekilit.com.tr](https://www.kalekilit.com.tr)

