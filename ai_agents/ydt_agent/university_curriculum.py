"""
University-Grade Curriculum Structure for YDT Professor Agent
5-Module comprehensive course on AIM 7510 operation and maintenance
"""

from typing import Dict, List, Any
from dataclasses import dataclass
from enum import Enum


class Module(Enum):
    """Curriculum modules"""
    FUNDAMENTALS = "fundamentals"
    OPERATIONS = "operations"
    GCODE_PROGRAMMING = "gcode_programming"
    ADVANCED_APPLICATIONS = "advanced_applications"
    TROUBLESHOOTING = "troubleshooting"


@dataclass
class Lesson:
    """Lesson structure"""
    module: Module
    lesson_number: int
    title: str
    learning_objectives: List[str]
    content: str
    practical_example: str
    knowledge_check: Dict[str, str]  # {"question": "answer"}
    estimated_time: int  # minutes


@dataclass
class ModuleProgress:
    """Track user progress through modules"""
    module: Module
    completed_lessons: List[int]
    current_lesson: int
    quiz_score: float
    completed: bool


CURRICULUM_STRUCTURE = {
    Module.FUNDAMENTALS: {
        "title": "Machine Fundamentals",
        "description": "Learn the basics of AIM 7510 architecture, components, and safety",
        "lessons": [
            {
                "number": 1,
                "title": "Machine Overview & Architecture",
                "objectives": [
                    "Understand AIM 7510 5-axis CNC system",
                    "Identify main machine components",
                    "Learn machine specifications and capabilities"
                ],
                "content": """
AIM 7510 is a 5-axis servo-controlled machining center designed for:
- Drilling, grooving, notching, tapping, saw milling
- Aluminum & PVC profiles
- Light alloys and thin-walled steel profiles

Key Components:
- Mobile gantry with tool magazine (12 standard tools)
- Additional saw blade magazine (350mm diameter)
- 8 automatic clamps with recognition system
- 5-axis servo control system

Specifications:
- Max length: 7500mm
- Max width: 500mm
- Max height: 250mm
- Tool magazine: 16 tools
- Max spindle speed: 24000 RPM
- Max feed rate: 6000 mm/min
                """,
                "example": "Identify the tool magazine location and capacity",
                "quiz": {
                    "question": "How many axes does AIM 7510 have?",
                    "answer": "5 axes (X, Y, Z, A, C)"
                }
            },
            {
                "number": 2,
                "title": "Components & Systems",
                "objectives": [
                    "Understand electrical components",
                    "Learn pneumatic systems",
                    "Identify safety systems"
                ],
                "content": """
Electrical System:
- Main contactor (Q1): Controls power supply
- Relays (K1-K10): Control various functions
- Motors (M1-M6): Spindle and servo motors
- Sensors: Position, temperature, pressure

Pneumatic System:
- Air pressure: 6 bar required
- Clamps: 8 automatic clamps (C1-C8)
- Valves: Control air flow to clamps

Safety Systems:
- Emergency stop
- Safety interlocks
- Overload protection
                """,
                "example": "Locate the main contactor (Q1) in the electrical panel",
                "quiz": {
                    "question": "What air pressure is required?",
                    "answer": "6 bar"
                }
            },
            {
                "number": 3,
                "title": "Safety & Maintenance",
                "objectives": [
                    "Learn safety procedures",
                    "Understand maintenance schedules",
                    "Identify maintenance tasks"
                ],
                "content": """
Safety Procedures:
1. Always power OFF before maintenance
2. Check air pressure before startup
3. Verify all axes at home position
4. Use proper PPE (safety glasses, gloves)

Maintenance Schedule:
- Daily: Clean machine, check air pressure
- Weekly: Lubricate moving parts
- Monthly: Check electrical connections
- Yearly: Full system inspection

Common Maintenance Tasks:
- Clean tool magazine
- Check clamp operation
- Verify sensor calibration
- Inspect wiring connections
                """,
                "example": "Perform daily maintenance checklist",
                "quiz": {
                    "question": "What should you check daily?",
                    "answer": "Clean machine, check air pressure"
                }
            }
        ]
    },
    Module.OPERATIONS: {
        "title": "Operation Procedures",
        "description": "Master machine startup, workpiece setup, and basic operations",
        "lessons": [
            {
                "number": 1,
                "title": "Startup & Shutdown",
                "objectives": [
                    "Learn proper startup sequence",
                    "Understand shutdown procedure",
                    "Verify system initialization"
                ],
                "content": """
Startup Sequence:
1. Check air pressure (6 bar required)
2. Turn main switch ON (Q1 contactor)
3. Wait for system initialization (30 seconds)
4. Verify all axes at home position
5. Check tool magazine status
6. Verify clamp system ready

Shutdown Sequence:
1. Return all axes to home position
2. Stop spindle if running
3. Turn main switch OFF
4. Release air pressure (if needed)
                """,
                "example": "Perform complete startup sequence",
                "quiz": {
                    "question": "How long should you wait for initialization?",
                    "answer": "30 seconds"
                }
            },
            {
                "number": 2,
                "title": "Workpiece Setup",
                "objectives": [
                    "Learn workpiece positioning",
                    "Understand clamp operation",
                    "Set workpiece zero point"
                ],
                "content": """
Workpiece Setup Procedure:
1. Place profile in clamps C1-C8
2. Activate clamps via control panel
3. Verify clamping force (visual check)
4. Set workpiece zero point (G54)
5. Verify workpiece dimensions
6. Check for proper alignment

Clamp System:
- 8 automatic clamps
- Automatic recognition
- Position feedback
- Force monitoring
                """,
                "example": "Set up a 2000mm aluminum profile",
                "quiz": {
                    "question": "How many clamps are available?",
                    "answer": "8 clamps (C1-C8)"
                }
            },
            {
                "number": 3,
                "title": "Tool Management",
                "objectives": [
                    "Understand tool magazine",
                    "Learn tool change procedure",
                    "Manage tool inventory"
                ],
                "content": """
Tool Magazine:
- 12 standard tools + saw blade
- Automatic tool change
- Tool recognition system
- Tool life monitoring

Tool Change Procedure:
1. Move to tool change position
2. Select tool number (T1-T16)
3. Execute tool change (M06)
4. Verify tool loaded correctly
5. Check tool condition

Tool Management:
- Keep tools clean and sharp
- Monitor tool life
- Replace worn tools
- Maintain tool inventory
                """,
                "example": "Change from tool T1 to tool T5",
                "quiz": {
                    "question": "What command executes tool change?",
                    "answer": "M06"
                }
            },
            {
                "number": 4,
                "title": "Basic Operations",
                "objectives": [
                    "Learn cutting operations",
                    "Understand drilling procedures",
                    "Master milling techniques"
                ],
                "content": """
Cutting Operations:
- Profile cutting at various angles
- Miter cuts (0-180°)
- Length cutting
- Notching

Drilling Operations:
- Hole drilling
- Multiple hole patterns
- Depth control
- Peck drilling

Milling Operations:
- Grooving
- Pocketing
- Surface milling
- Contour milling
                """,
                "example": "Perform 45° miter cut on 2000mm profile",
                "quiz": {
                    "question": "What angles are supported?",
                    "answer": "0-180° in 15° increments"
                }
            }
        ]
    },
    Module.GCODE_PROGRAMMING: {
        "title": "G-Code Programming",
        "description": "Master G-code and M-code programming for AIM 7510",
        "lessons": [
            {
                "number": 1,
                "title": "G-Code Fundamentals",
                "objectives": [
                    "Understand G-code structure",
                    "Learn basic G-codes",
                    "Write simple programs"
                ],
                "content": """
G-Code Structure:
- Commands: G00, G01, G02, G03
- Coordinates: X, Y, Z, A, C
- Feed rates: F (mm/min)
- Spindle speed: S (RPM)

Basic G-Codes:
- G00: Rapid positioning
- G01: Linear interpolation
- G02: Circular interpolation (CW)
- G03: Circular interpolation (CCW)
- G21: Metric units
- G90: Absolute positioning
- G91: Relative positioning

Example Program:
G21        ; Metric units
G90        ; Absolute positioning
G00 X0 Y0 Z10  ; Rapid to start
G01 X100 F3000  ; Linear cut
                """,
                "example": "Write G-code for simple linear cut",
                "quiz": {
                    "question": "What does G01 do?",
                    "answer": "Linear interpolation at specified feed rate"
                }
            },
            {
                "number": 2,
                "title": "M-Code Functions",
                "objectives": [
                    "Learn M-code commands",
                    "Understand tool changes",
                    "Control spindle and coolant"
                ],
                "content": """
M-Code Commands:
- M03: Spindle on clockwise
- M04: Spindle on counterclockwise
- M05: Spindle stop
- M06: Tool change
- M08: Coolant on
- M09: Coolant off
- M30: Program end

Tool Change:
T1 M06     ; Change to tool 1
M03 S12000 ; Start spindle at 12000 RPM

Spindle Control:
M03 S12000 ; Start clockwise
M05        ; Stop spindle
                """,
                "example": "Write M-code sequence for tool change and spindle start",
                "quiz": {
                    "question": "What M-code starts spindle clockwise?",
                    "answer": "M03"
                }
            },
            {
                "number": 3,
                "title": "Tool Path Planning",
                "objectives": [
                    "Plan efficient tool paths",
                    "Optimize cutting sequences",
                    "Minimize tool changes"
                ],
                "content": """
Tool Path Planning Principles:
1. Minimize tool changes
2. Optimize cutting sequence
3. Reduce rapid movements
4. Group similar operations

Optimization Strategies:
- Process all cuts with same tool together
- Minimize rapid movements
- Use efficient cutting patterns
- Plan tool change positions

Example:
1. All drilling operations (T2)
2. All cutting operations (T1)
3. All milling operations (T3)
                """,
                "example": "Plan tool path for window with 4 holes and 4 cuts",
                "quiz": {
                    "question": "What should you minimize in tool path planning?",
                    "answer": "Tool changes and rapid movements"
                }
            },
            {
                "number": 4,
                "title": "Optimization Techniques",
                "objectives": [
                    "Optimize feed rates",
                    "Select optimal spindle speeds",
                    "Improve cycle times"
                ],
                "content": """
Feed Rate Optimization:
- Aluminum: 2000-4000 mm/min
- PVC: 1500-3000 mm/min
- Steel: 500-1500 mm/min

Spindle Speed Selection:
- Cutting: 10000-15000 RPM
- Drilling: 5000-10000 RPM
- Milling: 12000-18000 RPM

Cycle Time Improvement:
- Use optimal feed rates
- Minimize tool changes
- Optimize tool paths
- Reduce safety clearances (safely)
                """,
                "example": "Optimize G-code for 5 windows production",
                "quiz": {
                    "question": "What feed rate for aluminum?",
                    "answer": "2000-4000 mm/min"
                }
            }
        ]
    },
    Module.ADVANCED_APPLICATIONS: {
        "title": "Advanced Applications",
        "description": "Learn real-world applications: windows, doors, curtain walls",
        "lessons": [
            {
                "number": 1,
                "title": "Window Manufacturing",
                "objectives": [
                    "Understand window production",
                    "Learn window cutting sequences",
                    "Master window assembly preparation"
                ],
                "content": """
Window Production Process:
1. Profile cutting (4 sides)
2. Miter cuts (45° corners)
3. Hole drilling (for hardware)
4. Grooving (for gaskets)
5. Notching (for corners)

Window Specifications:
- Standard sizes: 1200-2400mm
- Corner angles: 45° or 90°
- Hole patterns: 4-8 holes per side
- Hardware mounting: Hinges, locks, handles

Production Sequence:
1. Cut frame profiles
2. Cut sash profiles
3. Drill hardware holes
4. Groove for gaskets
5. Quality check
                """,
                "example": "Produce complete window frame (2000×1500mm)",
                "quiz": {
                    "question": "What angle for window corners?",
                    "answer": "45° or 90°"
                }
            },
            {
                "number": 2,
                "title": "Door Production",
                "objectives": [
                    "Learn door manufacturing",
                    "Understand door components",
                    "Master door cutting procedures"
                ],
                "content": """
Door Production Process:
1. Frame cutting
2. Door leaf cutting
3. Hardware hole drilling
4. Lock preparation
5. Hinge mounting

Door Components:
- Frame: 4 sides with miter cuts
- Door leaf: Single or double
- Hardware: Locks, hinges, handles
- Seals: Weatherstripping

Production Tips:
- Ensure square cuts
- Accurate hole positioning
- Proper hardware alignment
- Quality control checks
                """,
                "example": "Produce complete door system",
                "quiz": {
                    "question": "What are main door components?",
                    "answer": "Frame, door leaf, hardware, seals"
                }
            },
            {
                "number": 3,
                "title": "Curtain Wall Systems",
                "objectives": [
                    "Understand curtain wall production",
                    "Learn complex profile handling",
                    "Master large-scale operations"
                ],
                "content": """
Curtain Wall Production:
- Large-scale production
- Complex profiles
- Multiple operations
- High precision required

Production Challenges:
- Long profiles (up to 7500mm)
- Multiple operations per profile
- Complex cutting patterns
- Quality consistency

Best Practices:
- Use tandem mode for efficiency
- Optimize tool paths
- Maintain quality standards
- Monitor production rates
                """,
                "example": "Produce curtain wall system (20 profiles)",
                "quiz": {
                    "question": "What is maximum profile length?",
                    "answer": "7500mm"
                }
            },
            {
                "number": 4,
                "title": "Complex Profiles",
                "objectives": [
                    "Handle complex profiles",
                    "Learn advanced operations",
                    "Master multi-operation sequences"
                ],
                "content": """
Complex Profile Operations:
- Multiple cutting angles
- Complex hole patterns
- Grooving and notching
- Engraving and marking

Operation Sequence:
1. Analyze profile requirements
2. Plan tool path
3. Select appropriate tools
4. Generate G-code
5. Execute operations
6. Quality verification

Advanced Techniques:
- Multi-axis operations
- Complex tool paths
- Precision cutting
- Quality optimization
                """,
                "example": "Produce complex profile with 10 operations",
                "quiz": {
                    "question": "What is first step in complex profile production?",
                    "answer": "Analyze profile requirements"
                }
            }
        ]
    },
    Module.TROUBLESHOOTING: {
        "title": "Troubleshooting & Maintenance",
        "description": "Diagnose faults, perform maintenance, and replace components",
        "lessons": [
            {
                "number": 1,
                "title": "Common Faults",
                "objectives": [
                    "Identify common faults",
                    "Understand fault symptoms",
                    "Learn fault causes"
                ],
                "content": """
Common Faults:
1. Spindle not starting
   - Cause: Relay failure, motor fault
   - Symptom: No spindle rotation
   - Fix: Check K2 relay, verify motor

2. Axis not moving
   - Cause: Servo fault, encoder issue
   - Symptom: Axis stuck
   - Fix: Check servo drive, encoder connection

3. Clamp not working
   - Cause: Pneumatic valve fault, air pressure
   - Symptom: Clamp not closing
   - Fix: Check valve, verify air pressure

4. Tool change failure
   - Cause: Tool magazine fault, sensor issue
   - Symptom: Tool not changing
   - Fix: Check magazine, verify sensors
                """,
                "example": "Diagnose spindle not starting",
                "quiz": {
                    "question": "What causes spindle not starting?",
                    "answer": "Relay failure or motor fault"
                }
            },
            {
                "number": 2,
                "title": "Diagnostic Procedures",
                "objectives": [
                    "Learn diagnostic steps",
                    "Understand testing procedures",
                    "Master fault isolation"
                ],
                "content": """
Diagnostic Procedure:
1. Observe symptoms
2. Check error codes
3. Test components
4. Isolate fault
5. Verify fix

Testing Procedures:
- Electrical: Measure voltages, check continuity
- Pneumatic: Check air pressure, test valves
- Mechanical: Check movement, verify alignment
- Software: Check programs, verify settings

Fault Isolation:
- Start with most likely cause
- Test systematically
- Document findings
- Verify solution
                """,
                "example": "Perform complete diagnostic for axis fault",
                "quiz": {
                    "question": "What is first step in diagnostics?",
                    "answer": "Observe symptoms"
                }
            },
            {
                "number": 3,
                "title": "Preventive Maintenance",
                "objectives": [
                    "Learn maintenance schedules",
                    "Understand maintenance tasks",
                    "Master maintenance procedures"
                ],
                "content": """
Maintenance Schedule:
- Daily: Clean, check air pressure
- Weekly: Lubricate, check connections
- Monthly: Full inspection, calibration
- Yearly: Complete overhaul

Maintenance Tasks:
- Clean machine and components
- Lubricate moving parts
- Check electrical connections
- Verify sensor calibration
- Inspect tool magazine
- Test safety systems

Maintenance Records:
- Document all maintenance
- Track component life
- Schedule replacements
- Monitor machine health
                """,
                "example": "Perform weekly maintenance",
                "quiz": {
                    "question": "What maintenance is done daily?",
                    "answer": "Clean machine, check air pressure"
                }
            },
            {
                "number": 4,
                "title": "Component Replacement",
                "objectives": [
                    "Learn replacement procedures",
                    "Understand component selection",
                    "Master replacement techniques"
                ],
                "content": """
Component Replacement:
1. Identify component
2. Order replacement part
3. Power OFF machine
4. Remove old component
5. Install new component
6. Test and verify

Common Replacements:
- Relays: K1-K10
- Contactors: Q1-Q3
- Motors: M1-M6
- Sensors: Position, temperature
- Tools: Cutting, drilling, milling

Replacement Tips:
- Use correct part numbers
- Follow safety procedures
- Test after replacement
- Document replacement
                """,
                "example": "Replace K2 relay",
                "quiz": {
                    "question": "What is first step in replacement?",
                    "answer": "Identify component"
                }
            }
        ]
    }
}


def get_lesson(module: Module, lesson_number: int) -> Dict[str, Any]:
    """Get lesson content"""
    module_data = CURRICULUM_STRUCTURE.get(module)
    if not module_data:
        return {}
    
    lessons = module_data.get("lessons", [])
    for lesson in lessons:
        if lesson["number"] == lesson_number:
            return lesson
    
    return {}


def get_module_progress(module: Module) -> Dict[str, Any]:
    """Get module information"""
    module_data = CURRICULUM_STRUCTURE.get(module)
    if not module_data:
        return {}
    
    return {
        "title": module_data["title"],
        "description": module_data["description"],
        "lessons_count": len(module_data.get("lessons", [])),
        "lessons": module_data.get("lessons", [])
    }

