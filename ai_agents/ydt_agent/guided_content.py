"""Editorial learning outlines, separate from extracted machine specifications.

These outlines support operator review. They do not authorize a cycle or a repair.
Section references identify reading material, not a claim of verbatim translation.
"""
from copy import deepcopy


# Each entry is a screen: title, explanatory points, manual reading reference.
_DIAGNOSIS = {
    "en": [
        ("Record the symptom", ["Record the exact alarm text, when it appeared and the last operation. A symptom alone does not establish a cause.", "If an alarm code is displayed, send that code to YDT for its separate alarm-reference lookup."], "User manual · section 17: troubleshooting"),
        ("Observe without opening the machine", ["Read the controller messages and note whether the issue concerns startup, motion, tooling or the workpiece.", "Do not bypass guards, repeatedly reset an unexplained alarm, open an electrical cabinet or touch moving parts."], "User manual · section 10: machine safety"),
        ("Prepare the service handover", ["Give the technician the model, serial number, alarm text, symptom and last successful operation.", "Electrical checks and repairs belong to qualified personnel following the manufacturer's isolation procedure. This guide has not diagnosed the fault."], "User manual · sections 1.2 and 17: service and troubleshooting"),
    ],
    "ar": [
        ("سجّل العَرَض", ["سجّل نص الإنذار ووقت ظهوره وآخر عملية. العَرَض وحده لا يحدد السبب.", "إذا ظهر كود إنذار، أرسله إلى YDT للبحث عنه في مرجع الإنذارات."], "دليل المستخدم · القسم 17: استكشاف الأعطال"),
        ("راقب دون فتح الماكينة", ["اقرأ رسائل وحدة التحكم وحدد هل المشكلة عند التشغيل أم الحركة أم الأدوات أم الشغلة.", "لا تتجاوز وسائل الحماية أو تكرر إعادة ضبط إنذار غير مفهوم أو تفتح لوحة الكهرباء أو تلمس الأجزاء المتحركة."], "دليل المستخدم · القسم 10: سلامة الماكينة"),
        ("جهّز معلومات الصيانة", ["زوّد الفني بالموديل والرقم التسلسلي ونص الإنذار والعَرَض وآخر عملية ناجحة.", "الفحوصات الكهربائية والإصلاحات للفني المؤهل وفق إجراءات العزل لدى المصنّع. هذا الدليل لم يشخّص سبب العطل."], "دليل المستخدم · القسمان 1.2 و17: الخدمة والأعطال"),
    ],
    "tr": [
        ("Belirtiyi kaydedin", ["Tam alarm metnini, zamanı ve son işlemi kaydedin. Belirti tek başına nedeni belirlemez.", "Alarm kodu varsa ayrı alarm referansı için kodu YDT'ye gönderin."], "Kullanıcı el kitabı · bölüm 17: sorun giderme"),
        ("Makineyi açmadan gözlemleyin", ["Kontrol mesajlarını okuyun; sorunun başlatma, hareket, takım veya iş parçasıyla ilgili olduğunu kaydedin.", "Korumaları devre dışı bırakmayın, açıklanmayan alarmı tekrar tekrar sıfırlamayın, elektrik panosunu açmayın veya hareketli parçalara dokunmayın."], "Kullanıcı el kitabı · bölüm 10: makine güvenliği"),
        ("Servis bilgilerini hazırlayın", ["Teknisyene model, seri numarası, alarm metni, belirti ve son başarılı işlemi iletin.", "Elektrik kontrolleri ve onarımlar üreticinin izolasyon prosedürünü izleyen yetkili personele aittir. Bu rehber arıza teşhisi değildir."], "Kullanıcı el kitabı · bölümler 1.2 ve 17"),
    ],
    "ru": [
        ("Запишите симптом", ["Запишите точный текст сигнала, время и последнюю операцию. Симптом сам по себе не определяет причину.", "Если показан код сигнала, отправьте его YDT для отдельного поиска в справочнике."], "Руководство · раздел 17: неисправности"),
        ("Наблюдайте, не открывая станок", ["Прочитайте сообщения контроллера и отметьте, связан ли сбой с запуском, движением, инструментом или заготовкой.", "Не обходите защиту, не сбрасывайте многократно неизвестный сигнал, не открывайте электрошкаф и не касайтесь движущихся частей."], "Руководство · раздел 10: безопасность станка"),
        ("Подготовьте сведения для сервиса", ["Передайте технику модель, серийный номер, текст сигнала, симптом и последнюю успешную операцию.", "Электропроверки и ремонт выполняет квалифицированный персонал по процедуре изоляции производителя. Причина неисправности здесь не установлена."], "Руководство · разделы 1.2 и 17"),
    ],
}

