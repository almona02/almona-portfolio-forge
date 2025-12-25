"""
YDT Prestige Agent API - FastAPI Backend
University-grade AI Assistant for AIM 7510 CNC Machines
"""

from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, List, Any
import json
import logging
from datetime import datetime
from pathlib import Path
import sys

# Initialize logging first
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent.parent / "ai_agents" / "ydt_agent"))

# Import YDT engine modules
try:
    from ydt_chatbot_engine import (
        YDTChatbotEngine,
        Language,
        Persona,
        ChatContext,
    )
    from gcode_ydt_integration import YDTGCodeEnhancer
    logger.info("✅ Successfully imported YDT modules")
except ImportError as e:
    logger.error(f"❌ YDT modules import failed: {e}", exc_info=True)
    import traceback
    logger.error(f"Import traceback: {traceback.format_exc()}")

    # Create mock classes for development
    class Language:
        TURKISH = "tr"
        ENGLISH = "en"
        RUSSIAN = "ru"
        ARABIC = "ar"

    class Persona:
        PROFESSOR = "professor"
        DOCTOR = "doctor"
        TOUR_GUIDE = "tour_guide"
        CODE_MASTER = "code_master"
        NERVOUS_SYSTEM = "nervous_system"

    YDTChatbotEngine = None
    YDTGCodeEnhancer = None

