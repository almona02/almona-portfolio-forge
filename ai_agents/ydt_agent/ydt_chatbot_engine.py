"""
YDT Chatbot Engine - Multilingual automation Assistant
Combines: Nervous System + Professor + Doctor + Tour Guide
"""

import json
import re
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
import logging

from .guided_content import build_guide, guide_as_text

# Import new modules
try:
    from .arabic_support import (
        ARABIC_TECHNICAL_TERMS,
        translate_term,
        format_arabic_response,
        detect_arabic,
        create_arabic_operation_guide,
        create_arabic_diagnosis,
    )
except ImportError:
    # Fallback if module not available
    ARABIC_TECHNICAL_TERMS = {}

    def translate_term(english_term: str) -> str:
        return english_term

    def format_arabic_response(template: str, **kwargs) -> str:
        return template

    def detect_arabic(text: str) -> bool:
        return False

    def create_arabic_operation_guide(steps: list) -> str:
        return ""

    def create_arabic_diagnosis(issue: str, causes: list, solutions: list) -> str:
        return ""


try:
    from .gcode_ydt_integration import GCodeKnowledge
except ImportError:
    GCodeKnowledge = None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class Persona(Enum):
    """Chatbot persona modes"""

    NERVOUS_SYSTEM = "nervous_system"  # Real-time monitoring
    PROFESSOR = "professor"  # Teaching & training
    DOCTOR = "doctor"  # Diagnosis & treatment
    TOUR_GUIDE = "tour_guide"  # Navigation & location
    CODE_MASTER = "code_master"  # G-code programming expert


class Language(Enum):
    """Supported languages"""

    TURKISH = "tr"
    ENGLISH = "en"
    RUSSIAN = "ru"
    ARABIC = "ar"  # NEW: Arabic support


_TUTORIALS = {'en': {'title': 'AIM 7510 OPERATION TUTORIAL',
        'modules': [{'title': 'Safety First',
                     'steps': [{'title': 'Personal Protective Equipment', 'points': []},
                               {'title': 'Work Area & Emergency Stop', 'points': []}]},
                    {'title': 'Machine Startup',
                     'steps': [{'title': 'Power On', 'points': []},
                               {'title': 'System Initialization', 'points': []}]},
                    {'title': 'Tool Setup',
                     'steps': [{'title': 'Load Tools', 'points': []},
                               {'title': 'Set Offsets', 'points': []}]},
                    {'title': 'Cutting Operation',
                     'steps': [{'title': 'Load Program', 'points': []},
                               {'title': 'Run Cutting', 'points': []}]}]},
 'ar': {'title': 'دليل تشغيل AIM 7510',
        'modules': [{'title': 'السلامة أولاً',
                     'steps': [{'title': 'معدات الحماية الشخصية', 'points': []},
                               {'title': 'منطقة العمل والتوقف الطارئ', 'points': []}]},
                    {'title': 'تشغيل الماكينة',
                     'steps': [{'title': 'تشغيل الطاقة', 'points': []},
                               {'title': 'تهيئة النظام', 'points': []}]},
                    {'title': 'إعداد الأدوات',
                     'steps': [{'title': 'تحميل الأدوات', 'points': []},
                               {'title': 'ضبط الإزاحات', 'points': []}]},
                    {'title': 'التشغيل والقطع',
                     'steps': [{'title': 'تحميل البرنامج', 'points': []},
                               {'title': 'تنفيذ القطع', 'points': []}]}]},
 'tr': {'title': 'AIM 7510 İŞLETME EĞİTİMİ',
        'modules': [{'title': 'Önce Güvenlik',
                     'steps': [{'title': 'Kişisel Koruyucu Donanım', 'points': []},
                               {'title': 'Çalışma Alanı ve Acil Durdurma', 'points': []}]},
                    {'title': 'Makine Başlatma',
                     'steps': [{'title': 'Güç Açma', 'points': []},
                               {'title': 'Sistem Başlatma', 'points': []}]},
                    {'title': 'Takım Kurulumu',
                     'steps': [{'title': 'Takımları Yükle', 'points': []},
                               {'title': 'Ofsetleri Ayarla', 'points': []}]},
                    {'title': 'Kesim İşlemi',
                     'steps': [{'title': 'Programı Yükle', 'points': []},
                               {'title': 'Kesimi Çalıştır', 'points': []}]}]},
 'ru': {'title': 'ОБУЧЕНИЕ ПО РАБОТЕ С AIM 7510',
        'modules': [{'title': 'Безопасность прежде всего',
                     'steps': [{'title': 'Средства индивидуальной защиты', 'points': []},
                               {'title': 'Рабочая зона и аварийная остановка', 'points': []}]},
                    {'title': 'Запуск станка',
                     'steps': [{'title': 'Включение питания', 'points': []},
                               {'title': 'Инициализация системы', 'points': []}]},
                    {'title': 'Настройка инструмента',
                     'steps': [{'title': 'Загрузка инструментов', 'points': []},
                               {'title': 'Установка смещений', 'points': []}]},
                    {'title': 'Операция резки',
                     'steps': [{'title': 'Загрузка программы', 'points': []},
                               {'title': 'Выполнение резки', 'points': []}]}]}}


