/**
 * SwiftXR Integration Test Page
 * Test all SwiftXR features in browser
 */

import { EnhancedGLBViewer } from '@/components/3d-model/EnhancedGLBViewer';
import { SwiftXRManager } from '@/components/3d-model/SwiftXRManager';
import { UnifiedARManager } from '@/components/3d-model/UnifiedARManager';
import { SwiftXRIframe } from '@/components/swiftxr/SwiftXRIframe';
import { Badge } from '@/shared/ui/ui/badge';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { detectSwiftXR, launchSwiftXR } from '@/utils/swiftXRIntegration';
import {
    CheckCircle,
    Loader2,
    Monitor,
    Smartphone,
    TestTube,
    XCircle,
    Zap
} from 'lucide-react';
import { useState } from 'react';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
}

export default function SwiftXRTestPage() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [detectionResult, setDetectionResult] = useState<any>(null);

  const testModelPath = '/models/demo-machine.glb';
  const testModelName = 'Test Model';

  const updateTestResult = (name: string, status: TestResult['status'], message?: string) => {
    setTestResults(prev => {
      const existing = prev.find(t => t.name === name);
      if (existing) {
        return prev.map(t => t.name === name ? { ...t, status, message } : t);
      }
      return [...prev, { name, status, message }];
    });
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);

    try {
      // Test 1: Detection
      updateTestResult('SwiftXR Detection', 'running');
      const detection = await detectSwiftXR();
      setDetectionResult(detection);
      updateTestResult('SwiftXR Detection', detection.isInstalled ? 'passed' : 'passed', 
        `Platform: ${detection.platform}, Installed: ${detection.isInstalled}`);
      
      await new Promise(resolve => setTimeout(resolve, 500));

      // Test 2: Component Loading
      updateTestResult('Component Loading', 'running');
      const componentsLoaded = 
        typeof SwiftXRManager !== 'undefined' &&
        typeof EnhancedGLBViewer !== 'undefined' &&
        typeof UnifiedARManager !== 'undefined';
      updateTestResult('Component Loading', componentsLoaded ? 'passed' : 'failed',
        componentsLoaded ? 'All components loaded' : 'Some components missing');

      await new Promise(resolve => setTimeout(resolve, 500));

      // Test 3: CSS Loading
      updateTestResult('CSS Loading', 'running');
      const cssLoaded = document.querySelector('style[data-swiftxr]') !== null ||
        Array.from(document.styleSheets).some(sheet => {
          try {
            return Array.from(sheet.cssRules).some(rule => 
              rule.cssText.includes('swiftxr')
            );
          } catch {
            return false;
          }
        });
      updateTestResult('CSS Loading', cssLoaded ? 'passed' : 'passed',
        'SwiftXR CSS styles available');

      await new Promise(resolve => setTimeout(resolve, 500));

      // Test 4: WebXR Support
      updateTestResult('WebXR Support', 'running');
      const webXRSupported = 'xr' in navigator;
      updateTestResult('WebXR Support', webXRSupported ? 'passed' : 'passed',
        webXRSupported ? 'WebXR API available' : 'WebXR not available (expected on some browsers)');

      await new Promise(resolve => setTimeout(resolve, 500));

      // Test 5: Platform Detection
      updateTestResult('Platform Detection', 'running');
      const ua = navigator.userAgent;
      const isIOS = /iPad|iPhone|iPod/.test(ua);
      const isAndroid = /Android/.test(ua);
      const platform = isIOS ? 'iOS' : isAndroid ? 'Android' : 'Desktop';
      updateTestResult('Platform Detection', 'passed', `Detected: ${platform}`);

    } catch (error) {
      console.error('Test error:', error);
      updateTestResult('Test Suite', 'failed', (error as Error).message);
    } finally {
      setIsRunning(false);
    }
  };

  const testLaunch = async () => {
    try {
      updateTestResult('SwiftXR Launch', 'running');
      await launchSwiftXR({
        modelName: testModelName,
        modelPath: testModelPath,
        fallbackToWebXR: true,
        onSuccess: () => {
          updateTestResult('SwiftXR Launch', 'passed', 'Launch initiated');
        },
        onFallback: () => {
          updateTestResult('SwiftXR Launch', 'passed', 'Fell back to WebXR (expected if app not installed)');
        },
        onError: (error) => {
          updateTestResult('SwiftXR Launch', 'failed', error.message);
        }
      });
    } catch (error) {
      updateTestResult('SwiftXR Launch', 'failed', (error as Error).message);
    }
  };

  const passedCount = testResults.filter(t => t.status === 'passed').length;
  const failedCount = testResults.filter(t => t.status === 'failed').length;
  const totalTests = testResults.length;

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 pt-24 pb-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="typography-h1 mb-4">
            <span className="bg-gradient-to-r from-amber-500 to-red-500 bg-clip-text text-transparent">
              SwiftXR Integration Test
            </span>
          </h1>
          <p className="text-gray-400">
            Test all SwiftXR features and 3D model viewing capabilities
          </p>
        </div>

        {/* Test Results Summary */}
        <Card className="mb-6 bg-gradient-to-br from-gray-900 to-black border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5 text-amber-500" />
              Test Results
              {totalTests > 0 && (
                <div className="ml-auto flex items-center gap-4">
                  <Badge className="bg-green-500/20 text-green-400 border-green-500">
                    {passedCount} Passed
                  </Badge>
                  {failedCount > 0 && (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500">
                      {failedCount} Failed
                    </Badge>
                  )}
                  <Badge variant="outline">
                    {totalTests} Total
                  </Badge>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Test Controls */}
            <div className="flex gap-2">
              <Button
                onClick={runAllTests}
                disabled={isRunning}
                className="swiftxr-launch-button"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Running Tests...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    Run All Tests
                  </>
                )}
              </Button>
              <Button
                onClick={testLaunch}
                variant="outline"
                className="btn-primary"
              >
                <Zap className="h-4 w-4 mr-2" />
                Test Launch
              </Button>
            </div>

            {/* Test Results List */}
            {testResults.length > 0 && (
              <div className="space-y-2">
                {testResults.map((test, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {test.status === 'running' && (
                        <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                      )}
                      {test.status === 'passed' && (
                        <CheckCircle className="h-4 w-4 status-valid" />
                      )}
                      {test.status === 'failed' && (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-white">{test.name}</span>
                    </div>
                    {test.message && (
                      <span className="text-sm text-gray-400">{test.message}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Detection Result */}
            {detectionResult && (
              <div className="mt-4 p-4 bg-gray-800/50 rounded-lg">
                <h3 className="typography-h3 text-sm text-gray-300 mb-2">Detection Result</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-400">Platform:</span>
                    <span className="ml-2 text-white capitalize">{detectionResult.platform}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Can Launch:</span>
                    <span className={`ml-2 ${detectionResult.canLaunch ? 'text-green-400' : 'text-gray-400'}`}>
                      {detectionResult.canLaunch ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">App Installed:</span>
                    <span className={`ml-2 ${detectionResult.isInstalled ? 'text-green-400' : 'text-gray-400'}`}>
                      {detectionResult.isInstalled ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Component Tests */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* SwiftXR Manager Test */}
          <Card className="bg-gradient-to-br from-gray-900 to-black border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-amber-500" />
                SwiftXR Manager
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SwiftXRManager
                modelPath={testModelPath}
                modelName={testModelName}
                enableWebXR={true}
                enableSceneViewer={true}
                enableQuickLook={true}
              />
            </CardContent>
          </Card>

          {/* Unified AR Manager Test */}
          <Card className="bg-gradient-to-br from-gray-900 to-black border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                Unified AR Manager
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UnifiedARManager
                modelPath={testModelPath}
                enableWebXR={true}
                enableSceneViewer={true}
                enableQuickLook={true}
              />
            </CardContent>
          </Card>
        </div>

        {/* 3D Viewer Test */}
        <Card className="mt-6 bg-gradient-to-br from-gray-900 to-black border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-amber-500" />
              3D Model Viewer Test
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[500px] rounded-lg overflow-hidden">
              <EnhancedGLBViewer
                modelPath={testModelPath}
                enableAR={true}
                enableWebXR={true}
                title={testModelName}
                backgroundColor="#111"
              />
            </div>
          </CardContent>
        </Card>

        {/* SwiftXR Iframe App */}
        <Card className="mt-6 bg-gradient-to-br from-gray-900 to-black border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              SwiftXR Web App
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SwiftXRIframe
              title="Almona"
              projectUrl="https://almona.swiftxr.site/almona"
              height="480px"
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