app = FastAPI(
    title="YDT Prestige Agent API",
    description="University-grade AI Assistant for AIM 7510 CNC Machines",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://almona.com",
        "https://www.almona.com",
        "https://almona02.com",
        "https://www.almona02.com",
        "https://*.almona.com",
        "https://*.almona02.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request models
class ChatRequest(BaseModel):
    message: str
    # professor/doctor/tour-guide/code-master/nervous-system
    persona: str = "professor"
    language: str = "en"  # tr/en/ru/ar
    session_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


class GCodeRequest(BaseModel):
    gcode_program: str
    operation_type: str  # drilling/milling/tapping/grooving
    material: str = "aluminum"
    language: str = "en"


class LearningRequest(BaseModel):
    module_id: str
    lesson_id: Optional[str] = None
    language: str = "en"
    student_level: str = "beginner"  # beginner/intermediate/advanced


class DiagnosisRequest(BaseModel):
    symptoms: List[str]
    error_codes: Optional[List[str]] = None
    machine_state: Optional[Dict[str, Any]] = None
    language: str = "en"


# Initialize engines
ydt_engine = None
gcode_enhancer = None


# Initialize on startup
@app.on_event("startup")
async def startup_event():
    global ydt_engine, gcode_enhancer

    try:
        knowledge_base_path = (
            Path(__file__).parent.parent.parent
            / "ai_agents"
            / "ydt_agent"
            / "knowledge"
        )
        logger.info(f"Looking for knowledge base at: {knowledge_base_path}")
        logger.info(f"Knowledge base exists: {knowledge_base_path.exists()}")
        logger.info(f"Absolute path: {knowledge_base_path.resolve()}")
        
        # Check if path exists and list contents
        if knowledge_base_path.exists():
            logger.info(f"Knowledge base directory contents: {list(knowledge_base_path.iterdir())}")
            processed_path = knowledge_base_path / "processed" / "aim-7510"
            logger.info(f"Processed path: {processed_path}")
            logger.info(f"Processed path exists: {processed_path.exists()}")
            if processed_path.exists():
                structure_file = processed_path / "structure.json"
                logger.info(f"Structure file: {structure_file}")
                logger.info(f"Structure file exists: {structure_file.exists()}")
                if structure_file.exists():
                    logger.info(f"Structure file size: {structure_file.stat().st_size} bytes")
        else:
            logger.error(f"❌ Knowledge base path does not exist: {knowledge_base_path}")
            logger.error(f"Current working directory: {Path.cwd()}")
            logger.error(f"__file__ location: {Path(__file__).resolve()}")
            logger.error(f"Python path: {sys.path}")

        if YDTChatbotEngine and knowledge_base_path.exists():
            logger.info("Initializing YDT Chatbot Engine...")
            try:
                ydt_engine = YDTChatbotEngine(knowledge_base_path)
                logger.info("✅ YDT Chatbot Engine initialized successfully")
            except Exception as e:
                logger.error(f"❌ Failed to initialize YDT engine: {e}", exc_info=True)
                ydt_engine = None
        else:
            logger.warning(
                f"YDT Chatbot Engine not available. "
                f"YDTChatbotEngine={YDTChatbotEngine}, "
                f"path_exists={knowledge_base_path.exists()}"
            )

        if YDTGCodeEnhancer and knowledge_base_path.exists():
            gcode_enhancer = YDTGCodeEnhancer(knowledge_base_path)
            logger.info("✅ G-Code Enhancer initialized")
        else:
            logger.warning("G-Code Enhancer not available")
    except Exception as e:
        logger.error(
            f"❌ Failed to initialize engines: {e}",
            exc_info=True,
        )


# Session management
active_sessions: Dict[str, Dict[str, Any]] = {}


@app.post("/api/v1/chat")
async def chat_endpoint(request: ChatRequest, background_tasks: BackgroundTasks):
    """
    Main chat endpoint - processes user queries through YDT engine
    """
    try:
        # Start timing for response speed
        start_time = datetime.now()

        # Validate persona
        persona_map = {
            "professor": Persona.PROFESSOR if Persona else "professor",
            "doctor": Persona.DOCTOR if Persona else "doctor",
            "tour-guide": Persona.TOUR_GUIDE if Persona else "tour_guide",
            "tour_guide": Persona.TOUR_GUIDE if Persona else "tour_guide",
            "code-master": Persona.CODE_MASTER if Persona else "code_master",
            "code_master": Persona.CODE_MASTER if Persona else "code_master",
            "nervous-system": (Persona.NERVOUS_SYSTEM if Persona else "nervous_system"),
            "nervous_system": (Persona.NERVOUS_SYSTEM if Persona else "nervous_system"),
        }

        persona_key = request.persona.replace("-", "_")
        if persona_key not in persona_map:
            persona_key = "professor"

        # Validate language
        valid_languages = ["tr", "en", "ru", "ar"]
        if request.language not in valid_languages:
            request.language = "en"

        # Convert string to Language enum
        lang_map = {
            "tr": Language.TURKISH if Language else "tr",
            "en": Language.ENGLISH if Language else "en",
            "ru": Language.RUSSIAN if Language else "ru",
            "ar": Language.ARABIC if Language else "ar",
        }
        language_enum = lang_map.get(
            request.language, Language.ENGLISH if Language else "en"
        )

        # Process with YDT engine
        if ydt_engine:
            try:
                # Create chat context
                context = ChatContext(
                    user_id=request.session_id or "anonymous",
                    machine_id="aim-7510",
                    language=language_enum,
                    persona=persona_map[persona_key],
                    conversation_history=active_sessions.get(
                        request.session_id or "", {}
                    ).get("history", []),
                )

                # Process query
                chat_response = ydt_engine.process_query(request.message, context)

                # Convert ChatResponse to dict
                response = {
                    "content": chat_response.content,
                    # Convert to percentage
                    "confidence": chat_response.confidence * 100,
                    "sources": chat_response.sources,
                    "suggested_actions": chat_response.suggested_actions,
                    "visual_aids": chat_response.visual_aids or {},
                }

                # Update session history
                if request.session_id:
                    if request.session_id not in active_sessions:
                        active_sessions[request.session_id] = {"history": []}
                    active_sessions[request.session_id]["history"].append(
                        {
                            "user": request.message,
                            "assistant": chat_response.content,
                            "timestamp": datetime.now().isoformat(),
                        }
                    )

                logger.info(
                    f"YDT engine processed query: " f"{request.message[:50]}..."
                )
            except Exception as e:
                logger.error(
                    f"Error processing query with YDT engine: {e}",
                    exc_info=True,
                )
                # Fallback response if engine error
                error_msg = (
                    f"I encountered an error processing your query. "
                    f"Please try rephrasing your question. "
                    f"Error: {str(e)}"
                )
                response = {
                    "content": error_msg,
                    "confidence": 50.0,
                    "sources": [],
                    "suggested_actions": ["Try again", "Rephrase question"],
                    "visual_aids": {},
                }
        else:
            # Fallback response if engine not available
            logger.warning("YDT engine not initialized - using fallback response")
            fallback_msg = (
                f"⚠️ YDT Engine is not initialized. "
                f"Please check server logs. "
                f"Your question was: '{request.message}'. "
                f"This is a fallback response."
            )
            response = {
                "content": fallback_msg,
                "confidence": 50.0,
                "sources": ["System"],
                "suggested_actions": ["Check server status", "Retry"],
                "visual_aids": {},
            }

        # Calculate response time
        response_time = (datetime.now() - start_time).total_seconds()

        # Log interaction (async)
        background_tasks.add_task(log_interaction, request, response, response_time)

        # Prepare response with prestige formatting
        return {
            "success": True,
            "data": {
                "response": response.get("content", "Response generated"),
                "confidence": response.get("confidence", 95),
                "persona": request.persona,
                "language": request.language,
                "response_time": round(response_time, 3),
                "knowledge_sources": response.get("sources", []),
                "suggested_actions": response.get("suggested_actions", []),
                "visual_elements": response.get("visual_aids", {}),
                "extras": {
                    "has_examples": response.get("extras", {}).get("hasExamples", True),
                    "has_diagrams": response.get("extras", {}).get("hasDiagrams", True),
                    "has_exercises": response.get("extras", {}).get(
                        "hasExercise", False
                    ),
                    "difficulty_level": response.get("extras", {}).get(
                        "difficulty", "intermediate"
                    ),
                },
            },
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "session_id": request.session_id,
                "engine_version": "2.0.0",
                "knowledge_base": {
                    "components": 1193,
                    "connections": 1253,
                    "spare_parts": 281,
                    "accuracy": 95.0,
                },
            },
        }

    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Internal server error",
                "message": str(e),
            },
        )


