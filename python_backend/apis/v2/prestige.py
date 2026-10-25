"""Versioned, advisory-only access to the packaged YDT knowledge engine.

No generated answer authorizes manufacturing or executes machine operations.
Missing knowledge and unavailable validation are explicit failures, never mock success.
"""
from functools import lru_cache
from pathlib import Path
from time import perf_counter
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

router = APIRouter(prefix="/prestige", tags=["Prestige Agent"])
LanguageCode = Literal["en", "ar", "tr", "ru"]


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=8000)
    persona: Literal["professor", "doctor", "tour-guide", "code-master", "nervous-system"] = "professor"
    language: LanguageCode = "en"
    session_id: str | None = Field(default=None, max_length=200)
    context: dict | None = None


class DiagnosisRequest(BaseModel):
    symptoms: list[str] = Field(min_length=1, max_length=30)
    error_codes: list[str] = Field(default_factory=list, max_length=30)
    language: LanguageCode = "en"


class GCodeRequest(BaseModel):
    gcode_program: str = Field(min_length=1, max_length=200000)
    language: LanguageCode = "en"
    operation_type: str | None = Field(default=None, max_length=80)
    material: str = Field(default="aluminum", max_length=80)


@lru_cache(maxsize=1)
def get_engine():
    from ai_agents.ydt_agent.ydt_chatbot_engine import YDTChatbotEngine

    knowledge = Path(__file__).resolve().parents[3] / "ai_agents" / "ydt_agent" / "knowledge"
    if not knowledge.exists():
        # Container layout puts apis and ai_agents together beneath /app.
        knowledge = Path(__file__).resolve().parents[2] / "ai_agents" / "ydt_agent" / "knowledge"
    if not knowledge.exists():
        raise HTTPException(503, "YDT knowledge package is unavailable")
    engine = YDTChatbotEngine(knowledge)
    if not any((engine.manual_data, engine.specs_data, engine.parsed_knowledge)):
        raise HTTPException(503, "YDT knowledge package is empty")
    return engine


def _answer(message: str, persona: str, language: str):
    from ai_agents.ydt_agent.ydt_chatbot_engine import ChatContext, Language, Persona

    engine = get_engine()
    context = ChatContext(
        user_id="public-advisory", machine_id="aim-7510", language=Language(language),
        persona=Persona(persona.replace("-", "_")), conversation_history=[],
    )
    return engine.process_query(message, context)


@router.post("/chat")
async def chat(request: ChatRequest):
    started = perf_counter()
    result = await run_in_threadpool(_answer, request.message, request.persona, request.language)
    confidence = float(result.confidence)
    if confidence <= 1:
        confidence *= 100
    return {"success": True, "data": {
        "response": result.content, "confidence": max(0, min(100, confidence)),
        "persona": request.persona, "language": request.language,
        "response_time": perf_counter() - started,
        "knowledge_sources": result.sources, "suggested_actions": result.suggested_actions,
        "visual_elements": result.visual_aids or {}, "advisory_only": True,
    }, "metadata": {"session_id": request.session_id, "engine_version": "2"}}


@router.post("/diagnose")
async def diagnose(request: DiagnosisRequest):
    message = "; ".join(request.symptoms + request.error_codes)
    if len(message) > 8000:
        raise HTTPException(422, "Symptoms and error codes exceed the request limit")
    result = await run_in_threadpool(_answer, message, "doctor", request.language)
    confidence = float(result.confidence)
    return {"success": True, "data": {
        "diagnosis": result.content, "confidence": min(100, max(0, confidence * 100 if confidence <= 1 else confidence)),
        "probable_causes": [], "immediate_actions": [], "repair_steps": result.suggested_actions,
        "required_tools": [], "required_parts": [], "estimated_time": "Not assessed",
        "urgency": "Requires technician assessment", "advisory_only": True,
        "safety_warnings": ["Knowledge-base advice does not authorize machine operation or repair."],
    }}


@router.post("/gcode/explain")
async def explain_gcode(request: GCodeRequest):
    """Line-by-line explanation of a G/M-code program against the manual's tables."""
    engine = await run_in_threadpool(get_engine)
    result = await run_in_threadpool(engine.explain_gcode, request.gcode_program, request.language)
    if result is None:
        raise HTTPException(503, "G-code knowledge is unavailable")
    return {"success": True, "data": result}


@router.post("/gcode/validate")
async def validate_gcode(request: GCodeRequest):
    """Advisory syntax/consistency checks. Never presented as machine validation."""
    engine = await run_in_threadpool(get_engine)
    result = await run_in_threadpool(engine.validate_gcode, request.gcode_program)
    if result is None:
        raise HTTPException(503, "G-code knowledge is unavailable")
    return {"success": True, "data": result}


@router.get("/gcode/sample")
async def gcode_sample(operation: str = "drill", material: str = "aluminum"):
    """A short, machine-accurate example program (advisory draft, not for execution)."""
    engine = await run_in_threadpool(get_engine)
    result = await run_in_threadpool(engine.gcode_sample, operation, material)
    if result is None:
        raise HTTPException(503, "G-code knowledge is unavailable")
    return {"success": True, "data": result}


@router.get("/learn/modules")
async def learning_modules(language: LanguageCode = "en"):
    from ai_agents.ydt_agent.university_curriculum import Module, get_module_progress

    modules = []
    for module in Module:
        entry = get_module_progress(module)
        lessons = entry.get("lessons_count", entry.get("total_lessons", 0))
        modules.append({"id": module.value, "title": entry.get("title", module.value),
                        "description": entry.get("description", ""), "lessons": lessons,
                        "estimated_hours": entry.get("estimated_hours", 0)})
    return {"success": True, "data": {"modules": modules, "language": language,
        "total_lessons": sum(item["lessons"] for item in modules),
        "estimated_hours": sum(item["estimated_hours"] for item in modules),
        "certification_available": False, "prerequisites": []}}


@router.get("/knowledge/stats")
async def knowledge_stats():
    engine = await run_in_threadpool(get_engine)
    return {"success": True, "data": {
        "components": len(engine.graph_data.get("components", [])),
        "spare_parts": len(engine.parts_data.get("parts", [])),
        "knowledge_loaded": True,
    }}


@router.get("/machine/capabilities")
async def machine_capabilities():
    engine = await run_in_threadpool(get_engine)
    return {"success": True, "data": {"machine": engine.specs_data.get("model_code", "AIM 7510"),
        "specifications": engine.specs_data, "advisory_only": True}}