_APPLICATIONS = {
    "en": [
        ("Profile machining", ["The packaged manual describes CNC machining of profiles. Check material, profile geometry and usable envelope against your installed machine.", "Use the machine reference and approved job drawing to decide whether a proposed part fits; this screen does not qualify a job."], "User manual · sections 3–5: description and features"),
        ("Tooling and programmed operations", ["The manual describes CNC motion, tool magazines and ISO G-code programming. Optional capabilities depend on installed equipment.", "Review the required tool, fixture, machining sequence and approved postprocessor with a qualified programmer."], "User manual · sections 4–7 and 13"),
        ("Place the machine in the production line", ["Profile machining is one stage of a window, door or facade job; assembly and other stages require their own equipment.", "Do not infer welding, corner cleaning or unrestricted material support from the AIM 7510 name. Confirm each process in the installed machine documentation."], "User manual · sections 3–5"),
    ],
    "ar": [
        ("تشغيل القطاعات", ["يصف الدليل المرفق تشغيل القطاعات باستخدام CNC. تحقّق من الخامة والهندسة ومجال العمل في ماكينة الورشة.", "قارن مرجع الماكينة بالرسم المعتمد لتقييم ملاءمة القطعة؛ هذه الشاشة لا تعتمد أمر تشغيل."], "دليل المستخدم · الأقسام 3–5: الوصف والخصائص"),
        ("الأدوات والعمليات المبرمجة", ["يصف الدليل حركة CNC ومخازن الأدوات وبرمجة ISO G-code. تعتمد الخيارات على التجهيزات المركبة.", "راجع الأداة والتثبيت وتسلسل التشغيل ومعالج الإخراج المعتمد مع مبرمج مؤهل."], "دليل المستخدم · الأقسام 4–7 و13"),
        ("موقع الماكينة في خط الإنتاج", ["تشغيل القطاعات مرحلة ضمن أعمال النوافذ والأبواب والواجهات؛ التجميع والمراحل الأخرى لها تجهيزاتها.", "لا تفترض دعم اللحام أو تنظيف الزوايا أو كل الخامات من اسم AIM 7510. أكّد كل عملية من وثائق الماكينة المركبة."], "دليل المستخدم · الأقسام 3–5"),
    ],
    "tr": [
        ("Profil işleme", ["Paketlenmiş kılavuz profillerin CNC ile işlenmesini açıklar. Malzeme, geometri ve çalışma alanını kurulu makineye göre kontrol edin.", "Parça uygunluğunu makine referansı ve onaylı çizimle değerlendirin; bu ekran bir işi onaylamaz."], "Kullanıcı el kitabı · bölümler 3–5"),
        ("Takımlar ve programlı işlemler", ["Kılavuz CNC hareketini, takım magazinlerini ve ISO G-code programlamasını açıklar. Opsiyonlar kurulu donanıma bağlıdır.", "Takım, fikstür, işlem sırası ve onaylı postprocessor konularını yetkili programcıyla inceleyin."], "Kullanıcı el kitabı · bölümler 4–7 ve 13"),
        ("Üretim hattındaki yeri", ["Profil işleme pencere, kapı veya cephe işinin bir aşamasıdır; montaj ve diğer aşamalar ayrı ekipman gerektirir.", "AIM 7510 adından kaynak, köşe temizleme veya sınırsız malzeme desteği çıkarmayın. Her işlemi kurulu makine belgeleriyle doğrulayın."], "Kullanıcı el kitabı · bölümler 3–5"),
    ],
    "ru": [
        ("Обработка профилей", ["Руководство описывает обработку профилей на ЧПУ. Проверьте материал, геометрию и рабочую зону установленного станка.", "Оцените соответствие детали по справочнику и утверждённому чертежу; этот экран не утверждает задание."], "Руководство · разделы 3–5"),
        ("Инструменты и программы", ["Руководство описывает движение ЧПУ, магазины инструментов и ISO G-code. Опции зависят от установленного оборудования.", "Проверьте инструмент, оснастку, порядок обработки и утверждённый постпроцессор с квалифицированным программистом."], "Руководство · разделы 4–7 и 13"),
        ("Место в производственной линии", ["Обработка профиля — один из этапов изготовления окон, дверей или фасадов; сборка и другие этапы требуют отдельного оборудования.", "Название AIM 7510 не подтверждает сварку, зачистку углов или работу с любым материалом. Проверьте каждый процесс по документации станка."], "Руководство · разделы 3–5"),
    ],
}