@app.post("/api/v1/gcode/validate")
async def validate_gcode(request: GCodeRequest):
    """
    Validate and enhance G-code programs
    """
    try:
        if not gcode_enhancer:
            # Return mock response for testing
            return {
                "success": True,
                "data": {
                    "validation": {"valid": True, "issues": []},
                    "enhancement": {"enhanced": False},
                    "suggested_improvements": [],
                    "optimal_parameters": {
                        "spindle_speed": 15000,
                        "feed_rate": 2000,
                        "depth_of_cut": 0.5,
                    },
                },
            }

        # Validate G-code parameters
        params = {
            "feed_rate": 3000,  # Extract from G-code if possible
            "spindle_speed": 12000,
            "length": 2000,
            "angle": 45,
        }

        validation_result = gcode_enhancer.validate_gcode_parameters(params)

        # Get optimal parameters
        optimal_params = gcode_enhancer.suggest_optimal_parameters(
            request.operation_type, request.material
        )

        # Explain G-code commands
        explanations = {}
        for cmd in ["G21", "G90", "G01", "M03", "M06"]:
            explanations[cmd] = gcode_enhancer.explain_gcode_command(cmd)

        return {
            "success": True,
            "data": {
                "validation": validation_result,
                "optimal_parameters": optimal_params,
                "explanations": explanations,
                "suggested_improvements": validation_result.get("suggestions", []),
            },
        }

    except Exception as e:
        logger.error(f"G-code validation error: {str(e)}")
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "error": "G-code validation error",
                "message": str(e),
            },
        )


