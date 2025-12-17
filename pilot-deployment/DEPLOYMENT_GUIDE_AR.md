# تعليمات النشر - منصة ألمونا الصناعية

## المتطلبات الأساسية:
- Docker و Docker Compose مثبتان
- اتصال إنترنت (لتنزيل الصور، حجمها 3.26 جيجابايت)
- 4 جيجابايت ذاكرة RAM كحد أدنى
- 10 جيجابايت مساحة قرص فارغة

## خطوات النشر:

### 1. نسخ ملفات النشر:
```bash
# على جهازك المحلي
scp -r pilot-deployment/ user@workshop-ip:/opt/almona/

# الاتصال بورشة العمل
ssh user@workshop-ip
cd /opt/almona/pilot-deployment
```

### 2. سحب الصور (15 دقيقة تقريباً):
```bash
docker pull almona-backend:pilot
docker pull almona-frontend:pilot
```

**ملاحظة:** حجم الصور الإجمالي 3.26 جيجابايت. على الإنترنت المصري، سيستغرق التنزيل حوالي 15 دقيقة.

### 3. التشغيل:
```bash
docker-compose up -d
```

### 4. التحقق من الخدمات:
```bash
# تحقق من حالة الخدمات
docker-compose ps

# تحقق من صحة الخدمة الخلفية
curl http://localhost:8002/health

# فتح المتصفح:
# http://workshop-ip/
```

### 5. عرض السجلات (في حالة وجود مشاكل):
```bash
docker-compose logs backend
docker-compose logs frontend
```

## دعم اللغة العربية:
- ✅ تم ضبط اللغة: العربية/مصر (ar_EG.UTF-8)
- ✅ واجهة المستخدم: العربية كاملة (من اليمين لليسار)
- ✅ رسائل الخطأ: بالعربية

## الاتصال بالدعم:
- **Mohamed Hassan:** +20 100 000 0000
- **البريد:** support@almona.com
- **ساعات العمل:** 9 صباحاً - 5 مساءً (بتوقيت القاهرة)

## استكشاف الأخطاء:

### المشكلة: الخدمة الخلفية لا تعمل
```bash
docker-compose logs backend
docker-compose restart backend
```

### المشكلة: الواجهة الأمامية لا تعمل
```bash
docker-compose logs frontend
docker-compose restart frontend
```

### المشكلة: مشاكل في الاتصال
```bash
# تحقق من الشبكة
docker network ls
docker network inspect pilot-deployment_almona-network
```

## التحديثات المستقبلية:
```bash
# سحب الصور المحدثة
docker pull almona-backend:pilot
docker pull almona-frontend:pilot

# إعادة التشغيل
docker-compose down
docker-compose up -d
```

## معلومات النظام:
- **حجم الصور:** 3.26 جيجابايت
- **وقت التنزيل:** ~15 دقيقة (على الإنترنت المصري)
- **الذاكرة المطلوبة:** 4 جيجابايت RAM
- **المساحة المطلوبة:** 10 جيجابايت قرص
