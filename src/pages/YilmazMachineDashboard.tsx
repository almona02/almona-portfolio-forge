/**
 * @tier Tier 2 (Advisory Presentation)
 * @constitutional_compliance AICS-001 §7 (Presentation layer)
 * @region Egypt-specific YILMAZ machine dashboard
 * 
 * GOVERNANCE:
 * - Displays simulated telemetry from YilmazTelemetrySimulator (Tier 1)
 * - Highlights active environmental alerts (Khamsin, Summer Heat) based on EGYPT_ENV_CONSTANTS
 * - Provides entry point to Technician Validation Workflow (TechChecklist)
 */

import {
    DashboardOutlined,
    LineChartOutlined,
    ReloadOutlined,
    ThunderboltOutlined,
    ToolOutlined,
    WarningOutlined
} from '@ant-design/icons';
import { Alert, Badge, Button, Card, Col, Divider, Drawer, Row, Space, Statistic, Tag, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TechChecklist from '../components/ticketing/yilmaz/mobile/TechChecklist';
import { YilmazSimulatedTelemetry, yilmazTelemetrySimulator } from '../services/ticketing/yilmaz/core/YilmazTelemetrySimulator';
import { EGYPT_ENV_CONSTANTS } from '../services/ticketing/yilmaz/rules/YilmazEgyptRules';

const { Title, Text } = Typography;

export const YilmazMachineDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [machines, setMachines] = useState<YilmazSimulatedTelemetry[]>([]);
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [selectedMachine, setSelectedMachine] = useState<YilmazSimulatedTelemetry | null>(null);

    // EGYPTIAN CONTEXT
    const currentMonth = new Date().getMonth();
    const isKhamsin = currentMonth >= EGYPT_ENV_CONSTANTS.KHAMSIN_SEASON_START && currentMonth <= EGYPT_ENV_CONSTANTS.KHAMSIN_SEASON_END;
    const isSummer = currentMonth >= 5 && currentMonth <= 8; // June-September

    useEffect(() => {
        refreshTelemetry();
        // Simulate real-time updates every 30 seconds
        const interval = setInterval(refreshTelemetry, 30000);
        return () => clearInterval(interval);
    }, []);

    const refreshTelemetry = () => {
        setLoading(true);
        // Simulate network delay for realism
        setTimeout(() => {
            const data = yilmazTelemetrySimulator.generateAllMachines();
            setMachines(data);
            setLastUpdated(new Date());
            setLoading(false);
        }, 500);
    };

    const handleMachineCheck = (machine: YilmazSimulatedTelemetry) => {
        setSelectedMachine(machine);
        setDrawerVisible(true);
    };

    const getStatusColor = (symptoms: string[]) => {
        if (symptoms.length === 0) return '#52c41a'; // Green
        if (symptoms.some(s => s.toLowerCase().includes('shutdown') || s.toLowerCase().includes('surge'))) return '#f5222d'; // Red
        return '#faad14'; // Orange
    };

    return (
        <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
            {/* HEADER */}
            <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
                <Col>
                    <Title level={2} style={{ margin: 0 }}>
                        <DashboardOutlined /> YILMAZ Predictive Monitor
                    </Title>
                    <Text type="secondary">Egypt Region • Real-time Telemetry Simulation</Text>
                </Col>
                <Col>
                    <Space>
                        <Button icon={<LineChartOutlined />} onClick={() => navigate('/yilmaz-analytics')}>
                            Analytics
                        </Button>
                        <Tag color="blue">{lastUpdated.toLocaleTimeString()}</Tag>
                        <Button icon={<ReloadOutlined />} onClick={refreshTelemetry} loading={loading}>
                            Refresh
                        </Button>
                    </Space>
                </Col>
            </Row>

            {/* CLIMATE ALERTS */}
            {isKhamsin && (
                <Alert
                    message="Khamsin Season Active"
                    description="High dust levels detected. Inspect cabinet air filters and spindle fans daily."
                    type="warning"
                    showIcon
                    icon={<WarningOutlined />}
                    style={{ marginBottom: 24, border: '1px solid #faad14' }}
                />
            )}
            {isSummer && (
                <Alert
                    message="Summer Heat Alert"
                    description="Ambient temperatures > 40°C. Monitor spindle cooling systems and servo drive thermal status."
                    type="error"
                    showIcon
                    icon={<FireOutlined />}
                    style={{ marginBottom: 24, border: '1px solid #ff4d4f' }}
                />
            )}

            {/* MACHINE GRID */}
            <Row gutter={[16, 16]}>
                {machines.map(machine => (
                    <Col xs={24} md={12} lg={8} key={machine.machineSerial}>
                        <Card
                            hoverable
                            title={
                                <Space>
                                    <Badge color={getStatusColor(machine.symptoms)} />
                                    <Text strong>{machine.machineModel}</Text>
                                </Space>
                            }
                            extra={<Tag>{machine.location.toUpperCase()}</Tag>}
                            actions={[
                                <Button type="link" icon={<ToolOutlined />} onClick={() => handleMachineCheck(machine)}>
                                    Technician Check
                                </Button>
                            ]}
                        >
                            <div style={{ textAlign: 'center', marginBottom: 16 }}>
                                <Statistic
                                    title="Input Voltage"
                                    value={machine.inputVoltage}
                                    suffix="V"
                                    valueStyle={{ color: machine.inputVoltage < 200 || machine.inputVoltage > 240 ? '#cf1322' : '#3f8600' }}
                                    prefix={<ThunderboltOutlined />}
                                />
                            </div>

                            <Row gutter={8}>
                                <Col span={12}>
                                    <Statistic title="Hydraulic" value={machine.hydraulicPressureBar} suffix="bar" valueStyle={{ fontSize: 16 }} />
                                </Col>
                                <Col span={12}>
                                    <Statistic title="Spindle" value={machine.spindleTempCelsius} suffix="°C" valueStyle={{ fontSize: 16 }} />
                                </Col>
                            </Row>

                            <Divider style={{ margin: '12px 0' }} />

                            <Space direction="vertical" style={{ width: '100%' }}>
                                <Row justify="space-between">
                                    <Text type="secondary">Dust Level:</Text>
                                    <Tag color={machine.dustLevel > 3 ? 'red' : 'green'}>{machine.dustLevel}/5</Tag>
                                </Row>
                                <Row justify="space-between">
                                    <Text type="secondary">Operating Hours:</Text>
                                    <Text>{machine.operatingHours.toLocaleString()} h</Text>
                                </Row>
                            </Space>

                            {machine.symptoms.length > 0 && (
                                <div style={{ marginTop: 12 }}>
                                    <Text type="danger" style={{ fontSize: 12 }}>
                                        <WarningOutlined /> {machine.symptoms.length} Issues Detected
                                    </Text>
                                    <div style={{ maxHeight: 60, overflowY: 'auto', marginTop: 4 }}>
                                        {machine.symptoms.slice(0, 2).map((s, i) => (
                                            <Tag color="red" key={i} style={{ display: 'block', marginBottom: 2 }}>{s}</Tag>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* TECHNICIAN CHECKLIST DRAWER */}
            <Drawer
                title={`Technician Check: ${selectedMachine?.machineModel}`}
                width={600}
                onClose={() => setDrawerVisible(false)}
                visible={drawerVisible}
                destroyOnClose
            >
                {selectedMachine && (
                    <TechChecklist
                        machineSerial={selectedMachine.machineSerial}
                        machineModel={selectedMachine.machineModel}
                        language="en" // Default to English, component handles toggle
                    />
                )}
            </Drawer>
        </div>
    );
};

// Simple FireOutlined icon component if not imported or available in older antd versions
const FireOutlined = () => <span role="img" aria-label="fire" className="anticon anticon-fire"><svg viewBox="64 64 896 896" focusable="false" data-icon="fire" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M834.1 469.2A347.49 347.49 0 00751.2 354l-29.1-26.7a8.09 8.09 0 00-13 3.3c-13 37.6-57.5 53.5-89.4 53.5-31.9 0-76.4-15.9-89.4-53.5a8.09 8.09 0 00-13-3.3l-29.1 26.7a347.49 347.49 0 00-82.9 115.2c-42.1 97.7-22.3 214.9 50.4 290.4a299.78 299.78 0 00216.4 92.5c82.2 0 160.1-33.1 216.4-92.5 72.7-75.5 92.5-192.7 50.4-290.4zM512 878c-65.4 0-128-26.2-173.8-72.9-45.7-46.7-65.7-111.4-54.8-177.3 11-66 50.4-124.8 107.6-161.5 5.7 68.7 57.6 122.9 121 122.9s115.3-54.2 121-122.9c57.3 36.7 96.6 95.5 107.6 161.5 10.9 65.9-9.1 130.6-54.8 177.3C640 851.8 577.4 878 512 878z"></path></svg></span>;

export default YilmazMachineDashboard;