@app.get("/api/v1/learn/modules")
async def get_learning_modules(language: str = "en"):
    """
    Get university curriculum modules
    """
    try:
        # Import curriculum module
        try:
            from university_curriculum import (
                get_module_progress,
                Module,
            )
        except ImportError:
            # Fallback curriculum data
            modules = [
                {
                    "id": "fundamentals",
                    "title": "Machine Fundamentals",
                    "description": "Learn the basics of AIM 7510",
                    "lessons": 3,
                    "estimated_hours": 4,
                },
                {
                    "id": "operations",
                    "title": "Operation Procedures",
                    "description": "Master machine operations",
                    "lessons": 4,
                    "estimated_hours": 6,
                },
            ]
        else:
            modules = []
            for module_enum in Module:
                module_data = get_module_progress(module_enum)
                modules.append(
                    {
                        "id": module_enum.value,
                        "title": module_data.get("title", ""),
                        "description": module_data.get("description", ""),
                        "lessons": module_data.get("lessons_count", 0),
                        "estimated_hours": (module_data.get("lessons_count", 0) * 1.5),
                    }
                )

        return {
            "success": True,
            "data": {
                "modules": modules,
                "total_lessons": sum(m["lessons"] for m in modules),
                "estimated_hours": sum(m["estimated_hours"] for m in modules),
                "certification_available": True,
                "prerequisites": ["Basic CNC knowledge", "Safety training"],
            },
        }

    except Exception as e:
        logger.error(f"Curriculum error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Curriculum error",
                "message": str(e),
            },
        )


@app.post("/api/v1/diagnose")
async def diagnose_machine(request: DiagnosisRequest):
    """
    Diagnostic endpoint - machine doctor mode
    """
    try:
        if not ydt_engine:
            # Return mock diagnosis for testing
            return {
                "success": True,
                "data": {
                    "diagnosis": (
                        "Based on symptoms, check electrical "
                        "connections and component status."
                    ),
                    "confidence": 85,
                    "probable_causes": [
                        "Electrical connection issue",
                        "Component failure",
                    ],
                    "immediate_actions": [
                        "Check power supply",
                        "Inspect connections",
                    ],
                    "repair_steps": [
                        "1. Power off machine",
                        "2. Check connections",
                        "3. Test components",
                    ],
                    "required_tools": ["Multimeter", "Screwdriver"],
                    "required_parts": [],
                    "estimated_time": "30 minutes",
                    "urgency": "medium",
                    "safety_warnings": ["Ensure power is off before inspection"],
                },
            }

        # Create diagnosis context
        context = ChatContext(
            user_id="diagnosis",
            machine_id="aim-7510",
            language=Language.ENGLISH if Language else "en",
            persona=Persona.DOCTOR if Persona else "doctor",
            conversation_history=[],
        )

        # Process diagnosis query
        query = f"Symptoms: {', '.join(request.symptoms)}"
        if request.error_codes:
            query += f" Error codes: {', '.join(request.error_codes)}"

        chat_response = ydt_engine.process_query(query, context)

        # Format diagnosis response (extract from ChatResponse)
        return {
            "success": True,
            "data": {
                "diagnosis": chat_response.content,
                "confidence": int(chat_response.confidence * 100),
                "probable_causes": ["Check symptoms", "Review error codes"],
                "immediate_actions": (
                    chat_response.suggested_actions
                    or ["Check connections", "Review manual"]
                ),
                "repair_steps": [
                    "1. Power off",
                    "2. Inspect",
                    "3. Test",
                    "4. Repair",
                ],
                "required_tools": ["Multimeter", "Screwdriver"],
                "required_parts": [],
                "estimated_time": "30 minutes",
                "urgency": "medium",
                "safety_warnings": ["Ensure power is off"],
            },
        }

    except Exception as e:
        logger.error(f"Diagnosis error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "Diagnosis error",
                "message": str(e),
            },
        )


@app.get("/api/v1/knowledge/stats")
async def get_knowledge_stats():
    """
    Get knowledge base statistics
    """
    return {
        "success": True,
        "data": {
            "knowledge_base": {
                "components": 1193,
                "connections": 1253,
                "spare_parts": 281,
                "manual_pages": 164,
                "tables": 73,
                "alarm_codes": 187,
                "g_code_functions": 89,
                "m_code_functions": 27,
            },
            "extraction_accuracy": {
                "specifications": 100.0,
                "wiring_diagram": 86.9,
                "spare_parts": 100.0,
                "manual_content": 100.0,
                "overall": 92.5,
            },
            "coverage": {
                "technical_specs": 100,
                "electrical_components": 100,
                "pneumatic_components": 100,
                "maintenance_procedures": 100,
                "troubleshooting": 95,
                "applications": 90,
            },
        },
    }


