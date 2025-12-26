"""
YDT Chatbot Engine - Multilingual AI Assistant
Combines: Nervous System + Professor + Doctor + Tour Guide
"""

import json
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
import logging

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

    def translate_term(term):
        return term

    def format_arabic_response(template, **kwargs):
        return template

    def detect_arabic(text):
        return False

    def create_arabic_operation_guide(steps):
        return ""

    def create_arabic_diagnosis(issue, causes, solutions):
        return ""


try:
    from .gcode_ydt_integration import YDTGCodeEnhancer, GCodeYDTValidator
except ImportError:
    YDTGCodeEnhancer = None
    GCodeYDTValidator = None

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
    """YDT Chatbot Engine - Multilingual AI Assistant"""

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
        ]

        self.parsed_knowledge = {}
        for kb_path in possible_paths:
            if kb_path.exists():
                try:
                    with open(kb_path, "r", encoding="utf-8") as f:
                        self.parsed_knowledge = json.load(f)
                    logger.info(
                        f"[YDT CHATBOT] Loaded parsed knowledge base from: {kb_path}"
                    )
                    logger.info(
                        f"[YDT CHATBOT] Parsed knowledge: "
                        f"{self.parsed_knowledge.get('documents', {}).get('totalFiles', 0)} files, "
                        f"{len(self.parsed_knowledge.get('workflows', {}))} workflows, "
                        f"{len(self.parsed_knowledge.get('egyptian', {}).get('fabricationKnowledge', {}).get('systemPacks', {}).get('systems', [])) if self.parsed_knowledge.get('egyptian', {}).get('fabricationKnowledge', {}).get('systemPacks', {}) else 0} systems"
                    )
                    break
                except Exception as e:
                    logger.warning(
                        f"Failed to load parsed knowledge base from {kb_path}: {e}"
                    )
        else:
            logger.warning(
                "[YDT CHATBOT] Parsed knowledge base not found. "
                "Egyptian fabrication knowledge will not be available."
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
        else:
            return self._general_response(query, intent, context)

    def _detect_intent(self, query: str, language: Language) -> str:
        """Detect user intent from query"""
        query_lower = query.lower()

        # Arabic detection
        if language == Language.ARABIC or detect_arabic(query):
            arabic_patterns = {
                "teaching": ["علم", "تعلم", "كيف", "شرح", "دليل"],
                "diagnosis": ["خطأ", "مشكلة", "عطل", "عطل", "تشخيص"],
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
            for word in ["fault", "error", "problem", "arıza", "hata", "неисправность"]
        ):
            return "diagnosis"
        elif any(
            word in query_lower for word in ["where", "location", "nerede", "где"]
        ):
            return "location"
        elif any(
            word in query_lower
            for word in ["spec", "power", "capacity", "özellik", "характеристика"]
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
                "profile",
                "aluminum",
                "upvc",
                "system pack",
                "connection",
                "cutting",
                "role",
            ]
        ):
            return "egyptian_system"
        else:
            return "general"

    def _professor_response(
        self, query: str, intent: str, context: ChatContext
    ) -> ChatResponse:
        """Professor persona - Teaching mode"""
        if intent == "teaching":
            # Generate step-by-step tutorial
            response = self._generate_tutorial(query, context)
            return ChatResponse(
                content=response,
                confidence=0.95,
                sources=["user_manual", "chapters"],
                suggested_actions=[
                    "Continue tutorial",
                    "Ask question",
                    "Switch to practice mode",
                ],
            )
        else:
            return self._general_response(query, intent, context)

    def _doctor_response(
        self, query: str, intent: str, context: ChatContext
    ) -> ChatResponse:
        """Doctor persona - Diagnosis mode"""
        if intent == "diagnosis":
            # Generate diagnosis
            response = self._generate_diagnosis(query, context)
            return ChatResponse(
                content=response,
                confidence=0.85,
                sources=["wiring_diagram", "component_graph", "manual"],
                suggested_actions=[
                    "Check component",
                    "View wiring diagram",
                    "Order spare part",
                ],
            )
        else:
            return self._general_response(query, intent, context)

    def _tour_guide_response(
        self, query: str, intent: str, context: ChatContext
    ) -> ChatResponse:
        """Tour Guide persona - Navigation mode"""
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

    def _query_parsed_knowledge(self, query: str) -> Optional[str]:
        """Query the parsed documentation knowledge base for Egyptian/fabrication info"""
        if not self.parsed_knowledge:
            return None

        query_lower = query.lower()
        response_parts = []

        # Check for Egyptian fabrication knowledge
        egyptian_kb = self.parsed_knowledge.get("egyptian", {}).get(
            "fabricationKnowledge", {}
        )

        # System Packs
        if any(word in query_lower for word in ["system", "pack", "system pack"]):
            system_packs = egyptian_kb.get("systemPacks", {}).get("systems", [])
            if system_packs:
                response_parts.append("## System Packs\n")
                for system in system_packs[:5]:  # Show first 5
                    name = system.get("name", "Unknown")
                    description = system.get("description", "")
                    response_parts.append(f"**{name}**: {description}\n")

        # Profile Roles
        if any(word in query_lower for word in ["profile", "role", "profiles"]):
            profile_roles = egyptian_kb.get("profileRoles", {}).get("roles", [])
            if profile_roles:
                response_parts.append("## Profile Roles\n")
                for role in profile_roles[:10]:  # Show first 10
                    name = role.get("name", "Unknown")
                    function = role.get("function", "")
                    response_parts.append(f"**{name}**: {function}\n")

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
            word in query_lower for word in ["egyptian", "egypt"]
        ):
            # Provide overview
            total_systems = len(egyptian_kb.get("systemPacks", {}).get("systems", []))
            total_roles = len(egyptian_kb.get("profileRoles", {}).get("roles", []))
            total_connections = len(egyptian_kb.get("connections", {}).get("types", []))

            response_parts.append("## Egyptian Fabrication Knowledge\n\n")
            response_parts.append(
                f"The knowledge base contains:\n"
                f"- **{total_systems}** system packs\n"
                f"- **{total_roles}** profile roles\n"
                f"- **{total_connections}** connection types\n\n"
                f"Ask about specific topics like:\n"
                f"- 'What system packs are available?'\n"
                f"- 'Tell me about profile roles'\n"
                f"- 'Show me connection types'\n"
                f"- 'What are the cutting rules?'\n"
            )

        if response_parts:
            return "\n".join(response_parts)
        return None

    def _general_response(
        self, query: str, intent: str, context: ChatContext
    ) -> ChatResponse:
        """General response handler"""
        # Check parsed knowledge first for Egyptian/fabrication queries
        if intent == "egyptian_system" or any(
            word in query.lower()
            for word in ["egyptian", "egypt", "system", "fabrication", "profile"]
        ):
            parsed_response = self._query_parsed_knowledge(query)
            if parsed_response:
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

    def _generate_tutorial(self, query: str, context: ChatContext) -> str:
        """Generate step-by-step tutorial using knowledge base"""
        # Search knowledge base for relevant content
        query_lower = query.lower()

        # Try to find relevant chapters from manual
        relevant_content = []
        if hasattr(self, "manual_data") and self.manual_data:
            chapters = self.manual_data.get("chapters", [])
            for chapter in chapters:
                title = chapter.get("title", "").lower()
                content = chapter.get("content", "").lower()
                if any(
                    word in title or word in content for word in query_lower.split()
                ):
                    relevant_content.append(chapter)

        # If we found relevant content, use it
        if relevant_content:
            first_chapter = relevant_content[0]
            chapter_title = first_chapter.get("title", "Operation Guide")
            chapter_content = first_chapter.get("content", "")

            if context.language == Language.ENGLISH:
                return f"""📚 AIM 7510 OPERATION TUTORIAL

{chapter_title}
{'=' * len(chapter_title)}

{chapter_content[:1000]}{'...' if len(chapter_content) > 1000 else ''}

For complete details, refer to the AIM 7510 user manual."""

        # Fallback to structured tutorial if no specific content found
        if context.language == Language.ENGLISH:
            return """📚 AIM 7510 OPERATION TUTORIAL

MODULE 1: Machine Startup
==========================

Step 1: Power On
- Check main power supply (380V, 3-phase)
- Verify air pressure (6 bar minimum)
- Press main power button

Step 2: System Initialization
- Wait for CNC controller to boot
- Check for error messages on screen
- Verify all axes are at home position

Step 3: Tool Setup
- Load tools into magazine (12+1 capacity)
- Set tool offsets
- Verify tool cooling system

For detailed procedures, refer to the AIM 7510 user manual.
"""
        elif context.language == Language.TURKISH:
            return """📚 AIM 7510 İŞLETME EĞİTİMİ

MODÜL 1: Makine Başlatma
==========================

Adım 1: Güç Açma
- Ana güç kaynağını kontrol edin (380V, 3 fazlı)
- Hava basıncını doğrulayın (minimum 6 bar)
- Ana güç düğmesine basın

Adım 2: Sistem Başlatma
- CNC kontrolcüsünün açılmasını bekleyin
- Ekranda hata mesajlarını kontrol edin
- Tüm eksenlerin sıfır konumunda olduğunu doğrulayın

Adım 3: Takım Kurulumu
- Takımları dergiye yükleyin (12+1 kapasite)
- Takım ofsetlerini ayarlayın
- Takım soğutma sistemini doğrulayın

Detaylı prosedürler için AIM 7510 kullanım kılavuzuna bakın.
"""
        elif context.language == Language.RUSSIAN:
            return """📚 ОБУЧЕНИЕ ПО РАБОТЕ С AIM 7510

МОДУЛЬ 1: Запуск станка
==========================

Шаг 1: Включение питания
- Проверьте основное питание (380В, 3-фазное)
- Проверьте давление воздуха (минимум 6 бар)
- Нажмите кнопку основного питания

Шаг 2: Инициализация системы
- Дождитесь загрузки ЧПУ контроллера
- Проверьте наличие сообщений об ошибках на экране
- Убедитесь, что все оси находятся в исходном положении

Шаг 3: Настройка инструмента
- Загрузите инструменты в магазин (емкость 12+1)
- Установите смещения инструмента
- Проверьте систему охлаждения инструмента

Для подробных процедур см. руководство пользователя AIM 7510.
"""
        else:  # Arabic
            return """📚 دليل تشغيل AIM 7510

الوحدة 1: تشغيل الماكينة
==========================

الخطوة 1: تشغيل الطاقة
- تحقق من مصدر الطاقة الرئيسي (380 فولت، 3 مراحل)
- تحقق من ضغط الهواء (6 بار كحد أدنى)
- اضغط زر الطاقة الرئيسي

الخطوة 2: تهيئة النظام
- انتظر تحميل وحدة التحكم CNC
- تحقق من رسائل الخطأ على الشاشة
- تأكد من أن جميع المحاور في موضع الصفر

الخطوة 3: إعداد الأدوات
- قم بتحميل الأدوات في المجلة (سعة 12+1)
- اضبط إزاحة الأدوات
- تحقق من نظام تبريد الأدوات

للإجراءات التفصيلية، راجع دليل المستخدم AIM 7510.
"""

    def _generate_diagnosis(self, query: str, context: ChatContext) -> str:
        """Generate machine diagnosis"""
        # This would use knowledge graph to diagnose issues
        return (
            "Based on the symptoms described, I recommend checking "
            "the electrical connections and component status. "
            "Please refer to the wiring diagram for component locations."
        )

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
                return f"The AIM 7510 power rating is {power} kW. This is a 5-axis CNC machine with high precision capabilities."
            elif "speed" in query_lower or "rpm" in query_lower:
                speed = specs.get("spindle_speed_rpm", specs.get("max_speed", "N/A"))
                return f"The AIM 7510 spindle speed is up to {speed} RPM."
            elif "axis" in query_lower or "axes" in query_lower:
                return "The AIM 7510 is a 5-axis CNC machine, providing full 3D machining capabilities with X, Y, Z, A, and C axes."
            elif "capacity" in query_lower or "size" in query_lower:
                return f"Machine capacity: {specs.get('work_area', 'Check manual for dimensions')}"

        # Check manual data
        if hasattr(self, "manual_data") and self.manual_data:
            chapters = self.manual_data.get("chapters", [])
            for chapter in chapters:
                if any(
                    word in chapter.get("title", "").lower()
                    for word in query_lower.split()
                ):
                    return f"According to the AIM 7510 manual: {chapter.get('content', '')[:500]}..."

        # Default response
        return (
            "I can help you find information about AIM 7510 specifications, "
            "operations, and procedures. Could you be more specific about what you need?"
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
                "I can help you with AIM 7510 operations, diagnostics, maintenance, "
                "and G-code programming. Could you please rephrase your question "
                "or specify what you need? For example:\n"
                "- 'Teach me how to operate the machine'\n"
                "- 'What is the power rating?'\n"
                "- 'Help me diagnose a fault'\n"
                "- 'Show me spare parts'"
            )
