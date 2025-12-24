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

        logger.info(
            f"[YDT CHATBOT] Knowledge loaded: "
            f"{len(self.manual_data.get('chapters', []))} chapters, "
            f"{len(self.wiring_data.get('components', []))} components, "
            f"{len(self.parts_data.get('parts', []))} parts"
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

    def _general_response(
        self, query: str, intent: str, context: ChatContext
    ) -> ChatResponse:
        """General response handler"""
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
        """Generate step-by-step tutorial"""
        # This would use RAG to find relevant manual chapters
        # For now, return structured tutorial format

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
        return (
            "Information lookup would query the YDT knowledge graph "
            "for relevant specifications and procedures."
        )

    def _lookup_spare_part(self, query: str, context: ChatContext) -> str:
        """Lookup spare part information"""
        return (
            "Spare part information would be retrieved from the parts "
            "catalog knowledge base."
        )

    def _generate_default_response(self, query: str, context: ChatContext) -> str:
        """Generate default response when intent is unclear"""
        return (
            "I'm here to help with AIM 7510 operations, diagnostics, "
            "and learning. Could you please rephrase your question or "
            "specify what you need?"
        )
