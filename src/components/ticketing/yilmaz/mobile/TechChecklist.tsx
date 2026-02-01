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
 */

import {
  AudioOutlined,
  CameraOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExperimentOutlined,
  FireOutlined,
  ThunderboltOutlined,
  ToolOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { Alert, Badge, Button, Card, Col, Divider, Form, Input, InputNumber, Radio, Row, Select, Slider, Space, Tag, Typography, Upload, message } from 'antd';
import React, { useEffect, useState } from 'react';
import {
  YilmazExpertAdvisory,
  yilmazExpertAdvisor
} from '../../../../services/ticketing/yilmaz/advisory/YilmazExpertAdvisor';
import {
  YilmazMachineModel,
  YilmazTechnicianInput
} from '../../../../services/ticketing/yilmaz/rules/YilmazEgyptRules';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

/**
 * Props
 */
interface TechChecklistProps {
  machineSerial?: string;
  machineModel?: YilmazMachineModel;
  onAdvisoryGenerated?: (advisory: YilmazExpertAdvisory) => void;
  language?: 'en' | 'ar';
}

/**
 * YILMAZ Technician Checklist Component (Tier 1)
 * 
 * Mobile-optimized form for YILMAZ technicians to input manual sensor readings
 * and observed symptoms. Triggers Tier 2 advisory validation on submit.
 */
export const TechChecklist: React.FC<TechChecklistProps> = ({
  machineSerial: initialSerial,
  machineModel: initialModel,
  onAdvisoryGenerated,
  language = 'en'
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [advisory, setAdvisory] = useState<YilmazExpertAdvisory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'ar'>(language);
  const [dustLevel, setDustLevel] = useState<number>(1);
  const [fileList, setFileList] = useState<any[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  // Initialize form with props
  useEffect(() => {
    if (initialSerial) form.setFieldValue('machineSerial', initialSerial);
    if (initialModel) form.setFieldValue('machineModel', initialModel);
  }, [initialSerial, initialModel, form]);

  /**
   * Handle form submission
   */
  const handleSubmit = async (values: any) => {
    setLoading(true);
    setError(null);
    setAdvisory(null);

    try {
      // Build technician input
      const technicianInput: YilmazTechnicianInput = {
        machineModel: values.machineModel,
        machineSerial: values.machineSerial,
        installationYear: values.installationYear || new Date().getFullYear(),
        hydraulicPressureBar: values.hydraulicPressureBar,
        spindleTempCelsius: values.spindleTempCelsius,
        inputVoltage: values.inputVoltage,
        dustLevel: values.dustLevel || 1,
        ambientTempCelsius: values.ambientTempCelsius,
        symptoms: values.symptoms ? values.symptoms.split(',').map((s: string) => s.trim()).filter((s: string) => s) : [],
        currentMonth: new Date().getMonth(),
        location: values.location || 'cairo',
        lastMaintenanceDate: values.lastMaintenanceDate ? new Date(values.lastMaintenanceDate) : undefined,
        operatingHours: values.operatingHours
      };

      // Trigger Tier 2 advisory
      const generatedAdvisory = await yilmazExpertAdvisor.generateAdvisory(technicianInput);

      setAdvisory(generatedAdvisory);

      // Callback for parent component (e.g., to open advisory gate)
      if (onAdvisoryGenerated) {
        onAdvisoryGenerated(generatedAdvisory);
      }

    } catch (err: any) {
      setError(err.message || 'Failed to generate advisory');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get translations
   */
  const t = (en: string, ar: string) => selectedLanguage === 'ar' ? ar : en;

  /**
   * Render dust level marks
   */
  const dustLevelMarks = {
    1: t('Clean', 'نظيف'),
    2: t('Light', 'خفيف'),
    3: t('⚠️ Moderate', '⚠️ متوسط'),
    4: t('⚠️ Heavy', '⚠️ ثقيل'),
    5: t('🚨 Severe', '🚨 شديد')
  };

  /**
   * Render urgency badge
   */
  const renderUrgencyBadge = (urgency: string) => {
    const colors: Record<string, string> = {
      low: 'green',
      medium: 'blue',
      high: 'orange',
      critical: 'red'
    };
    return <Tag color={colors[urgency] || 'default'}>{urgency.toUpperCase()}</Tag>;
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '16px' }}>
      {/* Header */}
      <Card
        style={{ marginBottom: 16 }}
        bodyStyle={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
          color: 'white'
        }}
      >
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Space>
            <ToolOutlined style={{ fontSize: 24 }} />
            <Title level={3} style={{ margin: 0, color: 'white' }}>
              {t('YILMAZ Tech Checklist', 'قائمة فحص فني YILMAZ')}
            </Title>
          </Space>
          <Text style={{ color: 'rgba(255,255,255,0.9)' }}>
            {t('Human-as-a-Sensor Data Collection', 'جمع البيانات من الإنسان كمستشعر')}
          </Text>
          <Space>
            <Badge status="processing" />
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12 }}>
              {t('Tier 1 Presentation → Tier 2 Advisory', 'الطبقة 1 عرض ← الطبقة 2 استشارة')}
            </Text>
          </Space>
        </Space>
      </Card>

      {/* Language Toggle */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Text strong>{t('Language / اللغة:', 'Language / اللغة:')}</Text>
          </Col>
          <Col>
            <Radio.Group
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              buttonStyle="solid"
            >
              <Radio.Button value="en">English</Radio.Button>
              <Radio.Button value="ar">العربية</Radio.Button>
            </Radio.Group>
          </Col>
        </Row>
      </Card>

      {/* Form */}
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          dustLevel: 1,
          location: 'cairo',
          installationYear: new Date().getFullYear()
        }}
      >
        {/* Machine Information */}
        <Card
          title={
            <Space>
              <ExperimentOutlined />
              <span>{t('Machine Information', 'معلومات الآلة')}</span>
            </Space>
          }
          size="small"
          style={{ marginBottom: 16 }}
        >
          <Form.Item
            name="machineModel"
            label={t('Machine Model', 'طراز الآلة')}
            rules={[{ required: true, message: t('Please select machine model', 'يرجى اختيار طراز الآلة') }]}
          >
            <Select placeholder={t('Select Model', 'اختر الطراز')} size="large">
              <Option value="AIM_4410">YILMAZ AIM 4410</Option>
              <Option value="AIM_7510">YILMAZ AIM 7510</Option>
              <Option value="ALM_6510">YILMAZ ALM 6510</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="machineSerial"
            label={t('Serial Number', 'الرقم التسلسلي')}
            rules={[{ required: true, message: t('Please enter serial number', 'يرجى إدخال الرقم التسلسلي') }]}
          >
            <Input placeholder={t('e.g., YIL-2024-12345', 'مثال: YIL-2024-12345')} size="large" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="installationYear"
                label={t('Installation Year', 'سنة التركيب')}
              >
                <InputNumber
                  min={2000}
                  max={new Date().getFullYear()}
                  style={{ width: '100%' }}
                  placeholder="2024"
                  size="large"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="operatingHours"
                label={t('Operating Hours', 'ساعات التشغيل')}
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  placeholder="12000"
                  size="large"
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="location"
            label={t('Location', 'الموقع')}
            rules={[{ required: true }]}
          >
            <Select placeholder={t('Select Location', 'اختر الموقع')} size="large">
              <Option value="cairo">{t('Cairo', 'القاهرة')}</Option>
              <Option value="giza">{t('Giza', 'الجيزة')}</Option>
              <Option value="alexandria">{t('Alexandria', 'الإسكندرية')}</Option>
              <Option value="suez">{t('Suez', 'السويس')}</Option>
              <Option value="port_said">{t('Port Said', 'بورسعيد')}</Option>
              <Option value="other">{t('Other', 'آخر')}</Option>
            </Select>
          </Form.Item>
        </Card>

        {/* Manual Sensor Readings */}
        <Card
          title={
            <Space>
              <ThunderboltOutlined />
              <span>{t('Manual Sensor Readings', 'قراءات المستشعرات اليدوية')}</span>
            </Space>
          }
          size="small"
          style={{ marginBottom: 16 }}
        >
          <Alert
            message={t(
              'Take readings with machine STOPPED and SAFE',
              'خذ القراءات مع الآلة متوقفة وآمنة'
            )}
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Form.Item
            name="hydraulicPressureBar"
            label={
              <Space>
                <span>{t('Hydraulic Pressure (bar)', 'الضغط الهيدروليكي (بار)')}</span>
                <Tag color="blue">{t('Normal: 140-160', 'عادي: 140-160')}</Tag>
              </Space>
            }
          >
            <InputNumber
              min={0}
              max={200}
              style={{ width: '100%' }}
              placeholder="150"
              size="large"
              suffix="bar"
            />
          </Form.Item>

          <Form.Item
            name="spindleTempCelsius"
            label={
              <Space>
                <FireOutlined />
                <span>{t('Spindle Temperature (°C)', 'درجة حرارة المحور (°م)')}</span>
                <Tag color="orange">{t('Normal: <70', 'عادي: <70')}</Tag>
              </Space>
            }
          >
            <InputNumber
              min={0}
              max={150}
              style={{ width: '100%' }}
              placeholder="65"
              size="large"
              suffix="°C"
            />
          </Form.Item>

          <Form.Item
            name="inputVoltage"
            label={
              <Space>
                <ThunderboltOutlined />
                <span>{t('Input Voltage (V)', 'جهد الدخل (فولت)')}</span>
                <Tag color="green">{t('Normal: 220±10', 'عادي: 220±10')}</Tag>
              </Space>
            }
          >
            <InputNumber
              min={150}
              max={300}
              style={{ width: '100%' }}
              placeholder="220"
              size="large"
              suffix="V"
            />
          </Form.Item>

          <Form.Item
            name="ambientTempCelsius"
            label={t('Ambient Temperature (°C)', 'درجة الحرارة المحيطة (°م)')}
          >
            <InputNumber
              min={0}
              max={60}
              style={{ width: '100%' }}
              placeholder="30"
              size="large"
              suffix="°C"
            />
          </Form.Item>

          <Form.Item
            name="dustLevel"
            label={
              <Space>
                <WarningOutlined />
                <span>{t('Dust Level (Visual Assessment)', 'مستوى الغبار (تقييم بصري)')}</span>
              </Space>
            }
          >
            <Slider
              min={1}
              max={5}
              marks={dustLevelMarks}
              step={1}
              value={dustLevel}
              onChange={setDustLevel}
            />
          </Form.Item>
        </Card>

        {/* Observed Symptoms */}
        <Card
          title={
            <Space>
              <WarningOutlined />
              <span>{t('Observed Symptoms', 'الأعراض الملحوظة')}</span>
            </Space>
          }
          size="small"
          style={{ marginBottom: 16 }}
        >
          <Form.Item
            name="symptoms"
            label={t('Symptoms (comma-separated)', 'الأعراض (مفصولة بفواصل)')}
            extra={t(
              'e.g., vibration increase, thermal shutdown, positioning error',
              'مثال: زيادة الاهتزاز، إيقاف حراري، خطأ في الموضع'
            )}
          >
            <TextArea
              rows={4}
              placeholder={t(
                'vibration increase, thermal shutdown, positioning error',
                'زيادة الاهتزاز، إيقاف حراري، خطأ في الموضع'
              )}
            />
          </Form.Item>
        </Card>

        {/* Evidence Collection */}
        <Card
          title={
            <Space>
              <CameraOutlined />
              <span>{t('Evidence Collection', 'جمع الأدلة')}</span>
            </Space>
          }
          size="small"
          style={{ marginBottom: 16 }}
        >
          <Form.Item
            label={t('Photo Evidence', 'أدلة الصور')}
            extra={t('Upload photos of the issue. Saved locally first.', 'حمل صور للمشكلة. تحفظ محليا أولا.')}
          >
            <Upload
              listType="picture-card"
              fileList={fileList}
              onChange={({ fileList }) => setFileList(fileList)}
              beforeUpload={() => false} // Prevent auto upload, keep local
            >
              {fileList.length < 3 && (
                <div>
                  <CameraOutlined />
                  <div style={{ marginTop: 8 }}>{t('Upload', 'تحميل')}</div>
                </div>
              )}
            </Upload>
          </Form.Item>

          <Divider dashed />

          <Form.Item
            label={t('Voice Note', 'ملاحظة صوتية')}
            extra={t('Record a brief description of the noise or issue.', 'سجل وصفا موجزا للضوضاء أو المشكلة.')}
          >
            <Button
              icon={<AudioOutlined />}
              danger={isRecording}
              onClick={() => {
                if (isRecording) {
                  setIsRecording(false);
                  message.success(t('Voice note saved locally', 'تم حفظ الملاحظة الصوتية محليا'));
                } else {
                  setIsRecording(true);
                  message.info(t('Recording... Click to stop', 'جاري التسجيل... انقر للإيقاف'));
                }
              }}
            >
              {isRecording ? t('Stop Recording', 'إيقاف التسجيل') : t('Record Voice Note', 'تسجيل ملاحظة صوتية')}
            </Button>
            {/* Visual indicator for recorded note */}
            {!isRecording && Math.random() > 0.9 && ( // Just a placeholder state for demo
              <span style={{ marginLeft: 12 }}>
                <CheckCircleOutlined style={{ color: '#52c41a' }} /> 1 {t('note saved', 'ملاحظة محفوظة')}
              </span>
            )}
          </Form.Item>
        </Card>

        {/* Submit Button */}
        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={loading}
            icon={<CheckCircleOutlined />}
            style={{ height: 56 }}
          >
            {t('Generate Advisory (Tier 2 Validation)', 'توليد استشارة (التحقق من الطبقة 2)')}
          </Button>
        </Form.Item>
      </Form>

      {/* Error Display */}
      {error && (
        <Alert
          message={t('Error', 'خطأ')}
          description={error}
          type="error"
          showIcon
          closable
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Advisory Display */}
      {advisory && (
        <Card
          title={
            <Space>
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              <span>{t('Advisory Generated', 'تم توليد الاستشارة')}</span>
            </Space>
          }
          extra={renderUrgencyBadge(advisory.urgency)}
          style={{ marginTop: 16 }}
        >
          {/* Constitutional Disclaimer */}
          <Alert
            message={t('AICS-001 Advisory Disclaimer', 'إخلاء مسؤولية AICS-001')}
            description={advisory.constitutionalDisclaimer}
            type="info"
            showIcon
            style={{ marginBottom: 16, fontSize: 11 }}
          />

          {/* Confidence & Metadata */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={12}>
              <Text strong>{t('Confidence:', 'الثقة:')}</Text> {(advisory.confidence * 100).toFixed(0)}%
            </Col>
            <Col span={12}>
              <Text strong>{t('Downtime:', 'وقت التوقف:')}</Text> {advisory.estimatedDowntimeHours}h
            </Col>
          </Row>

          {/* Suggestion */}
          <Divider orientation="left">{t('Suggestion', 'الاقتراح')}</Divider>
          <Paragraph style={{ whiteSpace: 'pre-wrap', direction: selectedLanguage === 'ar' ? 'rtl' : 'ltr' }}>
            {selectedLanguage === 'ar' ? advisory.suggestionAr : advisory.suggestionEn}
          </Paragraph>

          {/* Preventive Actions */}
          {(selectedLanguage === 'ar' ? advisory.preventiveActionsAr : advisory.preventiveActionsEn).length > 0 && (
            <>
              <Divider orientation="left">{t('Preventive Actions', 'الإجراءات الوقائية')}</Divider>
              <ul style={{ direction: selectedLanguage === 'ar' ? 'rtl' : 'ltr' }}>
                {(selectedLanguage === 'ar' ? advisory.preventiveActionsAr : advisory.preventiveActionsEn).map((action, index) => (
                  <li key={index}>{action}</li>
                ))}
              </ul>
            </>
          )}

          {/* Recommended Parts */}
          {advisory.recommendedParts.length > 0 && (
            <>
              <Divider orientation="left">{t('Required Parts', 'القطع المطلوبة')}</Divider>
              <Space direction="vertical" style={{ width: '100%' }}>
                {advisory.recommendedParts.map((part, index) => (
                  <Card key={index} size="small" style={{ background: '#f5f5f5' }}>
                    <Row justify="space-between" align="middle">
                      <Col>
                        <Text strong style={{ direction: selectedLanguage === 'ar' ? 'rtl' : 'ltr' }}>
                          {selectedLanguage === 'ar' ? part.nameAr : part.nameEn}
                        </Text>
                        <br />
                        <Text type="secondary">{part.partNumber}</Text>
                        {part.critical && <Tag color="red" style={{ marginLeft: 8 }}>{t('CRITICAL', 'حرج')}</Tag>}
                      </Col>
                      <Col>
                        <Text strong style={{ fontSize: 16 }}>
                          {part.priceEGP.toLocaleString(selectedLanguage === 'ar' ? 'ar-EG' : 'en-EG')} {t('EGP', 'جنيه')}
                        </Text>
                        <br />
                        <Text type="secondary">
                          <ClockCircleOutlined /> {part.leadTimeDays} {t('days', 'أيام')}
                        </Text>
                      </Col>
                    </Row>
                  </Card>
                ))}
                <Card size="small" style={{ background: '#e6f7ff', borderColor: '#1890ff' }}>
                  <Row justify="space-between">
                    <Col>
                      <Text strong>{t('Total Cost:', 'التكلفة الإجمالية:')}</Text>
                    </Col>
                    <Col>
                      <Text strong style={{ fontSize: 18, color: '#1890ff' }}>
                        {advisory.totalCostEGP.toLocaleString(selectedLanguage === 'ar' ? 'ar-EG' : 'en-EG')} {t('EGP', 'جنيه')}
                      </Text>
                    </Col>
                  </Row>
                </Card>
              </Space>
            </>
          )}

          {/* Seasonal Warning */}
          {advisory.seasonalWarningEn && (
            <Alert
              message={t('Seasonal Alert', 'تنبيه موسمي')}
              description={selectedLanguage === 'ar' ? advisory.seasonalWarningAr : advisory.seasonalWarningEn}
              type="warning"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}

          {/* Advisory Metadata */}
          <Divider />
          <Row gutter={16} style={{ fontSize: 11, color: '#888' }}>
            <Col span={12}>
              <Text type="secondary">{t('Advisory ID:', 'معرف الاستشارة:')}</Text>
              <br />
              <Text code>{advisory.advisoryId}</Text>
            </Col>
            <Col span={12}>
              <Text type="secondary">{t('Timestamp:', 'الطابع الزمني:')}</Text>
              <br />
              <Text code>{new Date(advisory.advisoryTimestamp).toLocaleString()}</Text>
            </Col>
          </Row>

          {/* Next Steps */}
          <Divider />
          <Alert
            message={t('Next Steps', 'الخطوات التالية')}
            description={t(
              'This advisory requires human validation. A YILMAZ-certified technician must review and approve before creating a service ticket or ordering parts.',
              'تتطلب هذه الاستشارة التحقق من صحة الإنسان. يجب على فني معتمد من YILMAZ المراجعة والموافقة قبل إنشاء تذكرة خدمة أو طلب قطع.'
            )}
            type="info"
            showIcon
          />
        </Card>
      )}
    </div>
  );
};

export default TechChecklist;
