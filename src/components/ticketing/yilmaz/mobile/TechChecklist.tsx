/**
 * @tier Tier 1 Presentation (Mobile-Optimized Technician Interface)
 * @constitutional_compliance AICS-001 §7 (Presentation layer, no execution)
 * @authority None - Data collection only, triggers Tier 2 advisory
 * @region Egypt-specific YILMAZ technician workflow
 *
 * GOVERNANCE:
 * - This is a Tier 1 component: presentation/data collection only
 * - Collects manual sensor readings from technician ("Human-as-a-Sensor")
 * - On submit, triggers Tier 2 Advisory Gate for validation
 * - Does NOT create tickets or parts orders directly
 * - Mobile-optimized for Arabic/English bilingual technicians
 * Migrated from Ant Design to Shadcn (Phase 3.1)
 */

import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/shared/ui/ui/form';
import { Input } from '@/shared/ui/ui/input';
import { Label } from '@/shared/ui/ui/label';
import { RadioGroup, RadioGroupItem } from '@/shared/ui/ui/radio-group';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/ui/ui/select';
import { Separator } from '@/shared/ui/ui/separator';
import { Slider } from '@/shared/ui/ui/slider';
import { Textarea } from '@/shared/ui/ui/textarea';
import {
    AlertTriangle,
    Camera,
    CheckCircle,
    Clock,
    Flame,
    FlaskConical,
    Mic,
    Wrench,
    Zap,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
    YilmazExpertAdvisory,
    yilmazExpertAdvisor,
} from '../../../../services/ticketing/yilmaz/advisory/YilmazExpertAdvisor';
import {
    YilmazMachineModel,
    YilmazTechnicianInput,
} from '../../../../services/ticketing/yilmaz/rules/YilmazEgyptRules';

interface TechChecklistProps {
  machineSerial?: string;
  machineModel?: YilmazMachineModel;
  onAdvisoryGenerated?: (advisory: YilmazExpertAdvisory) => void;
  language?: 'en' | 'ar';
}

interface FormValues {
  machineModel: string;
  machineSerial: string;
  installationYear: number;
  operatingHours?: number;
  location: string;
  hydraulicPressureBar?: number;
  spindleTempCelsius?: number;
  inputVoltage?: number;
  ambientTempCelsius?: number;
  dustLevel: number;
  symptoms?: string;
}