_TITLES = {
    "en": ("Operation learning path", "Fault review", "Applications explorer", "Learning outline · verify procedures against the installed machine manual. Reviewing screens does not authorize machine operation or repair."),
    "ar": ("مسار تعلّم التشغيل", "مراجعة العطل", "استكشاف التطبيقات", "مخطط تعلّم · راجع الإجراءات في دليل الماكينة المركبة. مراجعة الشاشات لا تمنح تصريح تشغيل أو إصلاح."),
    "tr": ("Kullanım öğrenme yolu", "Arıza incelemesi", "Uygulama gezgini", "Öğrenme taslağı · prosedürleri kurulu makinenin kılavuzuyla doğrulayın. Ekranları incelemek çalıştırma veya onarım yetkisi vermez."),
    "ru": ("Обучение работе", "Разбор неисправности", "Обзор применений", "Учебный план · сверяйте процедуры с руководством установленного станка. Просмотр экранов не разрешает работу или ремонт."),
}

# Replace machine-specific assumptions in the unfinished tutorial with reading tasks.
_OPERATION_REVIEW = {
    "en": [
        ["Follow the site's PPE procedure. Handle sharp tools only when the machine is isolated and stationary.", "Keep loose clothing and jewellery away from moving parts."],
        ["Keep the work area clear. Review guard and emergency-stop checks with an authorized trainer.", "Do not operate with damaged guards or bypassed protective devices."],
        ["Confirm supply requirements on the installed machine's nameplate and manual; this lesson does not prescribe voltage or pressure.", "Follow the approved startup procedure with an authorized operator."],
        ["Review controller messages and the reference-return procedure in section 11.", "Keep personnel clear of the motion area; do not infer homing commands from this outline."],
        ["Review the installed tooling arrangement and job tooling list.", "Section 10 requires power isolation before changing cutting tools; use qualified personnel and the approved isolation procedure."],
        ["Have the programmer verify tool data, fixtures and offsets for the job.", "Do not assume a work-offset code or tool capacity from this lesson."],
        ["Verify the program revision, job drawing and controller compatibility before loading.", "Review program selection and transfer in section 11 with your trainer."],
        ["Section 11 describes controlled first-run checks. Review these with the authorized operator before any cycle.", "Record the first-part inspection against the drawing before releasing a batch."],
    ],
    "ar": [
        ["اتبع إجراءات الوقاية في الورشة. تعامل مع الأدوات الحادة فقط بعد عزل الماكينة وتوقفها.", "أبعد الملابس الفضفاضة والمجوهرات عن الأجزاء المتحركة."],
        ["حافظ على خلو منطقة العمل. راجع فحص الحواجز والتوقف الطارئ مع مدرّب مخوّل.", "لا تشغّل الماكينة بحواجز تالفة أو وسائل حماية معطلة."],
        ["تحقق من متطلبات التغذية على لوحة الماكينة ودليلها؛ هذا الدرس لا يحدد جهداً أو ضغطاً.", "اتبع إجراءات بدء التشغيل المعتمدة مع مشغّل مخوّل."],
        ["راجع رسائل التحكم وإجراء العودة للمرجع في القسم 11.", "أبعد الأفراد عن منطقة الحركة؛ لا تستنتج أوامر العودة للمرجع من هذا المخطط."],
        ["راجع ترتيب الأدوات المركبة وقائمة أدوات أمر التشغيل.", "يشترط القسم 10 عزل الكهرباء قبل تغيير أدوات القطع؛ اتبع إجراء العزل المعتمد بواسطة شخص مؤهل."],
        ["يجب أن يتحقق المبرمج من بيانات الأدوات والتثبيت والإزاحات.", "لا تفترض كود إزاحة أو سعة أدوات من هذا الدرس."],
        ["تحقق من إصدار البرنامج والرسم وتوافق وحدة التحكم قبل التحميل.", "راجع اختيار البرنامج ونقله في القسم 11 مع المدرّب."],
        ["يصف القسم 11 فحوصات التشغيل الأول المتحكم فيه. راجعها مع المشغّل المخوّل قبل أي دورة.", "سجّل فحص أول قطعة وفق الرسم قبل اعتماد الدفعة."],
    ],
    "tr": [
        ["İşyerinin KKD prosedürünü izleyin. Keskin takımlara yalnızca makine izole ve dururken dokunun.", "Bol giysi ve takıları hareketli parçalardan uzak tutun."],
        ["Çalışma alanını boş tutun. Koruma ve acil durdurma kontrollerini yetkili eğitmenle inceleyin.", "Hasarlı veya devre dışı korumalarla çalıştırmayın."],
        ["Besleme gereksinimlerini kurulu makinenin etiketinden ve kılavuzundan doğrulayın; ders voltaj veya basınç belirlemez.", "Onaylı başlatma prosedürünü yetkili operatörle izleyin."],
        ["Kontrol mesajlarını ve bölüm 11'deki referans dönüş prosedürünü inceleyin.", "Personeli hareket alanından uzak tutun; bu taslaktan komut çıkarmayın."],
        ["Kurulu takım düzenini ve işin takım listesini inceleyin.", "Bölüm 10, kesici takım değişiminden önce güç izolasyonu ister; yetkili personel ve onaylı prosedürü kullanın."],
        ["Programcı takım verilerini, fikstürleri ve ofsetleri doğrulasın.", "Bu dersten ofset kodu veya takım kapasitesi varsaymayın."],
        ["Yüklemeden önce program revizyonunu, çizimi ve kontrolcü uyumunu doğrulayın.", "Bölüm 11'deki program seçimi ve transferini eğitmenle inceleyin."],
        ["Bölüm 11 kontrollü ilk çalıştırma kontrollerini açıklar. Her çevrimden önce yetkili operatörle inceleyin.", "Seriyi serbest bırakmadan önce ilk parça kontrolünü çizime göre kaydedin."],
    ],
    "ru": [
        ["Соблюдайте правила СИЗ предприятия. Работайте с острыми инструментами только после изоляции и остановки станка.", "Держите одежду и украшения вдали от движущихся частей."],
        ["Освободите рабочую зону. Изучите проверки ограждений и аварийного останова с уполномоченным инструктором.", "Не работайте с повреждённой или отключённой защитой."],
        ["Проверьте питание по табличке и руководству установленного станка; урок не задаёт напряжение или давление.", "Следуйте утверждённой процедуре запуска с уполномоченным оператором."],
        ["Изучите сообщения контроллера и возврат к опорной точке в разделе 11.", "Удалите людей из зоны движения; не выводите команды из этого плана."],
        ["Проверьте установленный инструмент и список инструмента задания.", "Раздел 10 требует изоляции питания перед заменой режущих инструментов; нужен квалифицированный персонал и утверждённая процедура."],
        ["Программист должен проверить данные инструмента, оснастку и смещения.", "Не предполагайте код смещения или ёмкость магазина по этому уроку."],
        ["Проверьте версию программы, чертёж и совместимость контроллера перед загрузкой.", "Изучите выбор и перенос программы в разделе 11 с инструктором."],
        ["Раздел 11 описывает контролируемый первый запуск. Изучите его с уполномоченным оператором до цикла.", "Запишите проверку первой детали по чертежу до выпуска партии."],
    ],
}


