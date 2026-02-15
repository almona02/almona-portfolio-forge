import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Arabic translations
const translations: Record<string, Record<Language, string>> = {
  // Services Page
  'services.title': {
    en: 'Services',
    ar: 'الخدمات'
  },
  'services.subtitle': {
    en: 'Comprehensive industrial solutions for your business',
    ar: 'حلول صناعية شاملة لعملك'
  },
  'services.ai_powered_maintenance': {
    en: 'AI-POWERED PREDICTIVE MAINTENANCE',
    ar: 'الصيانة التنبؤية المدعومة بالذكاء الاصطناعي'
  },
  'services.basic_care': {
    en: 'Basic Care',
    ar: 'الرعاية الأساسية'
  },
  'services.premium_support': {
    en: 'Premium Support',
    ar: 'الدعم المتميز'
  },
  'services.enterprise_solutions': {
    en: 'Enterprise Solutions',
    ar: 'حلول المؤسسات'
  },
  'services.create_ticket': {
    en: 'Create Support Ticket',
    ar: 'إنشاء تذكرة دعم'
  },
  'services.emergency_service': {
    en: 'Emergency Service',
    ar: 'خدمة الطوارئ'
  },
  'services.machine_registration': {
    en: 'Machine Registration',
    ar: 'تسجيل الماكينة'
  },
  'services.maintenance_dashboard': {
    en: 'Maintenance Dashboard',
    ar: 'لوحة الصيانة'
  },
  'services.predictive_maintenance': {
    en: 'Predictive Maintenance',
    ar: 'الصيانة التنبؤية'
  },
  'services.ai_advisor': {
    en: 'AI Advisor',
    ar: 'المستشار الذكي'
  },
  'services.training': {
    en: 'Training',
    ar: 'التدريب'
  },
  'services.spare_parts': {
    en: 'Spare Parts',
    ar: 'قطع الغيار'
  },
  'services.consulting': {
    en: 'Consulting',
    ar: 'الاستشارات'
  },
  'services.sales': {
    en: 'Sales',
    ar: 'المبيعات'
  },
  'services.maintenance_centers': {
    en: 'Maintenance Centers',
    ar: 'مراكز الصيانة'
  },
  
  // Ticket Wizard
  'ticket.create_support_ticket': {
    en: 'Create Support Ticket',
    ar: 'إنشاء تذكرة دعم'
  },
  'ticket.wizard_description': {
    en: 'Fill out the form below to create a support ticket. Our team will respond as soon as possible.',
    ar: 'املأ النموذج أدناه لإنشاء تذكرة دعم. سيرد فريقنا في أقرب وقت ممكن.'
  },
  
  // Ticket Wizard Steps
  'ticket.category_priority': {
    en: 'Category & Priority',
    ar: 'الفئة والأولوية'
  },
  'ticket.details': {
    en: 'Details',
    ar: 'التفاصيل'
  },
  'ticket.attachments': {
    en: 'Attachments',
    ar: 'المرفقات'
  },
  'ticket.contact_context': {
    en: 'Contact & Context',
    ar: 'جهة الاتصال والسياق'
  },
  'ticket.preview': {
    en: 'Preview',
    ar: 'معاينة'
  },
  'ticket.success': {
    en: 'Success',
    ar: 'نجح'
  },
  
  // Ticket Types
  'ticket.general_inquiry': {
    en: 'General Inquiry',
    ar: 'استفسار عام'
  },
  'ticket.general_inquiry_desc': {
    en: 'General questions or information requests',
    ar: 'أسئلة عامة أو طلبات معلومات'
  },
  'ticket.technical_support': {
    en: 'Technical Support',
    ar: 'الدعم التقني'
  },
  'ticket.technical_support_desc': {
    en: 'Issues with equipment or software',
    ar: 'مشاكل في المعدات أو البرمجيات'
  },
  'ticket.installation': {
    en: 'Installation',
    ar: 'التثبيت'
  },
  'ticket.installation_desc': {
    en: 'Help with installing or configuring equipment',
    ar: 'مساعدة في تثبيت أو تكوين المعدات'
  },
  'ticket.maintenance': {
    en: 'Maintenance',
    ar: 'الصيانة'
  },
  'ticket.maintenance_desc': {
    en: 'Scheduled or emergency maintenance',
    ar: 'صيانة مجدولة أو طارئة'
  },
  'ticket.spare_parts': {
    en: 'Spare Parts',
    ar: 'قطع الغيار'
  },
  'ticket.spare_parts_desc': {
    en: 'Requests for replacement parts',
    ar: 'طلبات قطع الغيار'
  },
  'ticket.warranty': {
    en: 'Warranty',
    ar: 'الضمان'
  },
  'ticket.warranty_desc': {
    en: 'Warranty coverage or claims',
    ar: 'تغطية الضمان أو المطالبات'
  },
  'ticket.billing': {
    en: 'Billing',
    ar: 'الفوترة'
  },
  'ticket.billing_desc': {
    en: 'Invoice or payment questions',
    ar: 'أسئلة الفاتورة أو الدفع'
  },
  'ticket.sales': {
    en: 'Sales',
    ar: 'المبيعات'
  },
  'ticket.sales_desc': {
    en: 'Product / quote inquiries',
    ar: 'استفسارات المنتج / العروض'
  },
  'ticket.complaint': {
    en: 'Complaint',
    ar: 'شكوى'
  },
  'ticket.complaint_desc': {
    en: 'Service or product complaint',
    ar: 'شكوى خدمة أو منتج'
  },
  'ticket.other': {
    en: 'Other',
    ar: 'أخرى'
  },
  'ticket.other_desc': {
    en: 'Not covered by other categories',
    ar: 'غير مغطى بالفئات الأخرى'
  },
  
  // Ticket Priorities
  'ticket.low': {
    en: 'Low',
    ar: 'منخفض'
  },
  'ticket.low_desc': {
    en: 'Can wait several days',
    ar: 'يمكن الانتظار عدة أيام'
  },
  'ticket.medium': {
    en: 'Medium',
    ar: 'متوسط'
  },
  'ticket.medium_desc': {
    en: 'Normal response',
    ar: 'استجابة عادية'
  },
  'ticket.high': {
    en: 'High',
    ar: 'عالي'
  },
  'ticket.high_desc': {
    en: 'Needs attention soon',
    ar: 'يحتاج انتباه قريباً'
  },
  'ticket.urgent': {
    en: 'Urgent',
    ar: 'عاجل'
  },
  'ticket.urgent_desc': {
    en: 'Immediate attention',
    ar: 'انتباه فوري'
  },
  'ticket.critical': {
    en: 'Critical',
    ar: 'حرج'
  },
  'ticket.critical_desc': {
    en: 'Production stopped',
    ar: 'توقف الإنتاج'
  },
  
  // Ticket Form Fields
  'ticket.title': {
    en: 'Title',
    ar: 'العنوان'
  },
  'ticket.description': {
    en: 'Description',
    ar: 'الوصف'
  },
  'ticket.rich_editor': {
    en: 'Rich Editor',
    ar: 'محرر النصوص الغني'
  },
  'ticket.plain_markdown': {
    en: 'Plain Markdown',
    ar: 'ماركداون عادي'
  },
  'ticket.edit': {
    en: 'Edit',
    ar: 'تحرير'
  },
  'ticket.attachments_optional': {
    en: 'Attachments (Optional)',
    ar: 'المرفقات (اختياري)'
  },
  'ticket.add_reference_files': {
    en: 'Add reference images or logs. Files upload automatically (2 at a time). You can continue filling the form.',
    ar: 'أضف صور مرجعية أو سجلات. يتم رفع الملفات تلقائياً (2 في المرة). يمكنك متابعة ملء النموذج.'
  },
  'ticket.no_file_chosen': {
    en: 'No file chosen',
    ar: 'لم يتم اختيار ملف'
  },
  'ticket.continue': {
    en: 'Continue',
    ar: 'متابعة'
  },
  'ticket.back': {
    en: 'Back',
    ar: 'رجوع'
  },
  'ticket.next': {
    en: 'Next',
    ar: 'التالي'
  },
  'ticket.reset_draft': {
    en: 'Reset Draft',
    ar: 'إعادة تعيين المسودة'
  },
  'ticket.step_of': {
    en: 'Step {current} of {total}',
    ar: 'الخطوة {current} من {total}'
  },
  'ticket.retry': {
    en: 'Retry',
    ar: 'إعادة المحاولة'
  },
  'ticket.remove': {
    en: 'Remove',
    ar: 'إزالة'
  },
  'ticket.preview_title': {
    en: 'Preview',
    ar: 'معاينة'
  },
  'ticket.preview_title_label': {
    en: 'Title:',
    ar: 'العنوان:'
  },
  'ticket.preview_description_label': {
    en: 'Description:',
    ar: 'الوصف:'
  },
  'ticket.preview_attachments_label': {
    en: 'Attachments:',
    ar: 'المرفقات:'
  },
  'ticket.uploaded': {
    en: 'uploaded',
    ar: 'تم الرفع'
  },
  'ticket.describe_issue_placeholder': {
    en: 'Describe the issue, steps to reproduce...',
    ar: 'اوصف المشكلة، خطوات إعادة الإنتاج...'
  },
  'ticket.preview_error': {
    en: 'Preview error',
    ar: 'خطأ في المعاينة'
  },
  'ticket.created': {
    en: 'Ticket Created',
    ar: 'تم إنشاء التذكرة'
  },
  'ticket.created_message': {
    en: 'Your support ticket has been created successfully. Our team will respond as soon as possible.',
    ar: 'تم إنشاء تذكرة الدعم بنجاح. سيرد فريقنا في أقرب وقت ممكن.'
  },
  'ticket.digital_twin_code': {
    en: 'Digital Twin Code',
    ar: 'رمز التوأم الرقمي'
  },
  'ticket.copy_code': {
    en: 'Copy Code',
    ar: 'نسخ الرمز'
  },
  'ticket.close': {
    en: 'Close',
    ar: 'إغلاق'
  },
  'ticket.view_ticket': {
    en: 'View Ticket',
    ar: 'عرض التذكرة'
  },
  'ticket.create_another': {
    en: 'Create Another',
    ar: 'إنشاء أخرى'
  },
  'ticket.ticket_type': {
    en: 'Ticket Type',
    ar: 'نوع التذكرة'
  },
  'ticket.priority': {
    en: 'Priority',
    ar: 'الأولوية'
  },
  'ticket.contact_phone': {
    en: 'Contact Phone',
    ar: 'رقم الهاتف'
  },
  'ticket.contact_email': {
    en: 'Contact Email',
    ar: 'البريد الإلكتروني'
  },
  'ticket.preferred_contact_method': {
    en: 'Preferred Contact Method',
    ar: 'طريقة الاتصال المفضلة'
  },
  'ticket.site_location': {
    en: 'Site Location',
    ar: 'موقع الموقع'
  },
  'ticket.machine_serial_number': {
    en: 'Machine Serial Number',
    ar: 'رقم تسلسل الماكينة'
  },
  
  // Portal Page
  'portal.welcome_back': {
    en: 'Welcome back',
    ar: 'مرحباً بعودتك'
  },
  'portal.manage_description': {
    en: 'Manage your machines, support tickets, and account details',
    ar: 'إدارة ماكيناتك وتذاكر الدعم وتفاصيل الحساب'
  },
  'portal.health_dashboard': {
    en: 'Health Dashboard',
    ar: 'لوحة الصحة'
  },
  'portal.my_machines': {
    en: 'My Machines',
    ar: 'ماكيناتي'
  },
  'portal.support_tickets': {
    en: 'Support Tickets',
    ar: 'تذاكر الدعم'
  },
  'portal.my_quotes': {
    en: 'My Quotes',
    ar: 'عروض الأسعار'
  },
  'portal.no_quotes_found': {
    en: 'No quote requests yet',
    ar: 'لا توجد طلبات عروض أسعار'
  },
  'portal.quote_requests_description': {
    en: 'Your quote requests and pricing inquiries',
    ar: 'طلبات عروض الأسعار واستفسارات التسعير'
  },
  'portal.print_po': {
    en: 'Print / PDF',
    ar: 'طباعة / PDF'
  },
  'portal.documents': {
    en: 'Documents',
    ar: 'المستندات'
  },
  'portal.machine_health_dashboard': {
    en: 'Machine Health Dashboard',
    ar: 'لوحة مراقبة صحة الماكينات'
  },
  'portal.health_monitoring_coming_soon': {
    en: 'Machine health monitoring coming soon...',
    ar: 'مراقبة صحة الماكينات قريباً...'
  },
  'portal.search_machines': {
    en: 'Search machines...',
    ar: 'البحث في الماكينات...'
  },
  'portal.register_new_machine': {
    en: 'Register New Machine',
    ar: 'تسجيل ماكينة جديدة'
  },
  'portal.register_machine': {
    en: 'Register Machine',
    ar: 'تسجيل الماكينة'
  },
  'portal.serial_number': {
    en: 'Serial Number',
    ar: 'الرقم التسلسلي'
  },
  'portal.installation': {
    en: 'Installation',
    ar: 'التثبيت'
  },
  'portal.status': {
    en: 'Status',
    ar: 'الحالة'
  },
  'portal.no_machines_registered': {
    en: 'No machines registered yet',
    ar: 'لم يتم تسجيل أي ماكينات بعد'
  },
  'portal.register_first_machine': {
    en: 'Register your first machine to get started',
    ar: 'سجل أول ماكينة لك للبدء'
  },
  'portal.search_tickets': {
    en: 'Search tickets...',
    ar: 'البحث في التذاكر...'
  },
  'portal.create_new_ticket': {
    en: 'Create New Ticket',
    ar: 'إنشاء تذكرة جديدة'
  },
  'portal.find_your_quotes': {
    en: 'Find Your Quotes',
    ar: 'ابحث عن عروض الأسعار'
  },
  'portal.quote_search_description': {
    en: 'Search by quote number, digital twin code (e.g. DTC-2025-ABCD1234), or your portal reference.',
    ar: 'ابحث برقم عرض السعر أو رمز التوأم الرقمي (مثل DTC-2025-ABCD1234) أو مرجع البوابة الخاص بك.'
  },
  'portal.no_tickets_found': {
    en: 'No support tickets found',
    ar: 'لم يتم العثور على تذاكر دعم'
  },
  'portal.create_first_ticket': {
    en: 'Create your first support ticket to get help',
    ar: 'أنشئ أول تذكرة دعم للحصول على المساعدة'
  },
  'portal.search_documents': {
    en: 'Search documents...',
    ar: 'البحث في المستندات...'
  },
  'portal.uploaded': {
    en: 'Uploaded',
    ar: 'تم الرفع'
  },
  'portal.download': {
    en: 'Download',
    ar: 'تحميل'
  },
  'portal.no_documents_available': {
    en: 'No documents available',
    ar: 'لا توجد مستندات متاحة'
  },
  'portal.documents_description': {
    en: 'Your manuals, warranties, and other documents will appear here',
    ar: 'ستظهر دليلك وضماناتك والمستندات الأخرى هنا'
  },
  'portal.registered_machines': {
    en: 'Registered Machines',
    ar: 'الماكينات المسجلة'
  },
  'portal.active_tickets': {
    en: 'Active Tickets',
    ar: 'التذاكر النشطة'
  },
  'portal.total_documents': {
    en: 'Total Documents',
    ar: 'إجمالي المستندات'
  },
  'portal.view_all': {
    en: 'View All',
    ar: 'عرض الكل'
  },
  'portal.quick_actions': {
    en: 'Quick Actions',
    ar: 'إجراءات سريعة'
  },
  'portal.create_ticket': {
    en: 'Create Ticket',
    ar: 'إنشاء تذكرة'
  },
  'portal.register_machine_quick': {
    en: 'Register Machine',
    ar: 'تسجيل ماكينة'
  },
  'portal.view_quotes': {
    en: 'View Quotes',
    ar: 'عرض العروض'
  },
  'portal.contact_support': {
    en: 'Contact Support',
    ar: 'اتصل بالدعم'
  },
  
  // Services Page - Enhanced Industrial Terminology
  'services.subtitle_enhanced': {
    en: 'Machine learning-driven predictive maintenance, real-time equipment monitoring, and intelligent lifecycle management for aluminum window and door manufacturing systems.',
    ar: 'صيانة تنبؤية مدفوعة بالذكاء الاصطناعي، ومراقبة المعدات في الوقت الفعلي، وإدارة دورة الحياة الذكية لأنظمة تصنيع نوافذ وأبواب الألمنيوم.'
  },
  'services.live_data_active': {
    en: 'Live Data Active',
    ar: 'البيانات المباشرة نشطة'
  },
  'services.enable_live_data': {
    en: 'Enable Live Data',
    ar: 'تفعيل البيانات المباشرة'
  },
  'services.customer_portal': {
    en: 'Customer Portal',
    ar: 'بوابة العملاء'
  },
  'services.ai_support': {
    en: 'AI Support',
    ar: 'دعم الذكاء الاصطناعي'
  },
  'services.active_alerts': {
    en: 'Active Alerts',
    ar: 'التنبيهات النشطة'
  },
  'services.critical': {
    en: 'critical',
    ar: 'حرج'
  },
  'services.healthy_machines': {
    en: 'Healthy Machines',
    ar: 'الماكينات السليمة'
  },
  'services.optimal_performance': {
    en: 'Optimal performance',
    ar: 'أداء مثالي'
  },
  'services.predictive_accuracy': {
    en: 'Predictive Accuracy',
    ar: 'دقة التنبؤ'
  },
  'services.ml_model_confidence': {
    en: 'ML model confidence',
    ar: 'ثقة نموذج التعلم الآلي'
  },
  'services.cost_savings': {
    en: 'Cost Savings',
    ar: 'توفير التكاليف'
  },
  'services.reduced_downtime': {
    en: 'Reduced downtime',
    ar: 'تقليل وقت التوقف'
  },
  'services.ai_overview': {
    en: 'AI Overview',
    ar: 'نظرة عامة على الذكاء الاصطناعي'
  },
  'services.predictive_engine': {
    en: 'Predictive Engine',
    ar: 'محرك التنبؤ'
  },
  'services.register_machine': {
    en: 'Register Machine',
    ar: 'تسجيل الماكينة'
  },
  'services.ai_dashboard': {
    en: 'AI Dashboard',
    ar: 'لوحة تحكم الذكاء الاصطناعي'
  },
  'services.service_kpis': {
    en: 'Service KPIs',
    ar: 'مؤشرات أداء الخدمة'
  },
  'services.ai_predictive_alerts': {
    en: 'AI Predictive Alerts',
    ar: 'تنبيهات التنبؤ بالذكاء الاصطناعي'
  },
  'services.ml_driven_predictions': {
    en: 'Machine learning-driven failure predictions and maintenance recommendations',
    ar: 'تنبؤات الأعطال المدعومة بالتعلم الآلي وتوصيات الصيانة'
  },
  'services.machine_id': {
    en: 'Machine ID',
    ar: 'معرف الماكينة'
  },
  'services.severity': {
    en: 'Severity',
    ar: 'الخطورة'
  },
  'services.component': {
    en: 'Component',
    ar: 'المكون'
  },
  'services.issue': {
    en: 'Issue',
    ar: 'المشكلة'
  },
  'services.predicted_failure_date': {
    en: 'Predicted Failure Date',
    ar: 'تاريخ العطل المتوقع'
  },
  'services.confidence': {
    en: 'Confidence',
    ar: 'مستوى الثقة'
  },
  'services.recommended_actions': {
    en: 'Recommended Actions',
    ar: 'الإجراءات الموصى بها'
  },
  'services.sensors_involved': {
    en: 'Sensors Involved',
    ar: 'المستشعرات المشاركة'
  },
  'services.machine_health_status': {
    en: 'Machine Health Status',
    ar: 'حالة صحة الماكينة'
  },
  'services.health_score': {
    en: 'Health Score',
    ar: 'درجة الصحة'
  },
  'services.last_maintenance': {
    en: 'Last Maintenance',
    ar: 'آخر صيانة'
  },
  'services.next_scheduled': {
    en: 'Next Scheduled',
    ar: 'الموعد التالي'
  },
  'services.operational_hours': {
    en: 'Operational Hours',
    ar: 'ساعات التشغيل'
  },
  'services.sensor_readings': {
    en: 'Sensor Readings',
    ar: 'قراءات المستشعرات'
  },
  'services.vibration': {
    en: 'Vibration',
    ar: 'الاهتزاز'
  },
  'services.temperature': {
    en: 'Temperature',
    ar: 'درجة الحرارة'
  },
  'services.pressure': {
    en: 'Pressure',
    ar: 'الضغط'
  },
  'services.acoustic': {
    en: 'Acoustic',
    ar: 'الصوتي'
  },
  'services.current': {
    en: 'Current',
    ar: 'التيار'
  },
  'services.normal': {
    en: 'Normal',
    ar: 'طبيعي'
  },
  'services.warning': {
    en: 'Warning',
    ar: 'تحذير'
  },
  'services.alert': {
    en: 'Alert',
    ar: 'تنبيه'
  },
  'services.stable': {
    en: 'Stable',
    ar: 'مستقر'
  },
  'services.increasing': {
    en: 'Increasing',
    ar: 'متزايد'
  },
  'services.decreasing': {
    en: 'Decreasing',
    ar: 'متناقص'
  },
  'services.optimal': {
    en: 'Optimal',
    ar: 'مثالي'
  },
  'services.degraded': {
    en: 'Degraded',
    ar: 'متدهور'
  },
  'services.maintenance_required': {
    en: 'Maintenance Required',
    ar: 'صيانة مطلوبة'
  },
  'services.critical_status': {
    en: 'Critical',
    ar: 'حرج'
  },
  'services.cutting': {
    en: 'Cutting',
    ar: 'قطع'
  },
  'services.milling': {
    en: 'Milling',
    ar: 'تفريز'
  },
  'services.welding': {
    en: 'Welding',
    ar: 'لحام'
  },
  'services.assembly': {
    en: 'Assembly',
    ar: 'تجميع'
  },
  'services.schedule_bearing_replacement': {
    en: 'Schedule bearing replacement within 2 weeks',
    ar: 'جدولة استبدال المحامل خلال أسبوعين'
  },
  'services.monitor_vibration_levels': {
    en: 'Monitor vibration levels daily',
    ar: 'مراقبة مستويات الاهتزاز يومياً'
  },
  'services.check_lubrication_system': {
    en: 'Check lubrication system',
    ar: 'فحص نظام التشحيم'
  },
  'services.calibrate_tool_changer': {
    en: 'Calibrate tool changer alignment',
    ar: 'معايرة محاذاة أداة تغيير الأدوات'
  },
  'services.inspect_pneumatic_actuators': {
    en: 'Inspect pneumatic actuators',
    ar: 'فحص المشغلات الهوائية'
  },
  'services.verify_positioning_sensors': {
    en: 'Verify positioning sensors',
    ar: 'التحقق من مستشعرات الموضع'
  },
  'services.increased_vibration_patterns': {
    en: 'Increased vibration patterns detected',
    ar: 'تم اكتشاف أنماط اهتزاز متزايدة'
  },
  'services.alignment_drift_detected': {
    en: 'Alignment drift detected',
    ar: 'تم اكتشاف انحراف في المحاذاة'
  },
  'services.main_spindle_bearings': {
    en: 'Main Spindle Bearings',
    ar: 'محامل المغزل الرئيسي'
  },
  'services.tool_changer_mechanism': {
    en: 'Tool Changer Mechanism',
    ar: 'آلية تغيير الأدوات'
  },
  'services.double_head_cutting_machine': {
    en: 'Double Head Cutting Machine',
    ar: 'ماكينة قطع برأسين'
  },
  'services.vertical_copy_router': {
    en: 'Vertical Copy Router',
    ar: 'جهاز التوجيه العمودي للنسخ'
  },
  'services.yilmaz_machine': {
    en: 'YILMAZ Double Head Cutting Machine',
    ar: 'ماكينة قطع يلماز برأسين'
  },
  
  // Service Cards - AI Predictive Maintenance
  'services.ai_predictive_maintenance': {
    en: 'AI Predictive Maintenance',
    ar: 'الصيانة التنبؤية بالذكاء الاصطناعي'
  },
  'services.ml_algorithms_predict': {
    en: 'Machine learning algorithms predict failures before they happen',
    ar: 'خوارزميات التعلم الآلي تتنبأ بالأعطال قبل حدوثها'
  },
  'services.vibration_analysis': {
    en: 'Vibration analysis',
    ar: 'تحليل الاهتزاز'
  },
  'services.thermal_imaging': {
    en: 'Thermal imaging',
    ar: 'التصوير الحراري'
  },
  'services.acoustic_monitoring': {
    en: 'Acoustic monitoring',
    ar: 'المراقبة الصوتية'
  },
  'services.prediction_accuracy': {
    en: '95% prediction accuracy',
    ar: 'دقة تنبؤ 95%'
  },
  'services.view_predictions': {
    en: 'View Predictions',
    ar: 'عرض التنبؤات'
  },
  'services.login_to_access': {
    en: 'Login to Access',
    ar: 'تسجيل الدخول للوصول'
  },
  
  // Emergency Repairs
  'services.emergency_repairs': {
    en: 'Emergency Repairs',
    ar: 'إصلاحات الطوارئ'
  },
  'services.ai_monitored_response': {
    en: '24/7 AI-monitored critical response team',
    ar: 'فريق الاستجابة الحرجة المراقب بالذكاء الاصطناعي على مدار الساعة'
  },
  'services.response_guarantee': {
    en: '2-hour response guarantee',
    ar: 'ضمان الاستجابة خلال ساعتين'
  },
  'services.smart_spare_parts': {
    en: 'Smart spare parts inventory',
    ar: 'مخزون قطع الغيار الذكية'
  },
  'services.mobile_repair_units': {
    en: 'Mobile repair units with IoT',
    ar: 'وحدات الإصلاح المتنقلة مع إنترنت الأشياء'
  },
  'services.real_time_technician_tracking': {
    en: 'Real-time technician tracking',
    ar: 'تتبع الفنيين في الوقت الفعلي'
  },
  'services.emergency_ticket': {
    en: 'Emergency Ticket',
    ar: 'تذكرة الطوارئ'
  },
  'services.login_for_emergency': {
    en: 'Login for Emergency',
    ar: 'تسجيل الدخول للطوارئ'
  },
  
  // AI Operator Training
  'services.ai_operator_training': {
    en: 'AI Operator Training',
    ar: 'تدريب المشغلين بالذكاء الاصطناعي'
  },
  'services.machine_specific_certification': {
    en: 'Machine-specific certification with performance analytics',
    ar: 'شهادة خاصة بالماكينة مع تحليلات الأداء'
  },
  'services.vr_simulations': {
    en: 'Virtual reality simulations',
    ar: 'محاكاة الواقع الافتراضي'
  },
  'services.performance_benchmarking': {
    en: 'Performance benchmarking',
    ar: 'معايرة الأداء'
  },
  'services.predictive_skill_assessment': {
    en: 'Predictive skill assessment',
    ar: 'تقييم المهارات التنبؤي'
  },
  'services.certification_tracking': {
    en: 'Certification tracking',
    ar: 'تتبع الشهادات'
  },
  'services.view_training_programs': {
    en: 'View Training Programs',
    ar: 'عرض برامج التدريب'
  },
  
  // Fabricator Workflow Pro
  'services.fabricator_workflow_pro': {
    en: 'Fabricator Workflow Pro',
    ar: 'سير عمل التصنيع المحترف'
  },
  'services.ai_powered_fabrication': {
    en: 'AI-powered aluminum & UPVC fabrication system with smart optimization',
    ar: 'نظام تصنيع الألمنيوم والـ UPVC المدعوم بالذكاء الاصطناعي مع التحسين الذكي'
  },
  'services.smart_measuring_interface': {
    en: 'Smart measuring interface',
    ar: 'واجهة القياس الذكية'
  },
  'services.cutting_optimization_engine': {
    en: 'Cutting optimization engine',
    ar: 'محرك تحسين القطع'
  },
  'services.real_time_monitoring': {
    en: 'Real-time monitoring',
    ar: 'المراقبة في الوقت الفعلي'
  },
  'services.quality_control_automation': {
    en: 'Quality control automation',
    ar: 'أتمتة مراقبة الجودة'
  },
  'services.launch_fabricator': {
    en: 'Launch Fabricator',
    ar: 'تشغيل المصنع'
  },
  
  // Customer Packages Section
  'services.customer_packages': {
    en: 'Customer Packages',
    ar: 'باقات العملاء'
  },
  'services.choose_package': {
    en: 'Choose the perfect package for your business needs',
    ar: 'اختر الباقة المثالية لاحتياجات عملك'
  },
  'services.basic_package': {
    en: 'Basic Package',
    ar: 'الباقة الأساسية'
  },
  'services.professional_package': {
    en: 'Professional Package',
    ar: 'الباقة المهنية'
  },
  'services.enterprise_package': {
    en: 'Enterprise Package',
    ar: 'باقة المؤسسات'
  },
  'services.package_features': {
    en: 'Package Features',
    ar: 'مميزات الباقة'
  },
  'services.package_pricing': {
    en: 'Package Pricing',
    ar: 'أسعار الباقات'
  },
  'services.get_started': {
    en: 'Get Started',
    ar: 'ابدأ الآن'
  },
  'services.contact_sales': {
    en: 'Contact Sales',
    ar: 'اتصل بالمبيعات'
  },
  'services.most_popular': {
    en: 'Most Popular',
    ar: 'الأكثر شعبية'
  },
  'services.recommended': {
    en: 'Recommended',
    ar: 'موصى به'
  },
  
  // Premium Services Page - Complete Translation
  'services.premium_services': {
    en: 'Premium Services',
    ar: 'الخدمات المتميزة'
  },
  'services.complete_care_solutions': {
    en: 'Complete care solutions for aluminum and UPVC fabrication machines. Smart enough for big factories, simple enough for small workshops.',
    ar: 'حلول رعاية شاملة لماكينات تصنيع الألمنيوم والـ UPVC. ذكية بما يكفي للمصانع الكبيرة، بسيطة بما يكفي للورش الصغيرة.'
  },
  'services.smart_enough_factories': {
    en: 'Smart enough for big factories, simple enough for small workshops.',
    ar: 'ذكية بما يكفي للمصانع الكبيرة، بسيطة بما يكفي للورش الصغيرة.'
  },
  
  // Statistics
  'services.customer_satisfaction': {
    en: 'Customer Satisfaction',
    ar: 'رضا العملاء'
  },
  'services.support_availability': {
    en: 'Support Availability',
    ar: 'توفر الدعم'
  },
  'services.avg_emergency_response': {
    en: 'Avg. Emergency Response',
    ar: 'متوسط الاستجابة للطوارئ'
  },
  'services.machines_serviced': {
    en: 'Machines Serviced',
    ar: 'ماكينة تم خدمتها'
  },
  
  // Smart Package Calculator
  'services.smart_package_calculator': {
    en: 'Smart Package Calculator',
    ar: 'حاسبة الباقات الذكية'
  },
  'services.find_perfect_package': {
    en: 'Find Your Perfect Service Package',
    ar: 'اعثر على باقة الخدمة المثالية لك'
  },
  'services.answer_questions_recommendation': {
    en: 'Answer a few questions and get an AI-powered recommendation for the ideal service plan for your business.',
    ar: 'أجب على بضعة أسئلة واحصل على توصية مدعومة بالذكاء الاصطناعي للخطة المثالية لعملك.'
  },
  'services.business_information': {
    en: 'Business Information',
    ar: 'معلومات العمل'
  },
  'services.number_of_machines': {
    en: 'Number of Machines',
    ar: 'عدد الماكينات'
  },
  'services.business_size': {
    en: 'Business Size',
    ar: 'حجم العمل'
  },
  'services.production_volume': {
    en: 'Production Volume',
    ar: 'حجم الإنتاج'
  },
  'services.support_urgency': {
    en: 'Support Urgency',
    ar: 'إلحاح الدعم'
  },
  'services.location': {
    en: 'Location',
    ar: 'الموقع'
  },
  'services.get_recommendation': {
    en: 'Get Recommendation',
    ar: 'احصل على التوصية'
  },
  'services.fill_business_details': {
    en: 'Fill in your business details',
    ar: 'املأ تفاصيل عملك'
  },
  'services.click_get_recommendation': {
    en: 'and click "Get Recommendation" to see your perfect package',
    ar: 'وانقر على "احصل على التوصية" لرؤية باقتك المثالية'
  },
  
  // Business Size Options
  'services.small_workshop': {
    en: 'Small Workshop (1-10 employees)',
    ar: 'ورشة صغيرة (1-10 موظفين)'
  },
  'services.medium_factory': {
    en: 'Medium Factory (11-50 employees)',
    ar: 'مصنع متوسط (11-50 موظف)'
  },
  'services.large_facility': {
    en: 'Large Facility (50+ employees)',
    ar: 'منشأة كبيرة (50+ موظف)'
  },
  
  // Production Volume Options
  'services.low_production': {
    en: 'Low (Seasonal/On-demand)',
    ar: 'منخفض (موسمي/حسب الطلب)'
  },
  'services.medium_production': {
    en: 'Medium (Regular production)',
    ar: 'متوسط (إنتاج منتظم)'
  },
  'services.high_production': {
    en: 'High (24/7 production)',
    ar: 'عالي (إنتاج 24/7)'
  },
  
  // Support Urgency Options
  'services.standard_response': {
    en: 'Standard (48-hour response)',
    ar: 'عادي (استجابة خلال 48 ساعة)'
  },
  'services.priority_response': {
    en: 'Priority (24-hour response)',
    ar: 'أولوية (استجابة خلال 24 ساعة)'
  },
  'services.critical_response': {
    en: 'Critical (4-hour response)',
    ar: 'حرج (استجابة خلال 4 ساعات)'
  },
  
  // Location Options
  'services.cairo_giza': {
    en: 'Cairo & Giza',
    ar: 'القاهرة والجيزة'
  },
  'services.alexandria': {
    en: 'Alexandria',
    ar: 'الإسكندرية'
  },
  'services.other_governorates': {
    en: 'Other Governorates',
    ar: 'محافظات أخرى'
  },
  
  // Service Packages
  'services.service_packages': {
    en: 'Service Packages',
    ar: 'باقات الخدمة'
  },
  'services.choose_perfect_care_plan': {
    en: 'Choose the perfect care plan for your workshop or factory',
    ar: 'اختر خطة الرعاية المثالية لورشتك أو مصنعك'
  },
  
  // Basic Care Package
  'services.basic_care_package': {
    en: 'Basic Care',
    ar: 'الرعاية الأساسية'
  },
  'services.basic_care_machines': {
    en: '1-3 machines',
    ar: '1-3 ماكينات'
  },
  'services.basic_care_price': {
    en: '3,500 EGP per month',
    ar: '3,500 جنيه شهرياً'
  },
  'services.monthly_health_check': {
    en: 'Monthly machine health check',
    ar: 'فحص صحة الماكينة الشهري'
  },
  'services.basic_spare_parts': {
    en: 'Basic spare parts (15% discount)',
    ar: 'قطع غيار أساسية (خصم 15%)'
  },
  'services.phone_email_support': {
    en: 'Phone/Email support (8AM-6PM)',
    ar: 'دعم هاتفي/بريد إلكتروني (8ص-6م)'
  },
  'services.forty_eight_hour_response': {
    en: '48-hour response time',
    ar: 'وقت استجابة 48 ساعة'
  },
  'services.two_training_sessions': {
    en: '2 operator training sessions/year',
    ar: 'جلستي تدريب للمشغلين/سنة'
  },
  'services.digital_machine_passport': {
    en: 'Digital machine passport',
    ar: 'جواز سفر الماكينة الرقمي'
  },
  
  // Professional Care Package
  'services.professional_care_package': {
    en: 'Professional Care',
    ar: 'الرعاية المهنية'
  },
  'services.professional_care_machines': {
    en: '4-10 machines',
    ar: '4-10 ماكينات'
  },
  'services.professional_care_price': {
    en: '8,500 EGP per month',
    ar: '8,500 جنيه شهرياً'
  },
  'services.weekly_remote_monitoring': {
    en: 'Weekly remote monitoring',
    ar: 'مراقبة عن بُعد أسبوعية'
  },
  'services.priority_spare_parts': {
    en: 'Priority spare parts (25% discount)',
    ar: 'قطع غيار أولوية (خصم 25%)'
  },
  'services.emergency_hotline': {
    en: '24/7 emergency hotline',
    ar: 'خط ساخن للطوارئ 24/7'
  },
  'services.twenty_four_hour_onsite': {
    en: '24-hour onsite response',
    ar: 'استجابة في الموقع خلال 24 ساعة'
  },
  'services.four_training_sessions': {
    en: '4 operator training sessions/year',
    ar: '4 جلسات تدريب للمشغلين/سنة'
  },
  'services.production_optimization_advice': {
    en: 'Production optimization advice',
    ar: 'نصائح تحسين الإنتاج'
  },
  'services.advanced_machine_diagnostics': {
    en: 'Advanced machine diagnostics',
    ar: 'تشخيصات متقدمة للماكينة'
  },
  
  // Enterprise Care Package
  'services.enterprise_care_package': {
    en: 'Enterprise Care',
    ar: 'رعاية المؤسسات'
  },
  'services.service_package': {
    en: 'Service Package',
    ar: 'باقة الخدمة'
  },
  'services.enterprise_care_machines': {
    en: '10+ machines',
    ar: '10+ ماكينات'
  },
  'services.custom_pricing': {
    en: 'Custom per pricing',
    ar: 'سعر مخصص'
  },
  'services.real_time_ai_predictive': {
    en: 'Real-time AI predictive maintenance',
    ar: 'صيانة تنبؤية بالذكاء الاصطناعي في الوقت الفعلي'
  },
  'services.dedicated_technical_team': {
    en: 'Dedicated technical team',
    ar: 'فريق تقني مخصص'
  },
  'services.four_hour_emergency_guarantee': {
    en: '4-hour emergency response guarantee',
    ar: 'ضمان استجابة الطوارئ خلال 4 ساعات'
  },
  'services.forty_percent_spare_parts': {
    en: 'Spare parts (40% discount)',
    ar: 'قطع غيار (خصم 40%)'
  },
  'services.unlimited_training_sessions': {
    en: 'Unlimited training sessions',
    ar: 'جلسات تدريب غير محدودة'
  },
  'services.custom_production_reports': {
    en: 'Custom production reports',
    ar: 'تقارير إنتاج مخصصة'
  },
  'services.technology_upgrade_consulting': {
    en: 'Technology upgrade consulting',
    ar: 'استشارات ترقية التكنولوجيا'
  },
  'services.export_compliance_support': {
    en: 'Export compliance support',
    ar: 'دعم الامتثال للتصدير'
  },
  
  // Package Features
  'services.sla_guarantee': {
    en: 'SLA Guarantee',
    ar: 'ضمان اتفاقية مستوى الخدمة'
  },
  'services.twenty_four_seven_support': {
    en: '24/7 Support',
    ar: 'دعم 24/7'
  },
  'services.performance_tracking': {
    en: 'Performance Tracking',
    ar: 'تتبع الأداء'
  },
  
  // Package Comparison
  'services.compare_service_packages': {
    en: 'Compare Our Service Packages',
    ar: 'قارن باقات الخدمة لدينا'
  },
  'services.choose_perfect_plan': {
    en: 'Choose the perfect plan for your business needs',
    ar: 'اختر الخطة المثالية لاحتياجات عملك'
  },
  'services.service_package_comparison': {
    en: 'Service Package Comparison',
    ar: 'مقارنة باقات الخدمة'
  },
  'services.features': {
    en: 'Features',
    ar: 'المميزات'
  },
  'services.core_services': {
    en: 'Core Services',
    ar: 'الخدمات الأساسية'
  },
  'services.machine_health_check': {
    en: 'Machine Health Check',
    ar: 'فحص صحة الماكينة'
  },
  'services.spare_parts_discount': {
    en: 'Spare Parts Discount',
    ar: 'خصم قطع الغيار'
  },
  'services.response_time': {
    en: 'Response Time',
    ar: 'وقت الاستجابة'
  },
  'services.support_hours': {
    en: 'Support Hours',
    ar: 'ساعات الدعم'
  },
  'services.advanced_features': {
    en: 'Advanced Features',
    ar: 'المميزات المتقدمة'
  },
  'services.remote_monitoring': {
    en: 'Remote Monitoring',
    ar: 'المراقبة عن بُعد'
  },
  'services.ai_predictive_maintenance_feature': {
    en: 'AI Predictive Maintenance',
    ar: 'الصيانة التنبؤية بالذكاء الاصطناعي'
  },
  'services.dedicated_team': {
    en: 'Dedicated Team',
    ar: 'فريق مخصص'
  },
  'services.custom_reports': {
    en: 'Custom Reports',
    ar: 'تقارير مخصصة'
  },
  'services.training_support': {
    en: 'Training & Support',
    ar: 'التدريب والدعم'
  },
  'services.training_sessions': {
    en: 'Training Sessions',
    ar: 'جلسات التدريب'
  },
  'services.operator_training': {
    en: 'Operator Training',
    ar: 'تدريب المشغلين'
  },
  'services.production_optimization': {
    en: 'Production Optimization',
    ar: 'تحسين الإنتاج'
  },
  'services.export_support': {
    en: 'Export Support',
    ar: 'دعم التصدير'
  },
  
  // Package Comparison Features
  'features.health_check': {
    en: 'Health Check',
    ar: 'فحص الصحة'
  },
  'features.spare_parts_discount': {
    en: 'Spare Parts Discount',
    ar: 'خصم قطع الغيار'
  },
  'features.response_time': {
    en: 'Response Time',
    ar: 'وقت الاستجابة'
  },
  'features.support_hours': {
    en: 'Support Hours',
    ar: 'ساعات الدعم'
  },
  'features.remote_monitoring': {
    en: 'Remote Monitoring',
    ar: 'المراقبة عن بُعد'
  },
  'features.ai_predictive': {
    en: 'AI Predictive Maintenance',
    ar: 'الصيانة التنبؤية بالذكاء الاصطناعي'
  },
  'features.dedicated_team': {
    en: 'Dedicated Team',
    ar: 'فريق مخصص'
  },
  'features.custom_reports': {
    en: 'Custom Reports',
    ar: 'تقارير مخصصة'
  },
  'features.training_sessions': {
    en: 'Training Sessions',
    ar: 'جلسات التدريب'
  },
  'features.operator_training': {
    en: 'Operator Training',
    ar: 'تدريب المشغلين'
  },
  'features.production_optimization': {
    en: 'Production Optimization',
    ar: 'تحسين الإنتاج'
  },
  'features.export_support': {
    en: 'Export Support',
    ar: 'دعم التصدير'
  },
  
  // Regional Service Coverage
  'services.regional_service_coverage': {
    en: 'Regional Service Coverage',
    ar: 'التغطية الإقليمية للخدمة'
  },
  'services.technician_locations_response_times': {
    en: 'Technician locations, response times, and capacity',
    ar: 'مواقع الفنيين، أوقات الاستجابة، والسعة'
  },
  'services.egypt_turkey': {
    en: 'Egypt & Turkey',
    ar: 'مصر وتركيا'
  },
  'services.cairo_team_a': {
    en: 'Cairo Team A',
    ar: 'فريق القاهرة أ'
  },
  'services.cairo': {
    en: 'Cairo',
    ar: 'القاهرة'
  },
  'services.min_eta': {
    en: 'min ETA',
    ar: 'دقيقة وقت الوصول المتوقع'
  },
  'services.alexandria_unit': {
    en: 'Alexandria Unit',
    ar: 'وحدة الإسكندرية'
  },
  'services.istanbul_crew': {
    en: 'Istanbul Crew',
    ar: 'طاقم إسطنبول'
  },
  'services.istanbul': {
    en: 'Istanbul',
    ar: 'إسطنبول'
  },
  'services.ankara_crew': {
    en: 'Ankara Crew',
    ar: 'طاقم أنقرة'
  },
  'services.ankara': {
    en: 'Ankara',
    ar: 'أنقرة'
  },
  
  // Success Stories
  'services.success_stories': {
    en: 'Success Stories',
    ar: 'قصص النجاح'
  },
  'services.real_results_real_customers': {
    en: 'Real Results from Real Customers',
    ar: 'نتائج حقيقية من عملاء حقيقيين'
  },
  'services.see_how_almona_transformed': {
    en: 'See how ALMONA\'s service packages have transformed businesses across Egypt. From small workshops to large factories, our customers achieve remarkable results.',
    ar: 'شاهد كيف حولت باقات خدمة ألمونا الأعمال في جميع أنحاء مصر. من الورش الصغيرة إلى المصانع الكبيرة، يحقق عملاؤنا نتائج رائعة.'
  },
  
  // Customer Stories
  'services.ahmed_hassan': {
    en: 'Ahmed Hassan',
    ar: 'أحمد حسن'
  },
  'services.hassan_sons_metalworks': {
    en: 'Hassan & Sons Metalworks',
    ar: 'حسن وأولاده للمعادن'
  },
  'services.production_manager': {
    en: 'Production Manager',
    ar: 'مدير الإنتاج'
  },
  'services.cairo_egypt': {
    en: 'Cairo, Egypt',
    ar: 'القاهرة، مصر'
  },
  'services.professional_care_package_name': {
    en: 'Professional Care',
    ar: 'الرعاية المهنية'
  },
  'services.almona_professional_care_transformed': {
    en: 'Almona\'s Professional Care package transformed our operations. We went from 3 days of downtime per month to just 4 hours. The predictive maintenance caught issues before they became problems.',
    ar: 'حولت باقة الرعاية المهنية من ألمونا عملياتنا. انتقلنا من 3 أيام توقف شهرياً إلى 4 ساعات فقط. الصيانة التنبؤية اكتشفت المشاكل قبل أن تصبح مشاكل.'
  },
  'services.results_achieved': {
    en: 'Results Achieved',
    ar: 'النتائج المحققة'
  },
  'services.production': {
    en: 'Production',
    ar: 'الإنتاج'
  },
  'services.downtime': {
    en: 'Downtime',
    ar: 'وقت التوقف'
  },
  'services.efficiency': {
    en: 'Efficiency',
    ar: 'الكفاءة'
  },
  'services.key_results': {
    en: 'Key Results:',
    ar: 'النتائج الرئيسية:'
  },
  'services.ninety_five_percent_reduction_downtime': {
    en: '95% reduction in downtime',
    ar: '95% تقليل في وقت التوقف'
  },
  'services.forty_percent_increase_production': {
    en: '40% increase in production efficiency',
    ar: '40% زيادة في كفاءة الإنتاج'
  },
  'services.sixty_percent_reduction_maintenance': {
    en: '60% reduction in maintenance costs',
    ar: '60% تقليل في تكاليف الصيانة'
  },
  
  'services.fatima_alsayed': {
    en: 'Fatima Al-Sayed',
    ar: 'فاطمة السيد'
  },
  'services.alsayed_upvc_windows': {
    en: 'Al-Sayed UPVC Windows',
    ar: 'السيد لنوافذ UPVC'
  },
  'services.operations_director': {
    en: 'Operations Director',
    ar: 'مدير العمليات'
  },
  'services.alexandria_egypt': {
    en: 'Alexandria, Egypt',
    ar: 'الإسكندرية، مصر'
  },
  'services.enterprise_care_package_name': {
    en: 'Enterprise Care',
    ar: 'رعاية المؤسسات'
  },
  'services.enterprise_care_ai_insights': {
    en: 'The Enterprise Care package gave us the AI-powered insights we needed to scale. We\'re now producing 300% more with the same equipment and have expanded to 3 new markets.',
    ar: 'أعطتنا باقة رعاية المؤسسات الرؤى المدعومة بالذكاء الاصطناعي التي نحتاجها للتوسع. نحن الآن ننتج 300% أكثر بنفس المعدات وتوسعنا إلى 3 أسواق جديدة.'
  },
  'services.three_hundred_percent_increase_production': {
    en: '300% increase in production',
    ar: '300% زيادة في الإنتاج'
  },
  'services.ninety_nine_point_two_quality_rate': {
    en: '99.2% quality rate achieved',
    ar: 'تحقيق معدل جودة 99.2%'
  },
  'services.successfully_exported_three_countries': {
    en: 'Successfully exported to 3 countries',
    ar: 'تصدير ناجح إلى 3 دول'
  },
  
  'services.ready_write_success_story': {
    en: 'Ready to Write Your Success Story?',
    ar: 'مستعد لكتابة قصتك الناجحة؟'
  },
  'services.join_hundreds_satisfied_customers': {
    en: 'Join hundreds of satisfied customers who have transformed their businesses with ALMONA\'s service packages.',
    ar: 'انضم إلى مئات العملاء الراضين الذين حولوا أعمالهم بباقات خدمة ألمونا.'
  },
  'services.get_free_consultation': {
    en: 'Get Your Free Consultation',
    ar: 'احصل على استشارتك المجانية'
  },
  'services.view_all_case_studies': {
    en: 'View All Case Studies',
    ar: 'عرض جميع دراسات الحالة'
  },
  
  // Complete Service Catalog
  'services.complete_service_catalog': {
    en: 'Complete Service Catalog',
    ar: 'كتالوج الخدمة الكامل'
  },
  'services.everything_keep_fabrication_running': {
    en: 'Everything you need to keep your fabrication business running smoothly',
    ar: 'كل ما تحتاجه لإبقاء أعمال التصنيع تعمل بسلاسة'
  },
  
  // Machine Services
  'services.machine_services': {
    en: 'Machine Services',
    ar: 'خدمات الماكينات'
  },
  'services.installation_setup': {
    en: 'Installation & Setup',
    ar: 'التثبيت والإعداد'
  },
  'services.regular_maintenance': {
    en: 'Regular Maintenance',
    ar: 'الصيانة الدورية'
  },
  'services.machine_optimization': {
    en: 'Machine Optimization',
    ar: 'تحسين الماكينة'
  },
  'services.technology_upgrades': {
    en: 'Technology Upgrades',
    ar: 'ترقيات التكنولوجيا'
  },
  
  // Training Programs
  'services.training_programs': {
    en: 'Training Programs',
    ar: 'برامج التدريب'
  },
  'services.basic_operator_training': {
    en: 'Basic Operator Training',
    ar: 'تدريب المشغلين الأساسي'
  },
  'services.advanced_fabrication': {
    en: 'Advanced Fabrication',
    ar: 'التصنيع المتقدم'
  },
  'services.quality_control': {
    en: 'Quality Control',
    ar: 'مراقبة الجودة'
  },
  'services.team_leader_programs': {
    en: 'Team Leader Programs',
    ar: 'برامج قادة الفريق'
  },
  'services.safety_certification': {
    en: 'Safety Certification',
    ar: 'شهادة السلامة'
  },
  
  // Support Services
  'services.support_services': {
    en: 'Support Services',
    ar: 'خدمات الدعم'
  },
  'services.spare_parts_supply': {
    en: 'Spare Parts Supply',
    ar: 'توريد قطع الغيار'
  },
  'services.production_consulting': {
    en: 'Production Consulting',
    ar: 'استشارات الإنتاج'
  },
  'services.quality_assurance': {
    en: 'Quality Assurance',
    ar: 'ضمان الجودة'
  },
  'services.export_preparation': {
    en: 'Export Preparation',
    ar: 'إعداد التصدير'
  },
  'services.custom_solutions': {
    en: 'Custom Solutions',
    ar: 'حلول مخصصة'
  },
  
  // How Our Service Works
  'services.how_our_service_works': {
    en: 'How Our Service Works',
    ar: 'كيف تعمل خدمتنا'
  },
  'services.choose_package_step': {
    en: 'Choose Package',
    ar: 'اختر الباقة'
  },
  'services.select_perfect_service_plan': {
    en: 'Select the perfect service plan for your needs',
    ar: 'اختر خطة الخدمة المثالية لاحتياجاتك'
  },
  'services.machine_registration_step': {
    en: 'Machine Registration',
    ar: 'تسجيل الماكينة'
  },
  'services.register_machines_digital_tracking': {
    en: 'Register your machines for digital tracking',
    ar: 'سجل ماكيناتك للمتابعة الرقمية'
  },
  'services.service_activation_step': {
    en: 'Service Activation',
    ar: 'تفعيل الخدمة'
  },
  'services.dedicated_support_team_assigned': {
    en: 'Your dedicated support team is assigned',
    ar: 'يتم تعيين فريق الدعم المخصص لك'
  },
  'services.ongoing_care_step': {
    en: 'Ongoing Care',
    ar: 'الرعاية المستمرة'
  },
  'services.regular_maintenance_twenty_four_seven': {
    en: 'Regular maintenance and 24/7 support',
    ar: 'صيانة دورية ودعم 24/7'
  },
  
  // CTA Section
  'services.ready_transform_fabrication_business': {
    en: 'Ready to Transform Your Fabrication Business?',
    ar: 'مستعد لتحويل أعمال التصنيع الخاصة بك؟'
  },
  'services.join_hundreds_satisfied_fabricators': {
    en: 'Join hundreds of satisfied aluminum and UPVC fabricators who trust ALMONA for their machine care.',
    ar: 'انضم إلى مئات مصنعي الألمنيوم والـ UPVC الراضين الذين يثقون في ألمونا لرعاية ماكيناتهم.'
  },
  'services.get_free_consultation_cta': {
    en: 'Get Free Consultation',
    ar: 'احصل على استشارة مجانية'
  },
  'services.view_case_studies_cta': {
    en: 'View Case Studies',
    ar: 'عرض دراسات الحالة'
  },
  
  // Common
  'common.next': {
    en: 'Next',
    ar: 'التالي'
  },
  'common.back': {
    en: 'Back',
    ar: 'السابق'
  },
  'common.submit': {
    en: 'Submit',
    ar: 'إرسال'
  },
  'common.cancel': {
    en: 'Cancel',
    ar: 'إلغاء'
  },
  'common.save': {
    en: 'Save',
    ar: 'حفظ'
  },
  'common.edit': {
    en: 'Edit',
    ar: 'تعديل'
  },
  'common.delete': {
    en: 'Delete',
    ar: 'حذف'
  },
  'common.loading': {
    en: 'Loading...',
    ar: 'جاري التحميل...'
  },
  'common.error': {
    en: 'Error',
    ar: 'خطأ'
  },
  'common.success': {
    en: 'Success',
    ar: 'نجح'
  },
  'common.warning': {
    en: 'Warning',
    ar: 'تحذير'
  },
  'common.info': {
    en: 'Information',
    ar: 'معلومات'
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    // Load language from localStorage
    const savedLanguage = localStorage.getItem('language') as Language;
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'ar')) {
      setLanguage(savedLanguage);
    }
  }, []);

  useEffect(() => {
    // Save language to localStorage
    localStorage.setItem('language', language);
    
    // Set document direction
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback((key: string): string => {
    return translations[key]?.[language] || key;
  }, [language]);

  const contextValue = useMemo(() => ({
    language,
    setLanguage,
    t
  }), [language, setLanguage, t]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
