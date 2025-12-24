# Almona AI Agents

This directory contains AI agent implementations for the Almona platform, focusing on YILMAZ machine intelligence and learning systems.

## Directory Structure

```
ai_agents/
├── ydt_agent/              # YILMAZ Digital Twin Knowledge System
│   ├── knowledge/          # Knowledge base (manuals, diagrams, processed data)
│   ├── manual_parser.py    # PDF text and table extraction
│   ├── diagram_parser.py   # Wiring/pneumatic diagram processing
│   ├── knowledge_graph_builder.py  # Knowledge graph construction
│   └── ydt_agent.ts        # Core reasoning agent (TypeScript/ADK)
│
├── learning_agent/         # Tutorial reverse-engineering and course generation
│   ├── tutorial_processor.py
│   ├── course_generator.py
│   └── courses/            # Generated HTML course files
│
└── README.md              # This file
```

## YILMAZ Digital Twin (YDT) Agent

### Purpose
Build a comprehensive digital representation of YILMAZ machinery by ingesting and understanding all official documentation. This system serves as the "single source of truth" for AI-powered service, diagnostic, and training tools.

### Key Features
- **Knowledge Ingestion**: Processes PDF manuals, wiring diagrams, pneumatic schematics
- **Knowledge Graph**: Structured representation of machines, components, faults, procedures
- **Reasoning Engine**: Answers complex technical questions with citations
- **Capability/Limitation Mapping**: Knows what each machine CAN and CANNOT do
- **Human-in-the-Loop Validation**: Continuous improvement through technician feedback

### Integration Points
- **Machine Types**: `src/types/machine.ts`, `src/constants/yilmazMachines.ts`
- **Database**: `yilmaz_machines` table (Supabase)
- **Ticketing**: `service_tickets` table for auto-diagnosis
- **AI Services**: `python_backend/ai_services/`

## Learning Agent

### Purpose
Reverse-engineer best practices, workflows, and algorithms from the Almona codebase to create structured learning courses.

### Key Features
- **Codebase Analysis**: Extracts patterns from `src/lib/fabricator/`, `src/lib/algorithms/`
- **Workflow Extraction**: Identifies process steps from code
- **Course Generation**: Creates monthly HTML courses with interactive examples
- **Best Practices**: Documents proven approaches and optimizations

## Development Status

### Component A: YDT Knowledge System
- [x] Week 1: Directory structure and manual indexing
- [ ] Week 2: Text & table extraction engine
- [ ] Week 3: Diagram & schematic processing
- [ ] Week 4: Knowledge graph construction
- [ ] Week 5-6: Core reasoning agent
- [ ] Week 7: Validation & testing
- [ ] Week 8: API integration

### Component B: Machine Diagnosis Agent
- [ ] Week 9-10: Error screen recognition
- [ ] Week 11: IoT/IOI data integration
- [ ] Week 12: Questionnaire system

### Component C: Learning Agent
- [ ] Week 13-14: Tutorial processing
- [ ] Week 15: Course generation
- [ ] Week 16: Platform integration

### Component D: Spare Parts System
- [ ] Week 17: Vision model enhancement
- [ ] Week 18: Recommendation engine

## Getting Started

### Prerequisites
- Python 3.9+
- Node.js 18+ (for TypeScript agents)
- Access to YILMAZ authorized manuals
- Supabase database with pgvector extension

### Setup
1. Place YILMAZ manuals in `ydt_agent/knowledge/raw_manuals/` subdirectories
2. Update `machine_manual_index.json` with actual filenames
3. Run database migrations for new tables
4. Install Python dependencies: `pip install pdfplumber camelot-py pypdf2`

## Documentation

See the main plan document for detailed week-by-week implementation guide.

## License

Proprietary - Almona Industrial Solutions

