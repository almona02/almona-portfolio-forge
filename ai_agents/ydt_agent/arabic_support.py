"""
Arabic Language Support for YDT Agent
Provides Arabic technical terms and translation utilities
"""

ARABIC_TECHNICAL_TERMS = {
    # Machine components
    "machine": "آلة",
    "spindle": "المغزل",
    "motor": "المحرك",
    "relay": "الريليه",
    "contactor": "الكونتاكتور",
    "sensor": "المستشعر",
    "tool": "الأداة",
    "clamp": "المشبك",
    
    # Operations
    "operation": "عملية",
    "cutting": "قطع",
    "drilling": "حفر",
    "milling": "طحن",
    "tapping": "اللولبة",
    "grooving": "التجليخ",
    "engraving": "النقش",
    
    # G-code
    "G-code": "كود G",
    "M-code": "كود M",
    "program": "البرنامج",
    "command": "الأمر",
    "tool change": "تغيير الأداة",
    "feed rate": "سرعة التغذية",
    "spindle speed": "سرعة المغزل",
    
    # Machine states
    "startup": "التشغيل",
    "shutdown": "الإيقاف",
    "error": "خطأ",
    "alarm": "إنذار",
    "maintenance": "الصيانة",
    
    # Applications
    "window": "نافذة",
    "door": "باب",
    "curtain wall": "جدار ستاري",
    "facade": "واجهة",
    "profile": "الملف",
    "aluminum": "الألمنيوم",
    
    # Instructions
    "step": "الخطوة",
    "procedure": "الإجراء",
    "instruction": "التعليمات",
    "check": "تحقق",
    "verify": "التحقق",
    "test": "اختبار",
    
    # Common phrases
    "how to": "كيفية",
    "what is": "ما هو",
    "where is": "أين هو",
    "explain": "اشرح",
    "teach me": "علمني",
    "help": "مساعدة"
}

ARABIC_RESPONSE_TEMPLATES = {
    "welcome": "مرحباً! أنا مساعد YDT الذكي لآلة AIM 7510.\n\nيمكنني مساعدتك في:\n• تشغيل الآلة\n• تشخيص المشاكل\n• تعلم G-code\n• تحديد المكونات\n\nكيف يمكنني مساعدتك اليوم؟",
    
    "teaching_start": "ممتاز! سأعلمك كيفية {topic}:\n\n",
    
    "step_format": "الخطوة {number}: {description}\n├── {substep1}\n├── {substep2}\n└── {substep3}\n",
    
    "diagnosis_start": "🔍 التشخيص: {issue}\n\n",
    
    "location_format": "📍 موقع {component}:\n\nالموقع المادي:\n├── اللوحة: {panel}\n├── الصف: {row}\n└── الموضع: {position}\n",
    
    "gcode_explanation": "شرح كود G:\n\n{command}: {description}\nالاستخدام: {usage}\nالمثال: {example}\n",
    
    "capabilities": "قدرات آلة AIM 7510:\n✅ العمليات: {operations}\n✅ التطبيقات: {applications}\n✅ المواد: {materials}\n"
}


def translate_term(english_term: str) -> str:
    """Translate English technical term to Arabic"""
    return ARABIC_TECHNICAL_TERMS.get(english_term.lower(), english_term)


def format_arabic_response(template: str, **kwargs) -> str:
    """Format Arabic response using template"""
    return template.format(**kwargs)


def detect_arabic(text: str) -> bool:
    """Detect if text contains Arabic characters"""
    arabic_chars = set('ابتثجحخدذرزسشصضطظعغفقكلمنهوي')
    return any(char in arabic_chars for char in text)


def create_arabic_operation_guide(steps: list) -> str:
    """Create Arabic operation guide"""
    guide = "📚 دليل تشغيل AIM 7510\n\n"
    
    for i, step in enumerate(steps, 1):
        guide += f"الخطوة {i}: {step['title']}\n"
        if 'substeps' in step:
            for j, substep in enumerate(step['substeps'], 1):
                guide += f"  {j}. {substep}\n"
        guide += "\n"
    
    guide += "هل تريد المتابعة؟ قل 'التالي'"
    return guide


def create_arabic_diagnosis(issue: str, causes: list, solutions: list) -> str:
    """Create Arabic diagnosis response"""
    response = f"🔍 التشخيص: {issue}\n\n"
    
    response += "الأسباب المحتملة:\n"
    for i, cause in enumerate(causes, 1):
        response += f"{i}. {cause['description']} ({cause['probability']}%)\n"
        if 'test' in cause:
            response += f"   الاختبار: {cause['test']}\n"
        if 'fix' in cause:
            response += f"   الحل: {cause['fix']}\n"
        response += "\n"
    
    response += "الإجراء الفوري:\n"
    for i, solution in enumerate(solutions, 1):
        response += f"{i}. {solution}\n"
    
    return response

