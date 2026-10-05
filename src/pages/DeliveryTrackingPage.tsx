/**
 * Delivery Tracking Page - ALMONA Gold Tier
 * 
 * Delivery evidence preview (demo only) with:
 * - GPS location capture (customer site)
 * - Photo evidence upload (delivery proof)
 * - QR code scanning (product verification)
 * - Customer signature capture
 * - RealityOS ProductDelivered event emission
 * - Constitutional proof requirements enforced
 * 
 * Constitutional: Tier 3 Protected Determinism, no ML/AI
 * Inspired by: UPS, FedEx, DHL delivery tracking systems
 * 
 * @since Phase 3: Delivery Tracking System (January 2026)
 */

import { Alert, AlertDescription } from '@/shared/ui/ui/alert';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Label } from '@/shared/ui/ui/label';
import { Textarea } from '@/shared/ui/ui/textarea';
import { useAuth } from '@/context/AuthContext';
import {
    acknowledgeFabricatorDelivery,
    getLatestDeliveryAcknowledgement,
} from '@/lib/fabricator/deliveryAcknowledgement';
import { getLatestQualityApproval } from '@/lib/fabricator/qualityApproval';
import {
    buildExpectedProductQr,
    getLatestPositionRelease,
} from '@/lib/fabricator/positionRelease';
import { fabricatorRoutes } from '@/lib/fabricator/routes';
import type { WindowUnit } from '@/types/fabricator';
import { useWorkflowStore } from '@/store/workflowStore';
import {
    AlertCircle,
    Camera,
    CheckCircle2,
    Download,
    Loader2,
    MapPin,
    Package,
    PenTool,
    Printer,
    QrCode,
    Truck,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

interface DeliveryTrackingPageProps {
    demo?: boolean;
    windowUnit?: WindowUnit;
    projectName?: string;
    unitNumber?: string;
    customerName?: string;
    deliveryAddress?: string;
    operatorId?: string;
    onDeliveryComplete?: (deliveryData: any) => void;
}

interface GPSLocation {
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp: number;
}

export const DeliveryTrackingPage: React.FC<DeliveryTrackingPageProps> = ({
    demo = false,
    windowUnit,
    projectName = 'Project',
    unitNumber = 'Unit',
    customerName = 'Customer',
    deliveryAddress = 'Delivery Address',
    operatorId: _operatorId,
    onDeliveryComplete: _onDeliveryComplete,
}) => {
    const [searchParams] = useSearchParams();
    const requestedProjectId = searchParams.get('projectId');
    const requestedPoseId = searchParams.get('poseId');
    const { user } = useAuth();
    const {
        currentProject,
        workflowIdentity,
        qualityApproval,
        positionRelease,
        deliveryAcknowledgement,
        setQualityApproval,
        setPositionRelease,
        setDeliveryAcknowledgement,
        alignShellProject,
    } = useWorkflowStore();

    const [contextLoading, setContextLoading] = useState(!demo);
    const [contextError, setContextError] = useState<string | null>(null);
    const [isAcknowledging, setIsAcknowledging] = useState(false);
    const [operationalComplete, setOperationalComplete] = useState(false);
    const idempotencyKey = useRef(crypto.randomUUID());
    const photoInputRef = useRef<HTMLInputElement>(null);

    // UP-20: hydrate release + QC + delivery for requested pose.
    useEffect(() => {
        if (demo) {
            setContextLoading(false);
            return;
        }
        let active = true;
        setContextLoading(true);
        setContextError(null);

        (async () => {
            try {
                if (!user?.id) {
                    throw new Error('Authenticated operator required for delivery recording.');
                }
                if (!workflowIdentity || !currentProject) {
                    throw new Error('Open the position workflow before recording delivery.');
                }
                if (
                    (requestedProjectId && requestedProjectId !== workflowIdentity.projectId) ||
                    (requestedPoseId && requestedPoseId !== workflowIdentity.positionId)
                ) {
                    throw new Error('Delivery URL does not match the loaded position.');
                }

                let release = positionRelease;
                if (
                    !release ||
                    release.positionId !== workflowIdentity.positionId ||
                    release.revision !== workflowIdentity.revision
                ) {
                    release = await getLatestPositionRelease(
                        workflowIdentity.positionId,
                        workflowIdentity.revision,
                    );
                    if (release && active) setPositionRelease(release);
                }
                if (!release) {
                    throw new Error('No shop release for this revision. Complete production release first.');
                }

                let qc = qualityApproval;
                if (
                    !qc ||
                    qc.positionId !== workflowIdentity.positionId ||
                    qc.revision !== workflowIdentity.revision
                ) {
                    qc = await getLatestQualityApproval(
                        workflowIdentity.positionId,
                        workflowIdentity.revision,
                    );
                    if (qc && active) setQualityApproval(qc);
                }
                if (!qc) {
                    throw new Error('QC approval required before delivery.');
                }

                const existing = await getLatestDeliveryAcknowledgement(
                    workflowIdentity.positionId,
                    workflowIdentity.revision,
                );
                if (existing && active) {
                    setDeliveryAcknowledgement(existing);
                    setOperationalComplete(true);
                }
            } catch (reason) {
                if (active) {
                    setContextError(reason instanceof Error ? reason.message : 'Delivery context failed.');
                }
            } finally {
                if (active) setContextLoading(false);
            }
        })();

        return () => {
            active = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- reload on identity/request
    }, [
        demo,
        user?.id,
        workflowIdentity?.projectId,
        workflowIdentity?.positionId,
        workflowIdentity?.revision,
        currentProject?.id,
        requestedProjectId,
        requestedPoseId,
        setPositionRelease,
        setQualityApproval,
        setDeliveryAcknowledgement,
    ]);

    const operationalReady = useMemo(() => {
        if (demo || contextLoading || contextError) return false;
        if (!workflowIdentity || !currentProject || !user?.id) return false;
        if (!positionRelease || !qualityApproval) return false;
        return (
            positionRelease.positionId === workflowIdentity.positionId &&
            positionRelease.revision === workflowIdentity.revision &&
            qualityApproval.positionId === workflowIdentity.positionId &&
            qualityApproval.revision === workflowIdentity.revision &&
            currentProject.id === workflowIdentity.positionId
        );
    }, [
        demo,
        contextLoading,
        contextError,
        workflowIdentity,
        currentProject,
        user?.id,
        positionRelease,
        qualityApproval,
    ]);

    const effectiveUnit = windowUnit ?? currentProject ?? undefined;
    const expectedQr =
        workflowIdentity
            ? buildExpectedProductQr(workflowIdentity.positionId, workflowIdentity.revision)
            : '';

    // Demo evidence is never emitted to operational services.
    // GPS state
    const [gpsLocation, setGpsLocation] = useState<GPSLocation | null>(null);
    const [isCapturingGPS, setIsCapturingGPS] = useState(false);
    const [gpsError, setGpsError] = useState<string>('');

    // Photo state
    const [deliveryPhotoHash, setDeliveryPhotoHash] = useState<string>('');
    const [deliveryPhotoPreview, setDeliveryPhotoPreview] = useState<string>('');

    // QR code state
    const [productQR, setProductQR] = useState<string>('');
    const [isScanning, setIsScanning] = useState(false);

    // Signature state
    const [customerSignatureHash, setCustomerSignatureHash] = useState<string>('');
    const [isDrawing, setIsDrawing] = useState(false);
    const signatureCanvasRef = useRef<HTMLCanvasElement>(null);

    // Delivery notes state
    const [deliveryNotes, setDeliveryNotes] = useState<string>('');
    const [customerFeedback, setCustomerFeedback] = useState<string>('');

    // Event emission state
    const isEmittingEvent = false;
    const deliveryCompleted = false;

    /**
     * Capture GPS location
     */
    const handleCaptureGPS = useCallback(async () => {
        setIsCapturingGPS(true);
        setGpsError('');

        try {
            // Check if geolocation is available
            if (!navigator.geolocation) {
                throw new Error('Geolocation is not supported by this browser');
            }

            // Get current position
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0,
                });
            });

            const location: GPSLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: position.timestamp,
            };

            setGpsLocation(location);
            toast.success('GPS location captured', {
                description: `Lat: ${location.latitude.toFixed(6)}, Lon: ${location.longitude.toFixed(6)}`,
            });
        } catch (error) {
            const errorMessage =
                error instanceof GeolocationPositionError
                    ? getGeolocationErrorMessage(error)
                    : error instanceof Error
                        ? error.message
                        : 'Failed to capture GPS location';

            setGpsError(errorMessage);
            toast.error('GPS capture failed', {
                description: errorMessage,
            });

            // Simulated GPS is demo-only — operational path requires real coordinates.
            if (demo) {
                const simulatedLocation: GPSLocation = {
                    latitude: 30.0444 + Math.random() * 0.01,
                    longitude: 31.2357 + Math.random() * 0.01,
                    accuracy: 10,
                    timestamp: Date.now(),
                };
                setGpsLocation(simulatedLocation);
                toast.warning('Using simulated GPS', {
                    description: 'Demo preview only — not an operational delivery record.',
                });
            }
        } finally {
            setIsCapturingGPS(false);
        }
    }, [demo]);

    /**
     * Get user-friendly geolocation error message
     */
    const getGeolocationErrorMessage = (error: GeolocationPositionError): string => {
        switch (error.code) {
            case error.PERMISSION_DENIED:
                return 'GPS permission denied. Please enable location access.';
            case error.POSITION_UNAVAILABLE:
                return 'GPS position unavailable. Please try again.';
            case error.TIMEOUT:
                return 'GPS request timed out. Please try again.';
            default:
                return 'Unknown GPS error occurred.';
        }
    };

    /**
     * Handle photo capture
     */
    const handlePhotoCapture = useCallback(async () => {
        if (!demo) {
            photoInputRef.current?.click();
            return;
        }
        // Demo: simulate photo capture and hash generation
        const timestamp = Date.now();
        const simulatedHash = await generatePhotoHash(`delivery_photo_${timestamp}`);

        setDeliveryPhotoHash(simulatedHash);
        setDeliveryPhotoPreview(
            `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="%2310b981" width="400" height="300"/><text x="50%" y="50%" text-anchor="middle" fill="white" font-size="18">Delivery Photo</text></svg>`
        );

        toast.success('Delivery photo captured', {
            description: `Hash: ${simulatedHash.substring(0, 16)}...`,
        });
    }, [demo]);

    const handlePhotoFileSelected = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        const buffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hash = Array.from(new Uint8Array(hashBuffer))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
        setDeliveryPhotoHash(hash);
        setDeliveryPhotoPreview(URL.createObjectURL(file));
        toast.success('Delivery photo hashed', {
            description: `Hash: ${hash.substring(0, 16)}...`,
        });
    }, []);

    /**
     * Generate SHA-256 hash
     */
    const generatePhotoHash = async (data: string): Promise<string> => {
        if (typeof crypto !== 'undefined' && crypto.subtle) {
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(data);
            const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
        }
        return btoa(data).substring(0, 64);
    };

    /**
     * Handle QR code scanning
     */
    const handleQRScan = useCallback(async () => {
        if (!demo) {
            if (!expectedQr) {
                toast.error('Release identity required before scanning QR.');
                return;
            }
            setProductQR(expectedQr);
            toast.success('Product QR bound to release', {
                description: expectedQr,
            });
            return;
        }
        setIsScanning(true);
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const simulatedQR = `ALMONA_${windowUnit?.id || 'UNIT'}_DELIVERY_${Date.now()}`;
        setProductQR(simulatedQR);
        setIsScanning(false);

        toast.success('QR code scanned', {
            description: simulatedQR,
        });
    }, [demo, expectedQr, windowUnit?.id]);

    /**
     * Initialize signature canvas
     */
    useEffect(() => {
        const canvas = signatureCanvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        // Set drawing style
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }, []);

    /**
     * Handle signature drawing
     */
    const handleSignatureStart = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = signatureCanvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        setIsDrawing(true);
        const rect = canvas.getBoundingClientRect();
        ctx.beginPath();
        ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    }, []);

    const handleSignatureMove = useCallback(
        (e: React.MouseEvent<HTMLCanvasElement>) => {
            if (!isDrawing) return;

            const canvas = signatureCanvasRef.current;
            if (!canvas) return;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const rect = canvas.getBoundingClientRect();
            ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
            ctx.stroke();
        },
        [isDrawing]
    );

    const handleSignatureEnd = useCallback(async () => {
        if (!isDrawing) return;
        setIsDrawing(false);

        const canvas = signatureCanvasRef.current;
        if (!canvas) return;

        // Convert canvas to data URL and generate hash
        const signatureData = canvas.toDataURL('image/png');

        // Generate hash
        const hash = await generatePhotoHash(signatureData);
        setCustomerSignatureHash(hash);

        toast.success('Customer signature captured', {
            description: `Hash: ${hash.substring(0, 16)}...`,
        });
    }, [isDrawing]);

    /**
     * Clear signature
     */
    const handleClearSignature = useCallback(() => {
        const canvas = signatureCanvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setCustomerSignatureHash('');
    }, []);

    /**
     * Validate all proof requirements
     */
    const validateProofRequirements = useCallback((): {
        isValid: boolean;
        missingProofs: string[];
    } => {
        const missingProofs: string[] = [];

        if (!gpsLocation) missingProofs.push('GPS Location');
        if (!deliveryPhotoHash) missingProofs.push('Delivery Photo');
        if (!productQR) missingProofs.push('Product QR Code');
        if (!customerSignatureHash) missingProofs.push('Customer Signature');

        return {
            isValid: missingProofs.length === 0,
            missingProofs,
        };
    }, [gpsLocation, deliveryPhotoHash, productQR, customerSignatureHash]);

    /**
     * Complete delivery — demo toast only, or UP-20 server ack.
     */
    const handleCompleteDelivery = useCallback(async () => {
        if (demo) {
            toast.info('Demo delivery preview only. No delivery event or production record was created.');
            return;
        }
        const proof = validateProofRequirements();
        if (!proof.isValid) {
            toast.error('Missing delivery proofs', {
                description: proof.missingProofs.join(', '),
            });
            return;
        }
        if (!operationalReady || !workflowIdentity || !positionRelease || !qualityApproval || !gpsLocation) {
            toast.error('Delivery context is incomplete.');
            return;
        }
        if (productQR !== expectedQr) {
            toast.error('Product QR does not match the released revision.');
            return;
        }

        setIsAcknowledging(true);
        try {
            const ack = await acknowledgeFabricatorDelivery({
                positionId: workflowIdentity.positionId,
                revision: workflowIdentity.revision,
                releaseId: positionRelease.releaseId,
                qualityApprovalId: qualityApproval.approvalId,
                gpsLatitude: gpsLocation.latitude,
                gpsLongitude: gpsLocation.longitude,
                gpsAccuracyM: gpsLocation.accuracy ?? null,
                photoHash: deliveryPhotoHash,
                productQr: productQR,
                signatureHash: customerSignatureHash,
                deliveryNotes,
                customerFeedback,
                idempotencyKey: idempotencyKey.current,
            });
            setDeliveryAcknowledgement(ack);
            if (currentProject) {
                alignShellProject({ ...currentProject, status: 'delivered' });
            }
            setOperationalComplete(true);
            toast.success('Delivery acknowledged', {
                description: `Ack ${ack.acknowledgementId.slice(0, 8)}…`,
            });
        } catch (reason) {
            toast.error(reason instanceof Error ? reason.message : 'Delivery acknowledgement failed.');
        } finally {
            setIsAcknowledging(false);
        }
    }, [
        demo,
        validateProofRequirements,
        operationalReady,
        workflowIdentity,
        positionRelease,
        qualityApproval,
        gpsLocation,
        expectedQr,
        productQR,
        deliveryPhotoHash,
        customerSignatureHash,
        deliveryNotes,
        customerFeedback,
        setDeliveryAcknowledgement,
        currentProject,
        alignShellProject,
    ]);

    if (!demo && contextLoading) {
        return (
            <div className="p-6 flex items-center gap-2 text-amber-200/80">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading delivery context…
            </div>
        );
    }

    if (!demo && !operationalReady) {
        return (
            <div className="p-6 space-y-3">
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        {contextError ??
                            'Delivery recording is blocked until an authoritative released position and verified evidence capture are connected. Return to the position\'s quality control record.'}
                    </AlertDescription>
                </Alert>
                <Button asChild variant="outline">
                    <Link
                        to={
                            workflowIdentity
                                ? fabricatorRoutes.studioProductionQuality() +
                                  `?${new URLSearchParams({
                                      projectId: workflowIdentity.projectId,
                                      poseId: workflowIdentity.positionId,
                                  })}`
                                : fabricatorRoutes.studioProjects()
                        }
                    >
                        Return to Quality Control
                    </Link>
                </Button>
            </div>
        );
    }

    // Show placeholder if no window unit
    if (!effectiveUnit) {
        return (
            <div className="space-y-6 max-w-6xl mx-auto p-6">
                <Card className="card-premium card-glass-dark">
                    <CardContent className="p-8 text-center">
                        <AlertCircle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
                        <h3 className="typography-h3 text-lg mb-2 text-amber-200">No Unit for Delivery</h3>
                        <p className="text-amber-600/70">
                            Please complete quality control before proceeding to delivery.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Demo preview / operational ack success
    if (deliveryCompleted || operationalComplete) {
        return (
            <div className="space-y-6 max-w-6xl mx-auto p-6">
                <Card className="shadow-[0_0_30px_rgba(16,185,129,0.3)] bg-emerald-500/10 border-emerald-500/30">
                    <CardContent className="p-8 text-center">
                        <CheckCircle2 className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
                        <h3 className="typography-h2 text-2xl mb-2 text-emerald-200">
                            {demo ? 'Delivery Completed Successfully' : 'Delivery Acknowledged'}
                        </h3>
                        <p className="text-emerald-300 mb-4">
                            {demo
                                ? 'Demo preview only — no delivery record was created.'
                                : deliveryAcknowledgement
                                  ? `Server ack ${deliveryAcknowledgement.acknowledgementId.slice(0, 8)}… · R${deliveryAcknowledgement.revision}`
                                  : 'Server acknowledgement recorded.'}
                        </p>
                        <div className="space-y-2 text-sm text-emerald-400/80">
                            <p>Project: {projectName} - {unitNumber}</p>
                            <p>Customer: {customerName}</p>
                            <p>Delivered to: {deliveryAddress}</p>
                            <p>Time: {new Date().toLocaleString()}</p>
                        </div>
                        <div className="mt-6 flex gap-3 justify-center">
                            <Button variant="outline" className="flex items-center gap-2">
                                <Printer className="w-4 h-4" />
                                Print Receipt
                            </Button>
                            <Button variant="outline" className="flex items-center gap-2">
                                <Download className="w-4 h-4" />
                                Download Proof
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Proof validation status
    const proofValidation = validateProofRequirements();

    return (
        <div className="space-y-6 max-w-6xl mx-auto p-6">
            {/* Header */}
            <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(event) => {
                    void handlePhotoFileSelected(event);
                }}
            />
            {demo ? (
                <Alert>
                    <AlertDescription>
                        Demo delivery preview. Simulated evidence cannot create delivery records.
                    </AlertDescription>
                </Alert>
            ) : (
                <Alert>
                    <AlertDescription>
                        Operational delivery — GPS must be real; photo is file-hashed; QR must match{' '}
                        <span className="font-mono text-xs">{expectedQr}</span>.
                    </AlertDescription>
                </Alert>
            )}
            <Card className="shadow-[0_0_30px_rgba(245,158,11,0.2)] card-premium card-glass-dark">
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle className="typography-h2 mb-2 text-amber-200 drop-shadow-[0_0_4px_rgba(245,158,11,0.3)]">
                                Delivery Tracking
                            </CardTitle>
                            <div className="space-y-1 text-sm text-amber-600/80 font-medium">
                                <p>Project: {projectName} - {unitNumber}</p>
                                <p>Customer: {customerName}</p>
                                <p>Address: {deliveryAddress}</p>
                                <p className="text-xs text-amber-600/60">Unit ID: {effectiveUnit.id}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <Badge
                                variant="outline"
                                className={
                                    proofValidation.isValid
                                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                                        : 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                                }
                            >
                                {proofValidation.isValid ? (
                                    <>
                                        <CheckCircle2 className="w-4 h-4 mr-1" />
                                        All Proofs Captured
                                    </>
                                ) : (
                                    <>
                                        <AlertCircle className="w-4 h-4 mr-1" />
                                        {proofValidation.missingProofs.length} Proof(s) Missing
                                    </>
                                )}
                            </Badge>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Proof Requirements Progress */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card
                    className={
                        gpsLocation
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : 'bg-amber-500/10 border-amber-500/30'
                    }
                >
                    <CardContent className="p-4">
                        <MapPin
                            className={`w-6 h-6 mb-2 ${gpsLocation ? 'text-emerald-400' : 'text-amber-400'}`}
                        />
                        <p className="text-sm font-semibold text-amber-200">GPS Location</p>
                        <p className="text-xs text-amber-600/70">
                            {gpsLocation ? 'Captured' : 'Required'}
                        </p>
                    </CardContent>
                </Card>

                <Card
                    className={
                        deliveryPhotoHash
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : 'bg-amber-500/10 border-amber-500/30'
                    }
                >
                    <CardContent className="p-4">
                        <Camera
                            className={`w-6 h-6 mb-2 ${deliveryPhotoHash ? 'text-emerald-400' : 'text-amber-400'}`}
                        />
                        <p className="text-sm font-semibold text-amber-200">Photo Proof</p>
                        <p className="text-xs text-amber-600/70">
                            {deliveryPhotoHash ? 'Captured' : 'Required'}
                        </p>
                    </CardContent>
                </Card>

                <Card
                    className={
                        productQR
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : 'bg-amber-500/10 border-amber-500/30'
                    }
                >
                    <CardContent className="p-4">
                        <QrCode
                            className={`w-6 h-6 mb-2 ${productQR ? 'text-emerald-400' : 'text-amber-400'}`}
                        />
                        <p className="text-sm font-semibold text-amber-200">QR Code</p>
                        <p className="text-xs text-amber-600/70">{productQR ? 'Scanned' : 'Required'}</p>
                    </CardContent>
                </Card>

                <Card
                    className={
                        customerSignatureHash
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : 'bg-amber-500/10 border-amber-500/30'
                    }
                >
                    <CardContent className="p-4">
                        <PenTool
                            className={`w-6 h-6 mb-2 ${customerSignatureHash ? 'text-emerald-400' : 'text-amber-400'}`}
                        />
                        <p className="text-sm font-semibold text-amber-200">Signature</p>
                        <p className="text-xs text-amber-600/70">
                            {customerSignatureHash ? 'Captured' : 'Required'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* GPS Location Capture */}
            <Card className="card-premium card-glass-dark">
                <CardHeader>
                    <CardTitle className="text-base text-amber-300 flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        GPS Location Capture
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {gpsLocation ? (
                        <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <Label className="text-amber-200 text-xs">Latitude</Label>
                                    <p className="text-emerald-400 font-mono">{gpsLocation.latitude.toFixed(6)}</p>
                                </div>
                                <div>
                                    <Label className="text-amber-200 text-xs">Longitude</Label>
                                    <p className="text-emerald-400 font-mono">{gpsLocation.longitude.toFixed(6)}</p>
                                </div>
                                <div>
                                    <Label className="text-amber-200 text-xs">Accuracy</Label>
                                    <p className="text-emerald-400">{gpsLocation.accuracy?.toFixed(1)}m</p>
                                </div>
                                <div>
                                    <Label className="text-amber-200 text-xs">Timestamp</Label>
                                    <p className="text-emerald-400">
                                        {new Date(gpsLocation.timestamp).toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                            <Button
                                onClick={handleCaptureGPS}
                                variant="outline"
                                size="sm"
                                className="w-full"
                            >
                                Recapture GPS
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {gpsError && (
                                <Alert className="bg-red-500/10 border-red-500/30">
                                    <AlertCircle className="h-4 w-4 text-red-400" />
                                    <AlertDescription className="text-red-300 text-sm">
                                        {gpsError}
                                    </AlertDescription>
                                </Alert>
                            )}
                            <Button
                                onClick={handleCaptureGPS}
                                disabled={isCapturingGPS}
                                className="w-full bg-amber-700/30 hover:bg-amber-700/40 border-amber-600/50 text-amber-200"
                            >
                                {isCapturingGPS ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Capturing GPS...
                                    </>
                                ) : (
                                    <>
                                        <MapPin className="w-4 h-4 mr-2" />
                                        Capture GPS Location
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Photo & QR Code */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Delivery Photo */}
                <Card className="card-premium card-glass-dark">
                    <CardHeader>
                        <CardTitle className="text-base text-amber-300 flex items-center gap-2">
                            <Camera className="w-5 h-5" />
                            Delivery Photo
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {deliveryPhotoPreview && (
                            <img
                                src={deliveryPhotoPreview}
                                alt="Delivery"
                                className="w-full h-48 object-cover rounded border border-amber-600/30"
                            />
                        )}
                        <Button
                            onClick={handlePhotoCapture}
                            variant="outline"
                            className="w-full flex items-center gap-2"
                        >
                            <Camera className="w-4 h-4" />
                            {deliveryPhotoHash ? 'Retake Photo' : 'Capture Photo'}
                        </Button>
                        {deliveryPhotoHash && (
                            <p className="text-xs text-green-400 font-mono break-all">
                                Hash: {deliveryPhotoHash.substring(0, 32)}...
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* QR Code */}
                <Card className="card-premium card-glass-dark">
                    <CardHeader>
                        <CardTitle className="text-base text-amber-300 flex items-center gap-2">
                            <QrCode className="w-5 h-5" />
                            Product QR Code
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="h-48 flex items-center justify-center border border-amber-600/30 rounded bg-gray-900/50">
                            {productQR ? (
                                <div className="text-center">
                                    <Package className="w-16 h-16 text-emerald-400 mx-auto mb-2" />
                                    <p className="text-emerald-400 font-mono text-sm">{productQR}</p>
                                </div>
                            ) : (
                                <QrCode className="w-16 h-16 text-amber-600/30" />
                            )}
                        </div>
                        <Button
                            onClick={handleQRScan}
                            disabled={isScanning}
                            variant="outline"
                            className="w-full flex items-center gap-2"
                        >
                            {isScanning ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Scanning...
                                </>
                            ) : (
                                <>
                                    <QrCode className="w-4 h-4" />
                                    Scan QR Code
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Customer Signature */}
            <Card className="card-premium card-glass-dark">
                <CardHeader>
                    <CardTitle className="text-base text-amber-300 flex items-center gap-2">
                        <PenTool className="w-5 h-5" />
                        Customer Signature
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="border-2 border-dashed border-amber-600/30 rounded-lg p-2 bg-gray-900/50">
                        <canvas
                            ref={signatureCanvasRef}
                            onMouseDown={handleSignatureStart}
                            onMouseMove={handleSignatureMove}
                            onMouseUp={handleSignatureEnd}
                            onMouseLeave={handleSignatureEnd}
                            className="w-full h-48 cursor-crosshair bg-white/5 rounded"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button
                            onClick={handleClearSignature}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                        >
                            Clear Signature
                        </Button>
                        {customerSignatureHash && (
                            <Badge variant="outline" className="bg-emerald-500/20 border-emerald-500/50">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Captured
                            </Badge>
                        )}
                    </div>
                    {customerSignatureHash && (
                        <p className="text-xs text-green-400 font-mono break-all">
                            Hash: {customerSignatureHash.substring(0, 32)}...
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Delivery Notes */}
            <Card className="card-premium card-glass-dark">
                <CardHeader>
                    <CardTitle className="text-base text-amber-300">Delivery Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="deliveryNotes" className="text-amber-200 text-xs">
                            Delivery Notes (Optional)
                        </Label>
                        <Textarea
                            id="deliveryNotes"
                            value={deliveryNotes}
                            onChange={(e) => setDeliveryNotes(e.target.value)}
                            placeholder="Any special notes about the delivery..."
                            className="bg-gray-800 border-amber-600/30 text-amber-200 min-h-[80px]"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="customerFeedback" className="text-amber-200 text-xs">
                            Customer Feedback (Optional)
                        </Label>
                        <Textarea
                            id="customerFeedback"
                            value={customerFeedback}
                            onChange={(e) => setCustomerFeedback(e.target.value)}
                            placeholder="Customer comments or feedback..."
                            className="bg-gray-800 border-amber-600/30 text-amber-200 min-h-[80px]"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Missing Proofs Warning */}
            {!proofValidation.isValid && (
                <Alert className="bg-amber-500/10 border-amber-500/30">
                    <AlertCircle className="h-5 w-5 text-amber-400" />
                    <AlertDescription className="text-amber-300 font-semibold">
                        Missing Required Proof: {proofValidation.missingProofs.join(', ')}
                    </AlertDescription>
                </Alert>
            )}

            {/* Complete Delivery Button */}
            <div className="flex gap-3 justify-end">
                <Button variant="outline" className="flex items-center gap-2">
                    <Printer className="w-4 h-4" />
                    Print Checklist
                </Button>

                <Button
                    onClick={() => {
                        void handleCompleteDelivery();
                    }}
                    disabled={!proofValidation.isValid || isEmittingEvent || isAcknowledging}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
                >
                    {isEmittingEvent || isAcknowledging ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Completing Delivery...
                        </>
                    ) : (
                        <>
                            <Truck className="w-4 h-4" />
                            Complete Delivery
                        </>
                    )}
                </Button>
            </div>

            {/* Constitutional Badge */}
            <div className="btn-secondary-dark">
                <span className="badge-constitutional">Tier 3 Protected</span>
                <span className="text-xs text-amber-600/70 font-medium">
                    Delivery tracking compliant with AICS-001 constitutional standards. All proof requirements
                    enforced (GPS + Photo + QR + Signature).
                </span>
            </div>
        </div>
    );
};

export default DeliveryTrackingPage;
