# -*- coding: utf-8 -*-
import os

def create_svg(filename, content, width=800, height=500):
    svg_template = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}">
    <style>
        .title {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-weight: bold; font-size: 20px; fill: #1e293b; }}
        .subtitle {{ font-family: sans-serif; font-size: 12px; fill: #64748b; }}
        .box-text {{ font-family: sans-serif; font-size: 12px; font-weight: 600; fill: #1e293b; text-anchor: middle; }}
        .box-sub {{ font-family: sans-serif; font-size: 10px; fill: #475569; text-anchor: middle; }}
        .path {{ fill: none; stroke: #94a3b8; stroke-width: 2; }}
    </style>
    <rect width="100%" height="100%" fill="#f8fafc" rx="10" />
    {content}
    </svg>'''
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(svg_template)
    print(f"Generated {filename}")

# ==========================================
# DIAGRAM 1: High Level Architecture
# ==========================================
arch_content = '''
    <!-- Title -->
    <text x="400" y="40" class="title" text-anchor="middle">Almona System Architecture</text>
    
    <!-- Client Layer -->
    <g transform="translate(50, 80)">
        <rect width="700" height="110" fill="#eff6ff" stroke="#3b82f6" stroke-width="2" rx="8" />
        <text x="20" y="30" font-family="sans-serif" font-weight="bold" fill="#1d4ed8">CLIENT LAYER (React + Vite)</text>
        
        <g transform="translate(50, 50)">
            <rect width="180" height="40" fill="white" stroke="#93c5fd" rx="4" />
            <text x="90" y="25" class="box-text">Fabricator Pro</text>
        </g>
        <g transform="translate(260, 50)">
            <rect width="180" height="40" fill="white" stroke="#93c5fd" rx="4" />
            <text x="90" y="25" class="box-text">SmartDraw Canvas</text>
        </g>
        <g transform="translate(470, 50)">
            <rect width="180" height="40" fill="white" stroke="#93c5fd" rx="4" />
            <text x="90" y="25" class="box-text">3D/AR Engine</text>
        </g>
    </g>

    <!-- Connectors -->
    <path d="M400 190 L400 230" class="path" stroke-dasharray="5,5" />
    <text x="410" y="215" class="subtitle">FastAPI / Websockets</text>

    <!-- Backend Layer -->
    <g transform="translate(50, 230)">
        <rect width="700" height="110" fill="#f0fdf4" stroke="#22c55e" stroke-width="2" rx="8" />
        <text x="20" y="30" font-family="sans-serif" font-weight="bold" fill="#15803d">SERVER LAYER (Python)</text>
        
        <g transform="translate(50, 50)">
            <rect width="280" height="40" fill="white" stroke="#86efac" rx="4" />
            <text x="140" y="25" class="box-text">Optimization Core (Genetic)</text>
        </g>
        <g transform="translate(370, 50)">
            <rect width="280" height="40" fill="white" stroke="#86efac" rx="4" />
            <text x="140" y="25" class="box-text">Calibration Learner (AI)</text>
        </g>
    </g>

    <!-- Bottom Layer -->
    <g transform="translate(50, 380)">
        <!-- Database -->
        <g transform="translate(0, 0)">
            <rect width="200" height="80" fill="#fff7ed" stroke="#f97316" stroke-width="2" rx="8" />
            <text x="100" y="35" class="box-text" fill="#c2410c">Supabase</text>
            <text x="100" y="55" class="box-sub">PostgreSQL + Realtime</text>
        </g>
        <!-- CNC -->
        <g transform="translate(250, 0)">
            <rect width="200" height="80" fill="#f5f3ff" stroke="#8b5cf6" stroke-width="2" rx="8" />
            <text x="100" y="35" class="box-text" fill="#6d28d9">CNC Adapters</text>
            <text x="100" y="55" class="box-sub">G-Code / YILMAZ</text>
        </g>
        <!-- Services -->
        <g transform="translate(500, 0)">
            <rect width="200" height="80" fill="#fef2f2" stroke="#ef4444" stroke-width="2" rx="8" />
            <text x="100" y="35" class="box-text" fill="#b91c1c">External Services</text>
            <text x="100" y="55" class="box-sub">OpenAI / SendGrid</text>
        </g>
    </g>

    <!-- Vertical Lines -->
    <path d="M150 340 L150 380" class="path" />
    <path d="M400 340 L400 380" class="path" />
    <path d="M600 340 L600 380" class="path" />
'''

# ==========================================
# DIAGRAM 2: Dual Output Engine
# ==========================================
dual_output_content = '''
    <defs>
        <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="#64748b" />
        </marker>
    </defs>

    <text x="400" y="40" class="title" text-anchor="middle">Dual-Output Engine Flow</text>

    <!-- User Input -->
    <g transform="translate(50, 200)">
        <circle cx="40" cy="40" r="40" fill="#3b82f6" opacity="0.9" />
        <text x="40" y="45" font-family="sans-serif" font-weight="bold" fill="white" text-anchor="middle">USER INPUT</text>
    </g>

    <!-- Engine Box -->
    <g transform="translate(180, 180)">
        <rect width="140" height="80" fill="#f59e0b" rx="8" />
        <text x="70" y="35" font-family="sans-serif" font-weight="bold" fill="white" text-anchor="middle">DualOutput</text>
        <text x="70" y="55" font-family="sans-serif" font-size="12" fill="white" text-anchor="middle">Generator</text>
    </g>

    <!-- Top Path (Visual) -->
    <g transform="translate(380, 80)">
        <rect width="220" height="100" fill="#eff6ff" stroke="#3b82f6" stroke-width="2" rx="8" />
        <text x="110" y="30" class="box-text" fill="#1e40af">VISUAL PATH (Three.js)</text>
        <text x="110" y="55" class="box-sub">FrameGeometry Generation</text>
        <rect x="70" y="70" width="80" height="20" fill="#3b82f6" rx="10" />
        <text x="110" y="84" font-family="sans-serif" font-size="10" fill="white" text-anchor="middle">85% Accuracy</text>
    </g>

    <!-- Bottom Path (Production) -->
    <g transform="translate(380, 280)">
        <rect width="220" height="100" fill="#f0fdf4" stroke="#22c55e" stroke-width="2" rx="8" />
        <text x="110" y="30" class="box-text" fill="#166534">PRODUCTION PATH</text>
        <text x="110" y="55" class="box-sub">FabricationData & Validation</text>
        <rect x="70" y="70" width="80" height="20" fill="#22c55e" rx="10" />
        <text x="110" y="84" font-family="sans-serif" font-size="10" fill="white" text-anchor="middle">99.8% Accuracy</text>
    </g>

    <!-- Output UI -->
    <g transform="translate(660, 180)">
        <rect width="120" height="80" fill="#475569" rx="8" />
        <text x="60" y="35" font-family="sans-serif" font-weight="bold" fill="white" text-anchor="middle">Split-View</text>
        <text x="60" y="55" font-family="sans-serif" font-size="12" fill="#cbd5e1" text-anchor="middle">UI Component</text>
    </g>

    <!-- Connectors -->
    <line x1="130" y1="240" x2="180" y2="220" stroke="#94a3b8" stroke-width="2" marker-end="url(#arrow)" />
    
    <!-- Split -->
    <path d="M320 220 Q350 220 380 130" fill="none" stroke="#3b82f6" stroke-width="2" marker-end="url(#arrow)" />
    <path d="M320 220 Q350 220 380 330" fill="none" stroke="#22c55e" stroke-width="2" marker-end="url(#arrow)" />
    
    <!-- Merge -->
    <path d="M600 130 Q630 220 660 220" fill="none" stroke="#3b82f6" stroke-width="2" marker-end="url(#arrow)" />
    <path d="M600 330 Q630 220 660 220" fill="none" stroke="#22c55e" stroke-width="2" marker-end="url(#arrow)" />
'''

# ==========================================
# DIAGRAM 3: YDT Future Intelligence
# ==========================================
ydt_content = '''
    <defs>
        <marker id="arrow-ydt" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
            <path d="M0,0 L0,6 L9,3 z" fill="#64748b" />
        </marker>
    </defs>

    <text x="400" y="40" class="title" text-anchor="middle">YDT Future Intelligence Layer</text>

    <!-- Step 1: Ingest -->
    <g transform="translate(50, 100)">
        <rect width="160" height="240" fill="#f1f5f9" stroke="#64748b" rx="8" />
        <text x="80" y="30" class="box-text">DATA INGESTION</text>
        
        <rect x="20" y="50" width="120" height="30" fill="white" stroke="#cbd5e1" rx="4" />
        <text x="80" y="70" class="box-sub">RSS / News Scraper</text>
        
        <rect x="20" y="90" width="120" height="30" fill="white" stroke="#cbd5e1" rx="4" />
        <text x="80" y="110" class="box-sub">Facebook Listener</text>
        
        <rect x="20" y="130" width="120" height="30" fill="white" stroke="#cbd5e1" rx="4" />
        <text x="80" y="150" class="box-sub">LME Prices</text>

        <rect x="20" y="170" width="120" height="30" fill="white" stroke="#cbd5e1" rx="4" />
        <text x="80" y="190" class="box-sub">Scout OCR</text>
    </g>

    <!-- Arrow -->
    <line x1="210" y1="220" x2="280" y2="220" stroke="#94a3b8" stroke-width="2" marker-end="url(#arrow-ydt)" />

    <!-- Step 2: Maalem Analyst -->
    <g transform="translate(280, 80)">
        <circle cx="120" cy="140" r="110" fill="#fffbeb" stroke="#d97706" stroke-width="2" />
        <text x="120" y="70" class="box-text" fill="#b45309" font-size="16px">MAALEM ANALYST</text>
        <text x="120" y="90" class="subtitle" text-anchor="middle">(AI Agent)</text>

        <g transform="translate(40, 110)">
            <rect width="160" height="25" fill="white" stroke="#fcd34d" rx="4" />
            <text x="80" y="17" class="box-sub">Dialect Translation</text>
        </g>
        <g transform="translate(40, 145)">
            <rect width="160" height="25" fill="white" stroke="#fcd34d" rx="4" />
            <text x="80" y="17" class="box-sub">Relevance Scoring</text>
        </g>
        <g transform="translate(40, 180)">
            <rect width="160" height="25" fill="white" stroke="#fcd34d" rx="4" />
            <text x="80" y="17" class="box-sub">Actionable Advice</text>
        </g>
    </g>

    <!-- Arrow -->
    <line x1="500" y1="220" x2="570" y2="220" stroke="#94a3b8" stroke-width="2" marker-end="url(#arrow-ydt)" />

    <!-- Step 3: User Brief -->
    <g transform="translate(570, 100)">
        <rect width="180" height="240" fill="#f0f9ff" stroke="#0ea5e9" stroke-width="2" rx="8" />
        <text x="90" y="30" class="box-text" fill="#0284c7">MORNING BRIEF</text>
        <line x1="20" y1="45" x2="160" y2="45" stroke="#bae6fd" stroke-width="2" />
        
        <text x="30" y="80" font-family="sans-serif" font-size="11" fill="#334155">Alert: Aluminum +2%</text>
        <text x="30" y="110" font-family="sans-serif" font-size="11" fill="#334155">Tip: Buy now before...</text>
        <text x="30" y="140" font-family="sans-serif" font-size="11" fill="#334155">News: Customs Law</text>
        
        <rect x="40" y="180" width="100" height="30" fill="#0ea5e9" rx="15" />
        <text x="90" y="200" font-family="sans-serif" font-size="10" fill="white" text-anchor="middle">Read Brief</text>
    </g>
'''

# Generate the files
create_svg('architecture_overview.svg', arch_content)
create_svg('dual_output_engine.svg', dual_output_content)
create_svg('ydt_intelligence_flow.svg', ydt_content)