@dataclass
class ChatContext:
    """Conversation context"""

    user_id: str
    machine_id: str
    language: Language
    persona: Persona
    conversation_history: List[Dict[str, str]]
    current_topic: Optional[str] = None


@dataclass
class ChatResponse:
    """Chatbot response"""

    content: str
    confidence: float
    sources: List[str]
    suggested_actions: List[str]
    visual_aids: Optional[Dict[str, Any]] = None


class YDTChatbotEngine:
    """YDT Chatbot Engine - Multilingual automation Assistant"""

    def __init__(self, knowledge_base_path: Path):
        self.knowledge_base = Path(knowledge_base_path)
        self.machine_id = "aim-7510"

        # Load knowledge sources
        self._load_knowledge()

    def _load_knowledge(self):
        """Load all knowledge sources"""
        processed_dir = self.knowledge_base / "processed" / self.machine_id

        # Load manual structure
        manual_file = processed_dir / "structure.json"
        if manual_file.exists():
            with open(manual_file, "r", encoding="utf-8") as f:
                self.manual_data = json.load(f)
        else:
            self.manual_data = {}

        # Load wiring diagram
        wiring_file = processed_dir / "vision_ai_extraction.json"
        if wiring_file.exists():
            with open(wiring_file, "r", encoding="utf-8") as f:
                self.wiring_data = json.load(f)
        else:
            self.wiring_data = {}

        # Load spare parts
        parts_file = processed_dir / "spare_parts.json"
        if parts_file.exists():
            with open(parts_file, "r", encoding="utf-8") as f:
                self.parts_data = json.load(f)
        else:
            self.parts_data = {}

        # Load specifications
        specs_file = processed_dir / "specifications_gold_tier.json"
        if specs_file.exists():
            with open(specs_file, "r", encoding="utf-8") as f:
                self.specs_data = json.load(f)
        else:
            self.specs_data = {}

        # Load machine-specific, multi-language G/M-code reference
        self.gcode_knowledge = None
        if GCodeKnowledge is not None:
            try:
                self.gcode_knowledge = GCodeKnowledge(processed_dir)
                if not self.gcode_knowledge.commands:
                    logger.warning("[YDT CHATBOT] G/M-code reference is empty")
            except Exception as e:  # noqa: BLE001
                logger.warning(f"[YDT CHATBOT] Failed to load G/M-code reference: {e}")

        # Load alarm-code index (multi-language, manual sec. 18)
        self.alarm_codes = {}
        alarm_file = processed_dir / "alarm_codes.json"
        if alarm_file.exists():
            try:
                with open(alarm_file, "r", encoding="utf-8") as f:
                    self.alarm_codes = {a["code"]: a for a in json.load(f).get("alarms", [])}
            except Exception as e:  # noqa: BLE001
                logger.warning(f"[YDT CHATBOT] Failed to load alarm codes: {e}")

        # Load component graph
        graph_file = processed_dir / "wiring_diagram_analysis.json"
        if graph_file.exists():
            with open(graph_file, "r", encoding="utf-8") as f:
                self.graph_data = json.load(f)
        else:
            self.graph_data = {}

        # Load NEW parsed documentation knowledge base
        # Try multiple paths to find knowledge-base.json
        possible_paths = [
            # From ai_agents/ydt_agent/knowledge -> project root -> src/lib/ydt
            self.knowledge_base.parent.parent.parent
            / "src"
            / "lib"
            / "ydt"
            / "knowledge-base.json",
            # From current working directory
            Path.cwd() / "src" / "lib" / "ydt" / "knowledge-base.json",
            # Relative to this file
            Path(__file__).parent.parent.parent.parent
            / "src"
            / "lib"
            / "ydt"
            / "knowledge-base.json",
            # Production path (if deployed in Docker/container)
            Path("/app/src/lib/ydt/knowledge-base.json"),
            Path("/app/python_backend/../src/lib/ydt/knowledge-base.json"),
        ]

        self.parsed_knowledge = {}
        loaded = False
        for kb_path in possible_paths:
            logger.info(f"[YDT CHATBOT] Trying to load knowledge base from: {kb_path}")
            if kb_path.exists():
                try:
                    with open(kb_path, "r", encoding="utf-8") as f:
                        self.parsed_knowledge = json.load(f)
                    logger.info(
                        f"[YDT CHATBOT] ✅ Loaded parsed knowledge base "
                        f"from: {kb_path}"
                    )
                    egyptian_kb = self.parsed_knowledge.get("egyptian", {}).get(
                        "fabricationKnowledge", {}
                    )
                    system_count = len(
                        egyptian_kb.get("systemPacks", {}).get("systems", [])
                    )
                    role_count = len(
                        egyptian_kb.get("profileRoles", {}).get("roles", [])
                    )
                    files_count = self.parsed_knowledge.get("documents", {}).get(
                        "totalFiles", 0
                    )
                    workflows_count = len(self.parsed_knowledge.get("workflows", {}))
                    logger.info(
                        f"[YDT CHATBOT] Parsed knowledge stats: "
                        f"{files_count} files, "
                        f"{workflows_count} workflows, "
                        f"{system_count} systems, "
                        f"{role_count} profile roles"
                    )
                    loaded = True
                    break
                except Exception as e:
                    logger.warning(
                        f"Failed to load parsed knowledge base " f"from {kb_path}: {e}",
                        exc_info=True,
                    )

        if not loaded:
            paths_tried = [str(p) for p in possible_paths]
            logger.error(
                "[YDT CHATBOT] ❌ Parsed knowledge base not found at any path. "
                "Egyptian fabrication knowledge will not be available. "
                f"Tried paths: {paths_tried}"
            )

        logger.info(
            f"[YDT CHATBOT] Knowledge loaded: "
            f"{len(self.manual_data.get('chapters', []))} chapters, "
            f"{len(self.wiring_data.get('components', []))} components, "
            f"{len(self.parts_data.get('parts', []))} parts, "
            f"{'✅' if self.parsed_knowledge else '❌'} parsed documentation"
        )

    def process_query(self, query: str, context: ChatContext) -> ChatResponse:
        """
        Process user query and generate response based on persona

        This is the main entry point for the chatbot
        """
        # Detect intent
        intent = self._detect_intent(query, context.language)

        # Route to appropriate handler based on persona
        if context.persona == Persona.PROFESSOR:
            return self._professor_response(query, intent, context)
        elif context.persona == Persona.DOCTOR:
            return self._doctor_response(query, intent, context)
        elif context.persona == Persona.TOUR_GUIDE:
            return self._tour_guide_response(query, intent, context)
        elif context.persona == Persona.NERVOUS_SYSTEM:
            return self._nervous_system_response(query, intent, context)
        elif context.persona == Persona.CODE_MASTER:
            return self._code_master_response(query, intent, context)
        else:
            return self._general_response(query, intent, context)

    def _detect_intent(self, query: str, language: Language) -> str:
        """Detect user intent from query"""
        query_lower = query.lower()
        if any(term in query_lower for term in (
            "explore applications", "application", "uygulama", "применени", "تطبيقات", "استخدامات"
        )):
            return "applications"
        if any(term in query_lower for term in ("diagnos", "teşhis", "диагност", "تشخيص")):
            return "diagnosis"
        if any(term in query_lower for term in ("обучи", "işletim", "kullanmayı")):
            return "teaching"


        # Arabic detection
        if language == Language.ARABIC or detect_arabic(query):
            arabic_patterns = {
                "teaching": ["علم", "علّم", "علّمني", "تعلم", "كيف", "شرح", "دليل", "تشغيل", "شغّل", "تعليم"],
                "diagnosis": ["خطأ", "مشكلة", "عطل", "تشخيص", "لا يعمل", "لا يدور", "توقف", "معطل", "إنذار"],
                "location": ["أين", "موقع", "مكان"],
                "information": ["ما هو", "معلومات", "مواصفات"],
                "parts": ["قطعة", "جزء", "غيار"],
                "gcode": ["كود", "برنامج", "G-code"],
            }
            for intent, patterns in arabic_patterns.items():
                if any(pattern in query for pattern in patterns):
                    return intent

        # Intent patterns (TR/EN/RU)
        if any(
            word in query_lower
            for word in [
                "teach",
                "learn",
                "how to",
                "öğret",
                "öğren",
                "как",
                "gcode",
                "g-code",
            ]
        ):
            return "teaching"
        elif any(
            word in query_lower
            for word in [
                "fault",
                "error",
                "problem",
                "alarm",
                "not rotating",
                "not working",
                "does not work",
                "doesn't work",
                "won't",
                "stopped",
                "fails",
                "failure",
                "arıza",
                "hata",
                "çalışmıyor",
                "неисправность",
                "не работает",
            ]
        ):
            return "diagnosis"
        elif any(
            word in query_lower for word in ["where", "location", "nerede", "где"]
        ):
            return "location"
        elif any(
            word in query_lower
            for word in [
                "spec",
                "power",
                "capacity",
                "özellik",
                "характеристика",
            ]
        ):
            return "information"
        elif any(
            word in query_lower for word in ["part", "spare", "yedek", "запчасть"]
        ):
            return "parts"
        elif any(
            word in query_lower for word in ["gcode", "g-code", "program", "generate"]
        ):
            return "gcode"
        elif any(
            word in query_lower
            for word in [
                "egyptian",
                "egypt",
                "system",
                "fabrication",
                "fabricator",
                "profile",
                "aluminum",
                "upvc",
                "system pack",
                "systempack",
                "connection",
                "cutting",
                "role",
                "roles",
                "profiles",
            ]
        ):
            return "egyptian_system"
        else:
            return "general"

    def _professor_response(
        self, query: str, intent: str, context: ChatContext
    ) -> ChatResponse:
        """Professor persona - Teaching mode"""
        if intent == "teaching" or query.casefold().startswith(("explain:", "اشرح:", "açıkla:", "объясните:")):
            return self._guided_response("operation", context, topic=query)
        else:
            return self._general_response(query, intent, context)

    def _doctor_response(
        self, query: str, intent: str, context: ChatContext
    ) -> ChatResponse:
        """Doctor persona - Diagnosis mode (alarm codes first)."""
        code = self._extract_alarm_code(query)
        if code:
            return self._alarm_response(code, context)
        return self._guided_response("diagnosis", context, symptom=query.strip())

    @staticmethod
    def _extract_alarm_code(query: str) -> Optional[str]:
        """Return a normalized 0xCODE (e.g. 0xA00C) if the query contains one."""
        m = re.search(r"0x[0-9A-Fa-f]{4}", query)
        if not m:
            return None
        return "0x" + m.group(0)[2:].upper()

    def _lookup_alarm_code(self, code: str, language: str) -> Optional[Dict[str, Any]]:
        entry = self.alarm_codes.get(code)
        if not entry:
            return None

        def pick(field: str) -> Optional[str]:
            for lang in (language, "en"):
                value = entry.get(lang, {}).get(field)
                if value:
                    return value
            return None

        detail = entry.get(language, {}).get("detail") or entry.get("en", {}).get("detail") or []
        return {
            "code": entry["code"],
            "title": pick("title") or "",
            "detail": detail,
            "translations": {
                lang: entry[lang]["title"]
                for lang in ("en", "tr", "ru")
                if entry[lang].get("title")
            },
            "source_section": "18. Alarm List",
            "source_document": "MKK.028_1ET089000-0122_AIM_7510_(20.07.2020)_REV.07.pdf",
        }

    def _alarm_response(self, code: str, context: ChatContext) -> ChatResponse:
        lang = (
            context.language.value
            if isinstance(context.language, Language)
            else str(context.language)
        )
        result = self._lookup_alarm_code(code, lang)
        if not result:
            return ChatResponse(
                content=(
                    f"{code} is not in the AIM-7510 manual alarm list (sec. 18). "
                    "Check the alarm on the operator panel and contact YILMAZ "
                    "service if it persists."
                ),
                confidence=0.3,
                sources=[],
                suggested_actions=["Check the operator panel", "Contact service"],
            )
        title = result["title"]
        detail = "\n".join(f"• {d}" for d in result["detail"])
        tr = result["translations"].get("tr")
        ru = result["translations"].get("ru")
        trs = f"\nTR: {tr}" if tr and lang != "tr" else ""
        rus = f"\nRU: {ru}" if ru and lang != "ru" else ""
        return ChatResponse(
            content=(
                f"{code} — {title}\n{detail}{trs}{rus}\n\n"
                f"Source: {result['source_section']} — {result['source_document']}"
            ),
            confidence=1.0,
            sources=[result["source_document"], "18. Alarm List"],
            suggested_actions=["Describe symptoms", "Check wiring diagram", "Contact service"],
        )

    def _tour_guide_response(
        self, query: str, intent: str, context: ChatContext
    ) -> ChatResponse:
        """Tour Guide persona - Navigation mode"""
        if intent == "applications" or query.casefold().startswith(("explain:", "اشرح:", "açıkla:", "объясните:")):
            return self._guided_response("applications", context, topic=query)
        if intent == "location":
            # Find component location
            response = self._find_component_location(query, context)
            return ChatResponse(
                content=response,
                confidence=0.90,
                sources=["wiring_diagram", "component_coordinates"],
                suggested_actions=[
                    "Show diagram",
                    "Test component",
                    "View connections",
                ],
                visual_aids={"component_id": self._extract_component_id(query)},
            )
        else:
            return self._general_response(query, intent, context)

    def _nervous_system_response(
        self, query: str, intent: str, context: ChatContext
    ) -> ChatResponse:
        """Nervous System persona - Monitoring mode"""
        # Real-time monitoring (would integrate with IoT data)
        response = self._generate_monitoring_status(query, context)
        return ChatResponse(
            content=response,
            confidence=0.90,
            sources=["component_status", "performance_metrics"],
            suggested_actions=["View details", "Check history", "Set alert"],
        )

    # ---------------------------------------------------------------- G-code
    def _code_master_response(self, query: str, intent: str, context: ChatContext) -> ChatResponse:
        """Code Master persona: explain / validate / sample G/M-code (advisory)."""
        lang = (
            context.language.value
            if isinstance(context.language, Language)
            else str(context.language)
        )
        if self.gcode_knowledge is None:
            return ChatResponse(
                content=(
                    "G-code guidance is currently unavailable: the AIM-7510 G/M-code "
                    "reference did not load. This is reported as a missing-knowledge "
                    "failure, not a fallback answer."
                ),
                confidence=0.0,
                sources=[],
                suggested_actions=["Recheck the knowledge package"],
            )

        gk = self.gcode_knowledge
        text = query.strip()
        low = text.lower()

        tokens = re.findall(r"\b[GM]\d+(?:\.\d+)?[A-Za-z]?\b", text.upper())
        wants_sample = any(
            w in low
            for w in ("sample", "example", "generate", "örnek", "oluştur", "пример", "создать", "مثال", "أنشئ")
        )
        wants_validate = any(
            w in low
            for w in ("validate", "check", "verify", "doğrula", "kontrol", "провер", "تحقق", "فحص")
        )

        # Pasted program -> explain line by line.
        if "\n" in text and len(tokens) >= 2:
            result = gk.explain_program(text, lang)
            return ChatResponse(
                content=self._format_explain_program(result),
                confidence=0.95 if not result["unknown_commands"] else 0.7,
                sources=[result["source_document"], "13. G code functions", "14. M code functions"],
                suggested_actions=["Validate this program", "Show a sample program", "Explain one command"],
                visual_aids={"gcode": result},
            )

        # Single-command question ("what is G71?" / "M3").
        if len(tokens) == 1 and len(text.split()) <= 6 and not wants_validate:
            result = gk.explain_command(tokens[0], lang)
            return ChatResponse(
                content=self._format_explain_command(result),
                confidence=1.0 if result.get("known") else 0.3,
                sources=[result.get("source_document")] if result.get("source_document") else [],
                suggested_actions=["Show a sample program", "Explain a program"],
            )

        if wants_validate and tokens:
            result = gk.validate_program(text)
            return ChatResponse(
                content=self._format_validate_program(result),
                confidence=0.8,
                sources=[result["source_document"], "13. G code functions", "14. M code functions"],
                suggested_actions=["Explain this program", "Show a sample program"],
                visual_aids={"gcode_validation": result},
            )

        if wants_sample:
            result = gk.sample_program()
            return ChatResponse(
                content=self._format_sample_program(result),
                confidence=0.9,
                sources=[result["source_document"], "13. G code functions", "14. M code functions"],
                suggested_actions=["Explain a command", "Validate a program"],
                visual_aids={"gcode_sample": result},
            )

        # Default: a sample + how to use.
        sample = gk.sample_program()
        return ChatResponse(
            content=(
                self._format_sample_program(sample)
                + "\n\nPaste a G-code program and I'll explain it line by line, or ask "
                "'validate <program>' for advisory checks. Every answer cites the "
                "AIM-7510 manual (13. G code functions / 14. M code functions)."
            ),
            confidence=0.9,
            sources=[sample["source_document"]],
            suggested_actions=["Explain a command", "Validate a program"],
        )

    @staticmethod
    def _format_explain_command(result: Dict[str, Any]) -> str:
        if not result.get("known"):
            return result.get("description", "")
        parts = [f"{result['code']} ({result.get('category', '')})", result.get("description", "")]
        translations = result.get("translations", {})
        if translations.get("tr"):
            parts.append(f"TR: {translations['tr']}")
        if translations.get("ru"):
            parts.append(f"RU: {translations['ru']}")
        parts.append(f"Source: {result.get('source_section')} — {result.get('source_document')}")
        return "\n".join(parts)

    @staticmethod
    def _format_explain_program(result: Dict[str, Any]) -> str:
        lines_out = []
        for line in result["lines"]:
            if not line["commands"]:
                continue
            descs = []
            for c in line["commands"]:
                if c.get("known"):
                    descs.append(f"{c['code']} = {c['description']}")
                else:
                    descs.append(f"{c['code']} = (not in AIM-7510 manual tables)")
            lines_out.append(f"{line['raw']}\n   -> {'; '.join(descs)}")
        header = "Line-by-line explanation (advisory — not machine validation):\n"
        if result.get("unknown_commands"):
            header += f"Unknown commands to verify: {', '.join(result['unknown_commands'])}\n"
        header += f"Source: {result['source_document']}\n"
        return header + "\n".join(lines_out)

    @staticmethod
    def _format_validate_program(result: Dict[str, Any]) -> str:
        if not result["findings"]:
            lines = ["No advisory findings."]
        else:
            lines = [f"- [{f['severity']}] {f['message']}" for f in result["findings"]]
        known = ", ".join(f"{v['label']}: {v['value']}" for v in result["known_limits"].values())
        unverified = ", ".join(v["label"] for v in result["unverified_limits"])
        return (
            "Advisory G-code checks (NOT machine validation):\n"
            + "\n".join(lines)
            + f"\n\nKnown limits: {known or 'none extracted'}"
            + f"\nNot extracted (see manual): {unverified}"
            + f"\n\n{result['limits_note']}"
            + f"\nSource: {result['source_document']}"
        )

    @staticmethod
    def _format_sample_program(result: Dict[str, Any]) -> str:
        notes = "\n".join(f"- {n}" for n in result["notes"])
        return (
            f"Sample {result['operation']} program for {result['machine_id']}:\n"
            f"{result['program']}\n\nNotes:\n{notes}"
        )

    def explain_gcode(self, gcode: str, language: str = "en") -> Optional[Dict[str, Any]]:
        if self.gcode_knowledge is None:
            return None
        return self.gcode_knowledge.explain_program(gcode, language)

    def validate_gcode(self, gcode: str) -> Optional[Dict[str, Any]]:
        if self.gcode_knowledge is None:
            return None
        return self.gcode_knowledge.validate_program(gcode)

    def gcode_sample(self, operation: str = "drill", material: str = "aluminum") -> Optional[Dict[str, Any]]:
        if self.gcode_knowledge is None:
            return None
        return self.gcode_knowledge.sample_program(operation, material)

    def _query_parsed_knowledge(self, query: str) -> Optional[str]:
        """Query parsed documentation knowledge base for Egyptian/fabrication"""
        if not self.parsed_knowledge:
            logger.warning(
                "[YDT CHATBOT] Cannot query parsed knowledge - "
                "knowledge base not loaded"
            )
            return None

        query_lower = query.lower()
        response_parts = []

        # Check for Egyptian fabrication knowledge
        egyptian_kb = self.parsed_knowledge.get("egyptian", {}).get(
            "fabricationKnowledge", {}
        )

        # System Packs
        if any(
            word in query_lower
            for word in [
                "system",
                "pack",
                "system pack",
                "systempack",
                "systems",
            ]
        ):
            system_packs = egyptian_kb.get("systemPacks", {}).get("systems", [])
            if system_packs:
                response_parts.append("## System Packs\n\n")
                for system in system_packs[:10]:  # Show first 10
                    name = system.get("name", "Unknown")
                    description = system.get("description", "")
                    if description:
                        response_parts.append(f"**{name}**: {description}\n\n")
                    else:
                        response_parts.append(f"**{name}**\n\n")
            else:
                response_parts.append(
                    "## System Packs\n\n" "No system packs found in knowledge base.\n\n"
                )

        # Profile Roles
        if any(
            word in query_lower
            for word in ["profile", "role", "profiles", "profilerole", "roles"]
        ):
            profile_roles = egyptian_kb.get("profileRoles", {}).get("roles", [])
            if profile_roles:
                response_parts.append("## Profile Roles\n\n")
                for role in profile_roles[:15]:  # Show first 15
                    name = role.get("name", "Unknown")
                    function = role.get("function", "")
                    if function:
                        response_parts.append(f"**{name}**: {function}\n\n")
                    else:
                        response_parts.append(f"**{name}**\n\n")
            else:
                response_parts.append(
                    "## Profile Roles\n\n"
                    "No profile roles found in knowledge base.\n\n"
                )

        # Connections
        if any(word in query_lower for word in ["connection", "connect", "joint"]):
            connections = egyptian_kb.get("connections", {}).get("types", [])
            if connections:
                response_parts.append("## Connection Types\n")
                for conn in connections[:5]:
                    name = conn.get("name", "Unknown")
                    description = conn.get("description", "")
                    response_parts.append(f"**{name}**: {description}\n")

        # Cutting Rules
        if any(word in query_lower for word in ["cutting", "cut", "rule"]):
            cutting = egyptian_kb.get("cutting", {}).get("rules", [])
            if cutting:
                response_parts.append("## Cutting Rules\n")
                for rule in cutting[:5]:
                    name = rule.get("name", "Unknown")
                    description = rule.get("description", "")
                    response_parts.append(f"**{name}**: {description}\n")

        # General Egyptian system info
        if not response_parts and any(
            word in query_lower
            for word in [
                "egyptian",
                "egypt",
                "fabrication",
                "fabricator",
                "fabricator pro",
            ]
        ):
            # Provide overview
            total_systems = len(egyptian_kb.get("systemPacks", {}).get("systems", []))
            total_roles = len(egyptian_kb.get("profileRoles", {}).get("roles", []))
            total_connections = len(egyptian_kb.get("connections", {}).get("types", []))
            total_cutting = len(egyptian_kb.get("cutting", {}).get("rules", []))

            response_parts.append("## Egyptian Fabrication Knowledge\n\n")
            response_parts.append(
                "The knowledge base contains comprehensive "
                "fabrication information:\n\n"
                f"- **{total_systems}** system packs\n"
                f"- **{total_roles}** profile roles\n"
                f"- **{total_connections}** connection types\n"
                f"- **{total_cutting}** cutting rules\n\n"
                "You can ask about:\n"
                "- 'Tell me about system packs'\n"
                "- 'What are profile roles?'\n"
                "- 'Show me connection types'\n"
                "- 'What are the cutting rules?'\n"
                "- 'Explain fabrication processes'\n"
            )

        if response_parts:
            return "\n".join(response_parts)
        return None

    def _general_response(
        self, query: str, intent: str, context: ChatContext
    ) -> ChatResponse:
        """General response handler"""
        # Check parsed knowledge first for Egyptian/fabrication queries
        query_lower = query.lower()
        is_egyptian_query = intent == "egyptian_system" or any(
            word in query_lower
            for word in [
                "egyptian",
                "egypt",
                "system",
                "fabrication",
                "fabricator",
                "profile",
                "system pack",
                "systempack",
                "role",
                "connection",
                "cutting",
            ]
        )

        if is_egyptian_query:
            parsed_response = self._query_parsed_knowledge(query)
            if parsed_response:
                logger.info(
                    f"[YDT CHATBOT] Responding with parsed knowledge " f"for: {query}"
                )
                return ChatResponse(
                    content=parsed_response,
                    confidence=0.9,
                    sources=["parsed_documentation", "fabrication_knowledge"],
                    suggested_actions=[
                        "Ask about specific system packs",
                        "Learn about profile roles",
                        "Explore connection types",
                    ],
                )
            else:
                logger.warning(
                    f"[YDT CHATBOT] Egyptian query detected but "
                    f"no parsed knowledge available: {query}"
                )
        # Information lookup
        if intent == "information":
            response = self._lookup_information(query, context)
            return ChatResponse(
                content=response,
                confidence=0.95,
                sources=["specifications", "manual"],
                suggested_actions=["Learn more", "See related specs"],
            )
        elif intent == "parts":
            response = self._lookup_spare_part(query, context)
            return ChatResponse(
                content=response,
                confidence=1.0,
                sources=["spare_parts_catalog"],
                suggested_actions=[
                    "Order part",
                    "Check availability",
                    "View alternatives",
                ],
            )
        else:
            # Default response
            return ChatResponse(
                content=self._generate_default_response(query, context),
                confidence=0.80,
                sources=["general_knowledge"],
                suggested_actions=[
                    "Be more specific",
                    "Switch persona",
                    "Ask for help",
                ],
            )

    def _guided_response(self, kind: str, context: ChatContext, symptom=None, topic=None) -> ChatResponse:
        lang = context.language.value if isinstance(context.language, Language) else str(context.language)
        guide = build_guide(kind, lang, _TUTORIALS, symptom)
        if topic:
            focused = []
            for module in guide["modules"]:
                steps = [step for step in module["steps"] if step["title"].casefold() in topic.casefold()]
                if steps:
                    focused.append({"title": module["title"], "steps": steps})
            if focused:
                guide["modules"] = focused
        return ChatResponse(
            content=guide_as_text(guide), confidence=0.0,
            sources=["editorial_learning_outline", "AIM_7510_manual_reading_references"],
            suggested_actions=[], visual_aids={"guided_content": guide},
        )

    def _generate_tutorial(self, query: str, context: ChatContext) -> str:
        return self._guided_response("operation", context).content

    def _generate_diagnosis(self, query: str, context: ChatContext) -> str:
        return self._guided_response("diagnosis", context, symptom=query.strip()).content

    def _find_component_location(self, query: str, context: ChatContext) -> str:
        """Find component location in machine"""
        return (
            "Component location information would be retrieved from "
            "the wiring diagram knowledge base."
        )

    def _extract_component_id(self, query: str) -> str:
        """Extract component ID from query"""
        # Simple extraction - would be enhanced with NLP
        import re

        match = re.search(r"[KM]\d+", query.upper())
        return match.group(0) if match else ""

    def _generate_monitoring_status(self, query: str, context: ChatContext) -> str:
        """Generate real-time monitoring status"""
        return (
            "Real-time monitoring status would be retrieved from "
            "IoT sensors and machine state."
        )

    def _lookup_information(self, query: str, context: ChatContext) -> str:
        """Lookup information from knowledge base"""
        query_lower = query.lower()

        # Check specifications first
        if hasattr(self, "specs_data") and self.specs_data:
            specs = self.specs_data
            # Look for power, speed, capacity, etc.
            if "power" in query_lower:
                power = specs.get("power_rating_kw", specs.get("power", "N/A"))
                return (
                    f"The AIM 7510 power rating is {power} kW. "
                    "This is a 5-axis CNC machine with high precision "
                    "capabilities."
                )
            elif "speed" in query_lower or "rpm" in query_lower:
                speed = specs.get("spindle_speed_rpm", specs.get("max_speed", "N/A"))
                return f"The AIM 7510 spindle speed is up to {speed} RPM."
            elif "axis" in query_lower or "axes" in query_lower:
                return (
                    "The AIM 7510 is a 5-axis CNC machine, providing full "
                    "3D machining capabilities with X, Y, Z, A, and C axes."
                )
            elif "capacity" in query_lower or "size" in query_lower:
                work_area = specs.get("work_area", "Check manual for dimensions")
                return f"Machine capacity: {work_area}"

        # Check manual data
        if hasattr(self, "manual_data") and self.manual_data:
            chapters = self.manual_data.get("chapters", [])
            for chapter in chapters:
                if any(
                    word in chapter.get("title", "").lower()
                    for word in query_lower.split()
                ):
                    content = chapter.get("content", "")[:500]
                    return f"According to the AIM 7510 manual: {content}..."

        # Default response
        return (
            "I can help you find information about AIM 7510 specifications, "
            "operations, and procedures. Could you be more specific about "
            "what you need?"
        )

    def _lookup_spare_part(self, query: str, context: ChatContext) -> str:
        """Lookup spare part information"""
        return (
            "Spare part information would be retrieved from the parts "
            "catalog knowledge base."
        )

    def _generate_default_response(self, query: str, context: ChatContext) -> str:
        """Generate default response when intent is unclear"""
        # Try to provide a helpful response based on available knowledge
        query_lower = query.lower()

        # Check if query matches any known topics
        if (
            "operation" in query_lower
            or "operate" in query_lower
            or "teach" in query_lower
        ):
            return self._generate_tutorial(query, context)
        elif (
            "fault" in query_lower or "error" in query_lower or "problem" in query_lower
        ):
            return self._generate_diagnosis(query, context)
        elif "part" in query_lower or "spare" in query_lower:
            return self._lookup_spare_part(query, context)
        else:
            return (
                f"I understand you're asking about '{query}'. "
                "I can help you with AIM 7510 operations, diagnostics, "
                "maintenance, and G-code programming. Could you please "
                "rephrase your question or specify what you need? "
                "For example:\n"
                "- 'Teach me how to operate the machine'\n"
                "- 'What is the power rating?'\n"
                "- 'Help me diagnose a fault'\n"
                "- 'Show me spare parts'"
            )