export const TechChecklist: React.FC<TechChecklistProps> = ({
  machineSerial: initialSerial,
  machineModel: initialModel,
  onAdvisoryGenerated,
  language = 'en',
}) => {
  const [loading, setLoading] = useState(false);
  const [advisory, setAdvisory] = useState<YilmazExpertAdvisory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'ar'>(language);
  const [fileList, setFileList] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  const form = useForm<FormValues>({
    defaultValues: {
      dustLevel: 1,
      location: 'cairo',
      installationYear: new Date().getFullYear(),
      machineModel: '',
      machineSerial: '',
      operatingHours: undefined,
      hydraulicPressureBar: undefined,
      spindleTempCelsius: undefined,
      inputVoltage: undefined,
      ambientTempCelsius: undefined,
      symptoms: '',
    },
  });

  const dustLevel = form.watch('dustLevel');

  useEffect(() => {
    if (initialSerial) form.setValue('machineSerial', initialSerial);
    if (initialModel) form.setValue('machineModel', initialModel);
  }, [initialSerial, initialModel, form]);

  const handleSubmit = async (values: FormValues) => {
    setLoading(true);
    setError(null);
    setAdvisory(null);

    try {
      const technicianInput: YilmazTechnicianInput = {
        machineModel: values.machineModel,
        machineSerial: values.machineSerial,
        installationYear: values.installationYear || new Date().getFullYear(),
        hydraulicPressureBar: values.hydraulicPressureBar,
        spindleTempCelsius: values.spindleTempCelsius,
        inputVoltage: values.inputVoltage,
        dustLevel: values.dustLevel || 1,
        ambientTempCelsius: values.ambientTempCelsius,
        symptoms: values.symptoms
          ? values.symptoms
              .split(',')
              .map((s) => s.trim())
              .filter((s) => s)
          : [],
        currentMonth: new Date().getMonth(),
        location: values.location || 'cairo',
        lastMaintenanceDate: undefined,
        operatingHours: values.operatingHours,
      };

      const generatedAdvisory = await yilmazExpertAdvisor.generateAdvisory(technicianInput);
      setAdvisory(generatedAdvisory);
      if (onAdvisoryGenerated) onAdvisoryGenerated(generatedAdvisory);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate advisory');
    } finally {
      setLoading(false);
    }
  };

  const t = (en: string, ar: string) => (selectedLanguage === 'ar' ? ar : en);

  const dustLevelMarks: Record<number, string> = {
    1: t('Clean', 'نظيف'),
    2: t('Light', 'خفيف'),
    3: t('⚠️ Moderate', '⚠️ متوسط'),
    4: t('⚠️ Heavy', '⚠️ ثقيل'),
    5: t('🚨 Severe', '🚨 شديد'),
  };

  const renderUrgencyBadge = (urgency: string) => {
    const variant = urgency === 'critical' ? 'destructive' : urgency === 'high' ? 'default' : 'secondary';
    return <Badge variant={variant}>{urgency.toUpperCase()}</Badge>;
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (accepted) => setFileList((prev) => [...prev, ...accepted].slice(0, 3)),
    accept: { 'image/*': [] },
    maxFiles: 3,
  });

  return (
    <div className="max-w-[600px] mx-auto p-4">
      {/* Header */}
      <Card className="mb-4 overflow-hidden">
        <CardContent className="pt-6 bg-gradient-to-br from-blue-900 to-blue-600 text-white">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Wrench className="w-6 h-6" />
              <h3 className="text-lg font-semibold">
                {t('YILMAZ Tech Checklist', 'قائمة فحص فني YILMAZ')}
              </h3>
            </div>
            <p className="text-white/90 text-sm">
              {t('Human-as-a-Sensor Data Collection', 'جمع البيانات من الإنسان كمستشعر')}
            </p>
            <div className="flex items-center gap-2 text-xs text-white/90">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
              </span>
              {t('Tier 1 Presentation → Tier 2 Advisory', 'الطبقة 1 عرض ← الطبقة 2 استشارة')}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Language Toggle */}
      <Card className="mb-4">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <Label className="font-medium">{t('Language / اللغة:', 'Language / اللغة:')}</Label>
            <RadioGroup
              value={selectedLanguage}
              onValueChange={(v) => setSelectedLanguage(v as 'en' | 'ar')}
              className="flex gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="en" id="lang-en" />
                <Label htmlFor="lang-en" className="cursor-pointer">English</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ar" id="lang-ar" />
                <Label htmlFor="lang-ar" className="cursor-pointer">العربية</Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Machine Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FlaskConical className="w-4 h-4" />
                {t('Machine Information', 'معلومات الآلة')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="machineModel"
                rules={{ required: t('Please select machine model', 'يرجى اختيار طراز الآلة') }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Machine Model', 'طراز الآلة')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('Select Model', 'اختر الطراز')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="AIM_4410">YILMAZ AIM 4410</SelectItem>
                        <SelectItem value="AIM_7510">YILMAZ AIM 7510</SelectItem>
                        <SelectItem value="ALM_6510">YILMAZ ALM 6510</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="machineSerial"
                rules={{ required: t('Please enter serial number', 'يرجى إدخال الرقم التسلسلي') }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Serial Number', 'الرقم التسلسلي')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('e.g., YIL-2024-12345', 'مثال: YIL-2024-12345')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="installationYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Installation Year', 'سنة التركيب')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={2000}
                          max={new Date().getFullYear()}
                          placeholder="2024"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value, 10) || undefined)}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="operatingHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Operating Hours', 'ساعات التشغيل')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder="12000"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(parseInt(e.target.value, 10) || undefined)}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="location"
                rules={{ required: true }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Location', 'الموقع')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('Select Location', 'اختر الموقع')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cairo">{t('Cairo', 'القاهرة')}</SelectItem>
                        <SelectItem value="giza">{t('Giza', 'الجيزة')}</SelectItem>
                        <SelectItem value="alexandria">{t('Alexandria', 'الإسكندرية')}</SelectItem>
                        <SelectItem value="suez">{t('Suez', 'السويس')}</SelectItem>
                        <SelectItem value="port_said">{t('Port Said', 'بورسعيد')}</SelectItem>
                        <SelectItem value="other">{t('Other', 'آخر')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Manual Sensor Readings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="w-4 h-4" />
                {t('Manual Sensor Readings', 'قراءات المستشعرات اليدوية')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert variant="destructive" className="border-amber-500 bg-amber-500/10">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{t('Take readings with machine STOPPED and SAFE', 'خذ القراءات مع الآلة متوقفة وآمنة')}</AlertTitle>
              </Alert>
              <FormField
                control={form.control}
                name="hydraulicPressureBar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      {t('Hydraulic Pressure (bar)', 'الضغط الهيدروليكي (بار)')}
                      <Badge variant="secondary">{t('Normal: 140-160', 'عادي: 140-160')}</Badge>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={200}
                        placeholder="150"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="spindleTempCelsius"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Flame className="w-4 h-4" />
                      {t('Spindle Temperature (°C)', 'درجة حرارة المحور (°م)')}
                      <Badge variant="secondary">{t('Normal: <70', 'عادي: <70')}</Badge>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={150}
                        placeholder="65"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="inputVoltage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      {t('Input Voltage (V)', 'جهد الدخل (فولت)')}
                      <Badge variant="secondary">{t('Normal: 220±10', 'عادي: 220±10')}</Badge>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={150}
                        max={300}
                        placeholder="220"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ambientTempCelsius"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Ambient Temperature (°C)', 'درجة الحرارة المحيطة (°م)')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={60}
                        placeholder="30"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dustLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      {t('Dust Level (Visual Assessment)', 'مستوى الغبار (تقييم بصري)')}
                    </FormLabel>
                    <FormControl>
                      <Slider
                        min={1}
                        max={5}
                        step={1}
                        value={[field.value]}
                        onValueChange={([v]) => field.onChange(v)}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">{dustLevelMarks[dustLevel]}</p>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Observed Symptoms */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="w-4 h-4" />
                {t('Observed Symptoms', 'الأعراض الملحوظة')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="symptoms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Symptoms (comma-separated)', 'الأعراض (مفصولة بفواصل)')}</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder={t(
                          'vibration increase, thermal shutdown, positioning error',
                          'زيادة الاهتزاز، إيقاف حراري، خطأ في الموضع'
                        )}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t(
                        'e.g., vibration increase, thermal shutdown, positioning error',
                        'مثال: زيادة الاهتزاز، إيقاف حراري، خطأ في الموضع'
                      )}
                    </FormDescription>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Evidence Collection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Camera className="w-4 h-4" />
                {t('Evidence Collection', 'جمع الأدلة')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormItem>
                <FormLabel>{t('Photo Evidence', 'أدلة الصور')}</FormLabel>
                <p className="text-sm text-muted-foreground">
                  {t('Upload photos of the issue. Saved locally first.', 'حمل صور للمشكلة. تحفظ محليا أولا.')}
                </p>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/25 hover:border-primary'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Camera className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm">
                    {fileList.length < 3
                      ? t('Drag & drop or click to upload (max 3)', 'اسحب وأفلت أو انقر للتحميل (حد أقصى 3)')
                      : `${fileList.length} ${t('files', 'ملفات')}`}
                  </p>
                </div>
              </FormItem>
              <Separator />
              <FormItem>
                <FormLabel>{t('Voice Note', 'ملاحظة صوتية')}</FormLabel>
                <p className="text-sm text-muted-foreground">
                  {t('Record a brief description of the noise or issue.', 'سجل وصفا موجزا للضوضاء أو المشكلة.')}
                </p>
                <Button
                  type="button"
                  variant={isRecording ? 'destructive' : 'outline'}
                  onClick={() => {
                    if (isRecording) {
                      setIsRecording(false);
                      toast.success(t('Voice note saved locally', 'تم حفظ الملاحظة الصوتية محليا'));
                    } else {
                      setIsRecording(true);
                      toast.info(t('Recording... Click to stop', 'جاري التسجيل... انقر للإيقاف'));
                    }
                  }}
                >
                  <Mic className="w-4 h-4 mr-2" />
                  {isRecording ? t('Stop Recording', 'إيقاف التسجيل') : t('Record Voice Note', 'تسجيل ملاحظة صوتية')}
                </Button>
              </FormItem>
            </CardContent>
          </Card>

          {/* Submit */}
          <Button type="submit" size="lg" className="w-full h-14" disabled={loading}>
            <CheckCircle className="w-5 h-5 mr-2" />
            {loading ? t('Generating...', 'جاري التوليد...') : t('Generate Advisory (Tier 2 Validation)', 'توليد استشارة (التحقق من الطبقة 2)')}
          </Button>
        </form>
      </Form>

      {/* Error */}
      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertTitle>{t('Error', 'خطأ')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Advisory Display */}
      {advisory && (
        <Card className="mt-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle className="w-5 h-5 text-green-600" />
              {t('Advisory Generated', 'تم توليد الاستشارة')}
            </CardTitle>
            {renderUrgencyBadge(advisory.urgency)}
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTitle>{t('AICS-001 Advisory Disclaimer', 'إخلاء مسؤولية AICS-001')}</AlertTitle>
              <AlertDescription className="text-xs">{advisory.constitutionalDisclaimer}</AlertDescription>
            </Alert>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">{t('Confidence:', 'الثقة:')}</span> {(advisory.confidence * 100).toFixed(0)}%
              </div>
              <div>
                <span className="font-medium">{t('Downtime:', 'وقت التوقف:')}</span> {advisory.estimatedDowntimeHours}h
              </div>
            </div>
            <Separator />
            <div>
              <h4 className="font-medium mb-2">{t('Suggestion', 'الاقتراح')}</h4>
              <p
                className="text-sm whitespace-pre-wrap"
                style={{ direction: selectedLanguage === 'ar' ? 'rtl' : 'ltr' }}
              >
                {selectedLanguage === 'ar' ? advisory.suggestionAr : advisory.suggestionEn}
              </p>
            </div>
            {(selectedLanguage === 'ar' ? advisory.preventiveActionsAr : advisory.preventiveActionsEn).length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-2">{t('Preventive Actions', 'الإجراءات الوقائية')}</h4>
                  <ul className="list-disc pl-6 space-y-1" style={{ direction: selectedLanguage === 'ar' ? 'rtl' : 'ltr' }}>
                    {(selectedLanguage === 'ar' ? advisory.preventiveActionsAr : advisory.preventiveActionsEn).map(
                      (action, index) => (
                        <li key={index}>{action}</li>
                      )
                    )}
                  </ul>
                </div>
              </>
            )}
            {advisory.recommendedParts.length > 0 && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-2">{t('Required Parts', 'القطع المطلوبة')}</h4>
                  <div className="space-y-2">
                    {advisory.recommendedParts.map((part, index) => (
                      <Card key={index} className="bg-muted/50">
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium" style={{ direction: selectedLanguage === 'ar' ? 'rtl' : 'ltr' }}>
                                {selectedLanguage === 'ar' ? part.nameAr : part.nameEn}
                              </p>
                              <p className="text-xs text-muted-foreground">{part.partNumber}</p>
                              {part.critical && <Badge variant="destructive" className="mt-1">{t('CRITICAL', 'حرج')}</Badge>}
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">
                                {part.priceEGP.toLocaleString(selectedLanguage === 'ar' ? 'ar-EG' : 'en-EG')} {t('EGP', 'جنيه')}
                              </p>
                              <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                                <Clock className="w-3 h-3" />
                                {part.leadTimeDays} {t('days', 'أيام')}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200">
                      <CardContent className="pt-4 flex justify-between">
                        <span className="font-medium">{t('Total Cost:', 'التكلفة الإجمالية:')}</span>
                        <span className="font-bold text-blue-600">
                          {advisory.totalCostEGP.toLocaleString(selectedLanguage === 'ar' ? 'ar-EG' : 'en-EG')} {t('EGP', 'جنيه')}
                        </span>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </>
            )}
            {advisory.seasonalWarningEn && (
              <Alert className="border-amber-500 bg-amber-500/10">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{t('Seasonal Alert', 'تنبيه موسمي')}</AlertTitle>
                <AlertDescription>
                  {selectedLanguage === 'ar' ? advisory.seasonalWarningAr : advisory.seasonalWarningEn}
                </AlertDescription>
              </Alert>
            )}
            <Separator />
            <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
              <div>
                <p>{t('Advisory ID:', 'معرف الاستشارة:')}</p>
                <code className="text-xs">{advisory.advisoryId}</code>
              </div>
              <div>
                <p>{t('Timestamp:', 'الطابع الزمني:')}</p>
                <code className="text-xs">{new Date(advisory.advisoryTimestamp).toLocaleString()}</code>
              </div>
            </div>
            <Separator />
            <Alert>
              <AlertTitle>{t('Next Steps', 'الخطوات التالية')}</AlertTitle>
              <AlertDescription>
                {t(
                  'This advisory requires human validation. A YILMAZ-certified technician must review and approve before creating a service ticket or ordering parts.',
                  'تتطلب هذه الاستشارة التحقق من صحة الإنسان. يجب على فني معتمد من YILMAZ المراجعة والموافقة قبل إنشاء تذكرة خدمة أو طلب قطع.'
                )}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TechChecklist;