def build_guide(kind, language, operation_tutorial=None, symptom=None):
    language = language if language in _TITLES else "en"
    title_index = {"operation": 0, "diagnosis": 1, "applications": 2}[kind]
    if kind == "operation":
        modules = deepcopy(operation_tutorial[language]["modules"])
        index = 0
        for module in modules:
            for step in module["steps"]:
                step["points"] = _OPERATION_REVIEW[language][index]
                step["reference"] = "AIM 7510 · sections 2, 10–11" if index < 4 else "AIM 7510 · sections 10–11, 13"
                index += 1
    else:
        screens = (_DIAGNOSIS if kind == "diagnosis" else _APPLICATIONS)[language]
        modules = [{"title": title, "steps": [{"title": title, "points": points, "reference": reference}]} for title, points, reference in screens]
    return {"version": 1, "kind": kind, "language": language, "title": _TITLES[language][title_index],
            "notice": _TITLES[language][3], "symptom": symptom if kind == "diagnosis" else None,
            "modules": modules}


def guide_as_text(guide):
    """Readable fallback for clients that do not support the structured guide."""
    lines = [guide["title"], guide["notice"]]
    if guide.get("symptom"):
        lines.append(guide["symptom"])
    for mi, module in enumerate(guide["modules"], 1):
        lines.append(f"MODULE {mi}: {module['title']}")
        for si, step in enumerate(module["steps"], 1):
            lines.append(f"Step {si}: {step['title']}")
            lines.extend(f"- {point}" for point in step["points"])
            lines.append(step["reference"])
    return "\n".join(lines)
