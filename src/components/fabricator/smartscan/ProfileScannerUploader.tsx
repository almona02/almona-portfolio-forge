import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Collapse,
  Descriptions,
  InputNumber,
  Modal,
  Progress,
  Space,
  Tag,
  Tooltip,
  Typography,
  Upload,
  notification,
} from "antd";
import {
  CheckCircleOutlined,
  DownloadOutlined,
  EyeOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  ScanOutlined,
  UploadOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { scanProfileImage } from "@/services/scanApi";
import type {
  ProfileScanResult,
  ScaleDetectionResult,
} from "@/types/scan";

const { Text } = Typography;
const { Panel } = Collapse;

interface ScaleSuggestionModalProps {
  visible: boolean;
  scaleDetection: ScaleDetectionResult;
  onConfirm: (scale: number) => void;
  onManual: () => void;
  onCancel: () => void;
}

const ScaleSuggestionModal: React.FC<ScaleSuggestionModalProps> = ({
  visible,
  scaleDetection,
  onConfirm,
  onManual,
  onCancel,
}) => {
  const { scale_mm_per_px, confidence, detected_label, suggestion_text, debug_info } =
    scaleDetection;

  const isHighConfidence = (confidence || 0) > 0.8;
  const isMediumConfidence = (confidence || 0) >= 0.6 && (confidence || 0) <= 0.8;

  const getConfidenceColor = () => {
    if (isHighConfidence) return "success";
    if (isMediumConfidence) return "warning";
    return "error";
  };

  const getConfidenceText = () => {
    const conf = (confidence || 0) * 100;
    if (isHighConfidence) return `High (${conf.toFixed(0)}%)`;
    if (isMediumConfidence) return `Medium (${conf.toFixed(0)}%)`;
    return `Low (${conf.toFixed(0)}%)`;
  };

  return (
    <Modal
      title={
        <Space>
          {isHighConfidence ? (
            <CheckCircleOutlined style={{ color: "#52c41a" }} />
          ) : isMediumConfidence ? (
            <WarningOutlined style={{ color: "#faad14" }} />
          ) : (
            <WarningOutlined style={{ color: "#ff4d4f" }} />
          )}
          <span>Scale Detection Result</span>
        </Space>
      }
      open={visible}
      width={600}
      onCancel={onCancel}
      footer={[
        <Button key="manual" onClick={onManual}>
          Enter Scale Manually
        </Button>,
        <Button
          key="confirm"
          type="primary"
          onClick={() => scale_mm_per_px && onConfirm(scale_mm_per_px)}
          icon={isHighConfidence ? <CheckCircleOutlined /> : <WarningOutlined />}
        >
          {isHighConfidence ? "Apply Auto-Detected Scale" : "Use Detected Scale"}
        </Button>,
      ]}
    >
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Card size="small">
          <Descriptions column={1} size="small">
            <Descriptions.Item label="Detected Scale">
              <Space>
                <Text strong style={{ fontSize: "16px" }}>
                  {scale_mm_per_px?.toFixed(6)} mm/px
                </Text>
                <Tag color={getConfidenceColor()}>{getConfidenceText()}</Tag>
              </Space>
            </Descriptions.Item>
            {detected_label && (
              <Descriptions.Item label="Reference Label">
                <Tag color="blue">{detected_label} mm</Tag>
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Suggestion">
              <Text
                type={
                  isHighConfidence
                    ? "success"
                    : isMediumConfidence
                    ? "warning"
                    : "danger"
                }
              >
                {suggestion_text || "No suggestion available"}
              </Text>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Alert
          message="What this means:"
          description={
            isHighConfidence
              ? "The AI detected a scale with high confidence. You can safely apply it automatically."
              : isMediumConfidence
              ? "The AI detected a scale with moderate confidence. Please verify the detected value before applying."
              : "The AI detected a scale with low confidence. Manual verification is recommended."
          }
          type={isHighConfidence ? "success" : isMediumConfidence ? "warning" : "error"}
          showIcon
        />

        {debug_info && (
          <Collapse size="small">
            <Panel header="Advanced Details" key="debug">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Samples">
                  {debug_info.samples || 0}
                </Descriptions.Item>
                <Descriptions.Item label="Detected Dimensions">
                  {debug_info.dimensions || 0}
                </Descriptions.Item>
                <Descriptions.Item label="Lines">
                  {debug_info.lines || 0}
                </Descriptions.Item>
                <Descriptions.Item label="Associations">
                  {debug_info.associations || 0}
                </Descriptions.Item>
                {debug_info.method && (
                  <Descriptions.Item label="Method">
                    {debug_info.method}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Panel>
          </Collapse>
        )}
      </Space>
    </Modal>
  );
};

interface ProfileScannerUploaderProps {
  authToken?: string;
  baseUrl?: string;
  onScanSuccess?: (result: ProfileScanResult) => void;
  includeDebugOverlay?: boolean;
}

export function ProfileScannerUploader({
  authToken,
  baseUrl,
  onScanSuccess,
  includeDebugOverlay = true,
}: ProfileScannerUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [scaleFactor, setScaleFactor] = useState<number | null>(0.1);
  const [autoDetectScale, setAutoDetectScale] = useState(true);
  const [result, setResult] = useState<ProfileScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [showScaleSuggestion, setShowScaleSuggestion] = useState(false);
  const [scaleSuggestion, setScaleSuggestion] = useState<ScaleDetectionResult | null>(
    null,
  );
  const [manualScaleMode, setManualScaleMode] = useState(false);

  const uploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setResult(null);
    setError(null);
    setProgress(0);
    setScaleSuggestion(null);
    setShowScaleSuggestion(false);
    setManualScaleMode(false);
  }, [file]);

  useEffect(() => {
    if (result?.scaleDetection && autoDetectScale) {
      const detection = result.scaleDetection;
      if (detection.detected) {
        const confidence = detection.confidence || 0;
        if (confidence > 0.8) {
          handleHighConfidenceDetection(detection);
        } else if (confidence >= 0.6) {
          setScaleSuggestion(detection);
          setShowScaleSuggestion(true);
        } else {
          notification.warning({
            message: "Low Confidence Detection",
            description:
              detection.suggestion_text ||
              "AI detected a scale with low confidence. Please enter scale manually.",
            duration: 5,
          });
          setManualScaleMode(true);
        }
      } else {
        notification.info({
          message: "No Scale Detected",
          description: "AI could not detect a scale. Please enter scale manually.",
          duration: 5,
        });
        setManualScaleMode(true);
      }
    }
  }, [result, autoDetectScale]);

  const handleHighConfidenceDetection = (detection: ScaleDetectionResult) => {
    if (detection.scale_mm_per_px) {
      setScaleFactor(detection.scale_mm_per_px);
      notification.success({
        message: "Scale Auto-Detected",
        description: `High confidence scale applied: ${detection.scale_mm_per_px.toFixed(
          6,
        )} mm/px`,
        duration: 3,
      });
    }
  };

  const handleFileSelect = (incoming: File) => {
    if (!incoming.type.startsWith("image/")) {
      notification.error({
        message: "Invalid File",
        description: "Please upload an image file (JPG, PNG, etc.)",
      });
      return false;
    }
    setFile(incoming);
    return true;
  };

  const handleScan = async () => {
    if (!file) {
      notification.error({
        message: "No File Selected",
        description: "Please select an image file first",
      });
      return;
    }
    setUploading(true);
    setError(null);
    setProgress(0);

    try {
      const formProgress = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(formProgress);
            return prev;
          }
          return prev + 10;
        });
      }, 250);

      const scanResult = await scanProfileImage(file, {
        authToken,
        baseUrl,
        autoDetectScale,
        includeDebugOverlay,
        scaleFactor:
          (!autoDetectScale || manualScaleMode) && scaleFactor ? scaleFactor : undefined,
      });

      clearInterval(formProgress);
      setProgress(100);
      setResult(scanResult);
      onScanSuccess?.(scanResult);
      setTimeout(() => setProgress(0), 500);
    } catch (err: any) {
      setError(err.message);
      notification.error({
        message: "Scan Failed",
        description: err.message,
        duration: 6,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleScaleSuggestionConfirm = (scale: number) => {
    setScaleFactor(scale);
    setShowScaleSuggestion(false);
    setScaleSuggestion(null);
    notification.success({
      message: "Scale Applied",
      description: `Using detected scale: ${scale.toFixed(6)} mm/px`,
      duration: 3,
    });
    setManualScaleMode(false);
  };

  const handleScaleSuggestionManual = () => {
    setShowScaleSuggestion(false);
    setManualScaleMode(true);
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setScaleFactor(0.1);
    setAutoDetectScale(true);
    setManualScaleMode(false);
    if (uploadRef.current) {
      uploadRef.current.value = "";
    }
  };

  const handleDownloadSVG = () => {
    const url =
      result?.storageUrls?.svg_url ||
      result?.storage?.svg_url ||
      result?.storage?.original_url;
    if (url) {
      window.open(url, "_blank");
    } else {
      notification.warning({
        message: "SVG Not Available",
        description: "SVG file URL not found in results",
      });
    }
  };

  const handleViewDebug = () => {
    const url = result?.storageUrls?.debug_overlay_url || result?.storage?.debug_overlay_url;
    if (url) {
      window.open(url, "_blank");
    }
  };

  return (
    <Card
      title={
        <Space>
          <ScanOutlined />
          <span>AI-Assisted Engineering Drawing Scanner</span>
          <Tag color="blue">BETA</Tag>
        </Space>
      }
      extra={
        result && (
          <Space>
            {result.storageUrls?.svg_url && (
              <Button icon={<DownloadOutlined />} onClick={handleDownloadSVG} size="small">
                Download SVG
              </Button>
            )}
            {result.storageUrls?.debug_overlay_url && (
              <Button icon={<EyeOutlined />} onClick={handleViewDebug} size="small">
                View Debug
              </Button>
            )}
            <Button icon={<ReloadOutlined />} onClick={handleReset} size="small">
              New Scan
            </Button>
          </Space>
        )
      }
      style={{ maxWidth: 900, margin: "0 auto" }}
    >
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {!file ? (
          <Card size="small" title="1. Select Image">
            <Upload.Dragger
              accept="image/*"
              beforeUpload={handleFileSelect}
              showUploadList={false}
              maxCount={1}
            >
              <Space direction="vertical" size="middle" style={{ padding: "40px 0" }}>
                <UploadOutlined style={{ fontSize: 48, color: "#1890ff" }} />
                <Text strong>Click or drag image to upload</Text>
                <Text type="secondary">
                  Supported formats: JPG, PNG, BMP (export PDF/DWG/DXF to image)
                </Text>
                <Text type="secondary">Max size: 10MB; one drawing at a time</Text>
              </Space>
            </Upload.Dragger>
            <input
              type="file"
              ref={uploadRef}
              style={{ display: "none" }}
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            />
          </Card>
        ) : (
          <Card size="small" title="Selected File">
            <Space align="start">
              <Text strong>{file.name}</Text>
              <Text type="secondary">({(file.size / 1024 / 1024).toFixed(2)} MB)</Text>
              <Button size="small" onClick={() => setFile(null)}>
                Change
              </Button>
            </Space>
          </Card>
        )}

        {file && !result && (
          <Card size="small" title="2. Scale Configuration">
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              <Space>
                <input
                  type="checkbox"
                  id="autoDetectScale"
                  checked={autoDetectScale}
                  onChange={(e) => {
                    setAutoDetectScale(e.target.checked);
                    setManualScaleMode(false);
                  }}
                  disabled={uploading}
                />
                <label htmlFor="autoDetectScale">
                  <Space size="small">
                    <Text strong>Auto-detect scale from drawing</Text>
                    <Tooltip title="AI will attempt to detect scale from dimension labels in the image">
                      <InfoCircleOutlined style={{ color: "#1890ff" }} />
                    </Tooltip>
                  </Space>
                </label>
              </Space>

              {(!autoDetectScale || manualScaleMode) && (
                <Space direction="vertical" size="small" style={{ width: "100%" }}>
                  <Space>
                    <Text strong>Manual Scale Factor:</Text>
                    <Text type="secondary">(mm per pixel)</Text>
                  </Space>
                  <InputNumber
                    value={scaleFactor ?? undefined}
                    onChange={(value) => setScaleFactor(value ?? null)}
                    min={0.001}
                    max={1.0}
                    step={0.01}
                    precision={6}
                    style={{ width: 200 }}
                    disabled={uploading}
                    addonAfter="mm/px"
                  />
                  <Text type="secondary">
                    Example: 0.1 means 1 pixel = 0.1 mm (common for engineering drawings)
                  </Text>
                </Space>
              )}

              {autoDetectScale && !manualScaleMode && (
                <Alert
                  message="AI Scale Detection Active"
                  description="The system will attempt to detect scale from dimension labels. If successful, you'll be prompted to confirm."
                  type="info"
                  showIcon
                />
              )}
            </Space>
          </Card>
        )}

        {uploading && (
          <Card size="small">
            <Space direction="vertical" style={{ width: "100%" }}>
              <Text strong>Processing...</Text>
              <Progress percent={progress} status="active" />
              <Text type="secondary">
                {progress < 30 && "Uploading image..."}
                {progress >= 30 && progress < 60 && "Running OCR..."}
                {progress >= 60 && progress < 90 && "Detecting scale..."}
                {progress >= 90 && "Vectorizing profile..."}
              </Text>
            </Space>
          </Card>
        )}

        {error && (
          <Alert
            message="Scan Error"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
          />
        )}

        {result && (
          <Card size="small" title="3. Scan Results">
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              <Alert
                message="Scale Applied"
                description={
                  <Space direction="vertical" size="small">
                    <Text strong>
                      {result.dimensions.scale_used?.toFixed(6) ?? "N/A"} mm/px
                    </Text>
                    <Text type="secondary">
                      {result.scaleDetection?.detected ? "Detected by AI" : "Manually specified"}
                    </Text>
                  </Space>
                }
                type="success"
                showIcon
              />

              {result.qualityFlags && (
                <Card size="small" title="Quality Assessment">
                  <Descriptions column={2} size="small">
                    <Descriptions.Item label="Auto-scale detected">
                      {result.qualityFlags.auto_scale_detected ? (
                        <Tag color="green">Yes</Tag>
                      ) : (
                        <Tag color="red">No</Tag>
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="Properly scaled">
                      {result.qualityFlags.is_properly_scaled ? (
                        <Tag color="green">Yes</Tag>
                      ) : (
                        <Tag color="red">No</Tag>
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="Dimension labels">
                      {result.qualityFlags.has_dimension_labels ? (
                        <Tag color="green">Present</Tag>
                      ) : (
                        <Tag color="red">Missing</Tag>
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item label="Image quality">
                      {result.qualityFlags.is_high_contrast ? (
                        <Tag color="green">Good</Tag>
                      ) : (
                        <Tag color="orange">Fair</Tag>
                      )}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>
              )}

              {result.dimensions.mm && Object.keys(result.dimensions.mm).length > 0 && (
                <Card size="small" title="Extracted Dimensions (mm)">
                  <Space wrap>
                    {Object.entries(result.dimensions.mm).map(([key, value]) => (
                      <Tag key={key} color="blue">
                        {key}: {Number(value).toFixed(2)}mm
                      </Tag>
                    ))}
                  </Space>
                </Card>
              )}

              <Card size="small" title="Performance">
                <Descriptions column={2} size="small">
                  <Descriptions.Item label="Processing Time">
                    {result.processing_time_ms ?? "N/A"} ms
                  </Descriptions.Item>
                  <Descriptions.Item label="Timestamp">
                    {result.timestamp
                      ? new Date(result.timestamp).toLocaleString()
                      : "N/A"}
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              <Collapse size="small">
                <Panel header="View Raw API Response" key="raw">
                  <pre style={{ fontSize: "12px", maxHeight: "300px", overflow: "auto" }}>
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </Panel>
              </Collapse>
            </Space>
          </Card>
        )}

        {file && !uploading && !result && (
          <Space style={{ width: "100%", justifyContent: "center" }}>
            <Button
              type="primary"
              icon={<ScanOutlined />}
              onClick={handleScan}
              loading={uploading}
              size="large"
              style={{ minWidth: 200 }}
            >
              {autoDetectScale ? "Scan with AI Detection" : "Scan with Manual Scale"}
            </Button>
          </Space>
        )}

        {result && (
          <Space style={{ width: "100%", justifyContent: "center" }}>
            <Button onClick={handleReset} icon={<ReloadOutlined />}>
              Scan Another Drawing
            </Button>
          </Space>
        )}
      </Space>

      {scaleSuggestion && (
        <ScaleSuggestionModal
          visible={showScaleSuggestion}
          scaleDetection={scaleSuggestion}
          onConfirm={handleScaleSuggestionConfirm}
          onManual={handleScaleSuggestionManual}
          onCancel={() => {
            setShowScaleSuggestion(false);
            setManualScaleMode(true);
          }}
        />
      )}
    </Card>
  );
}

export default ProfileScannerUploader;