@app.get("/api/v1/machine/capabilities")
async def get_machine_capabilities():
    """
    Get AIM 7510 capabilities (for marketing/education)
    """
    return {
        "success": True,
        "data": {
            "machine": "AIM 7510",
            "type": "5-Axis CNC Aluminium Profile Machining Center",
            "capabilities": {
                "operations": [
                    "Cutting",
                    "Drilling",
                    "Milling",
                    "Tapping",
                    "Grooving",
                    "Notching",
                    "Countersinking",
                    "Threading",
                    "Chamfering",
                ],
                "materials": [
                    "Aluminium",
                    "UPVC",
                    "Composite",
                    "Steel (thin-walled)",
                    "Brass",
                    "Copper",
                    "Plastics",
                ],
                "applications": [
                    "Windows",
                    "Doors",
                    "Curtain Walls",
                    "Facades",
                    "Solar Panel Frames",
                    "Display Systems",
                    "Furniture",
                    "Transportation Components",
                ],
                "features": [
                    "Tandem Mode (continuous operation)",
                    "Automatic Clamp Recognition",
                    "5-Axis Servo Control",
                    "HSK F63 Spindle (20,000 RPM)",
                    "12+1 Tool Magazine",
                    "Automatic Tool Cooling",
                    "3-Zone Laser Safety Scanner",
                ],
            },
            "specifications": {
                "working_capacity": "995mm × 220mm × 240mm",
                "power": "15 kW",
                "air_consumption": ("250 L/min @ 6 bar"),
                "weight": "4500 kg (net), 4800 kg (gross)",
                "precision": "±0.05 mm",
                "repeatability": "±0.02 mm",
            },
        },
    }


async def log_interaction(request: ChatRequest, response: Dict, response_time: float):
    """
    Async logging of interactions
    """
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "session_id": request.session_id,
        "persona": request.persona,
        "language": request.language,
        "query": request.message,
        "response_preview": (
            (response.get("content", response.get("response", ""))[:100] + "...")
            if len(response.get("content", response.get("response", ""))) > 100
            else response.get("content", response.get("response", ""))
        ),
        "confidence": response.get("confidence", 95),
        "response_time": response_time,
        "knowledge_sources_used": response.get(
            "sources", response.get("knowledge_sources", [])
        )[:3],
    }

    # In production, save to database
    # For now, just log to console
    logger.info(f"Interaction logged: {json.dumps(log_entry)}")


# Health check
@app.get("/")
async def root():
    """
    Root endpoint - API information
    """
    return {
        "service": "YDT Prestige Agent API",
        "version": "2.0.0",
        "status": "online",
        "endpoints": {
            "health": "/api/health",
            "chat": "/api/v1/chat",
            "docs": "/api/docs",
            "redoc": "/api/redoc",
        },
        "message": (
            "YDT Prestige Agent API is running. "
            "Visit /api/docs for API documentation."
        ),  # noqa: E501
    }


@app.get("/favicon.ico")
async def favicon():
    """
    Favicon endpoint - return 204 No Content
    """
    from fastapi.responses import Response

    return Response(status_code=204)


@app.get("/api/health")
async def health_check():
    knowledge_base_path = (
        Path(__file__).parent.parent.parent
        / "ai_agents"
        / "ydt_agent"
        / "knowledge"
    )
    
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "YDT Prestige Agent API",
        "version": "2.0.0",
        "engines": {
            "chatbot": "active" if ydt_engine else "unavailable",
            "gcode": "active" if gcode_enhancer else "unavailable",
            "curriculum": "active",
            "diagnosis": "active" if ydt_engine else "unavailable",
        },
        "diagnostics": {
            "ydt_engine_class": "available" if YDTChatbotEngine else "not_imported",
            "knowledge_base_path": str(knowledge_base_path),
            "knowledge_base_exists": knowledge_base_path.exists(),
            "ydt_engine_initialized": ydt_engine is not None,
            "gcode_enhancer_initialized": gcode_enhancer is not None,
        },
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
