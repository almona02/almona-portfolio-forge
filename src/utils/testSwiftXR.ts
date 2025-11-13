/**
 * SwiftXR Browser Testing Utility
 * Run this in browser console to test SwiftXR integration
 */

export const testSwiftXR = {
  /**
   * Test SwiftXR detection
   */
  async testDetection() {
    console.log('🧪 Testing SwiftXR Detection...');
    const { detectSwiftXR } = await import('./swiftXRIntegration');
    const result = await detectSwiftXR();
    console.log('✅ Detection Result:', result);
    return result;
  },

  /**
   * Test SwiftXR launch with model
   */
  async testLaunch(modelName: string = 'fr222', modelUrl?: string) {
    console.log('🧪 Testing SwiftXR Launch...');
    const { launchSwiftXR } = await import('./swiftXRIntegration');
    
    try {
      const result = await launchSwiftXR({
        modelName,
        modelUrl: modelUrl || `https://${window.location.host}/models/${modelName}.glb`,
        fallbackToWebXR: true,
        onSuccess: () => console.log('✅ SwiftXR launch successful'),
        onFallback: () => console.log('⚠️ Falling back to WebXR'),
        onError: (error) => console.error('❌ SwiftXR launch failed:', error)
      });
      console.log('✅ Launch Result:', result);
      return result;
    } catch (error) {
      console.error('❌ Launch Error:', error);
      return false;
    }
  },

  /**
   * Test fallback chain
   */
  async testFallback(modelPath: string = '/models/fr222.glb') {
    console.log('🧪 Testing Fallback Chain...');
    const { launchARWithFallback } = await import('./swiftXRIntegration');
    
    try {
      const result = await launchARWithFallback(
        modelPath,
        'Test Model',
        {
          preferNative: true,
          onMethodChange: (method) => {
            console.log(`📱 AR Method Changed: ${method}`);
          }
        }
      );
      console.log('✅ Fallback Test Result:', result);
      return result;
    } catch (error) {
      console.error('❌ Fallback Test Error:', error);
      return false;
    }
  },

  /**
   * Test all AR components
   */
  async testAll() {
    console.log('🧪 Running Full SwiftXR Test Suite...\n');
    
    const results = {
      detection: false,
      launch: false,
      fallback: false
    };

    try {
      // Test 1: Detection
      console.log('📋 Test 1: Detection');
      results.detection = await this.testDetection();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Test 2: Launch
      console.log('\n📋 Test 2: Launch');
      results.launch = await this.testLaunch();
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Test 3: Fallback
      console.log('\n📋 Test 3: Fallback');
      results.fallback = await this.testFallback();
      
      console.log('\n📊 Test Results Summary:');
      console.table(results);
      
      return results;
    } catch (error) {
      console.error('❌ Test Suite Error:', error);
      return results;
    }
  },

  /**
   * Test 3D viewer components
   */
  test3DViewers() {
    console.log('🧪 Testing 3D Viewer Components...');
    
    // Check if components are loaded
    const checks = {
      'EnhancedGLBViewer': typeof window !== 'undefined' && 'EnhancedGLBViewer' in window,
      'SwiftXRManager': typeof window !== 'undefined' && 'SwiftXRManager' in window,
      'UnifiedARManager': typeof window !== 'undefined' && 'UnifiedARManager' in window,
      'SwiftXR CSS': document.querySelector('style[data-swiftxr]') !== null
    };

    console.table(checks);
    return checks;
  }
};

// Make available in browser console
if (typeof window !== 'undefined') {
  (window as any).testSwiftXR = testSwiftXR;
  console.log('✅ SwiftXR Test Utility loaded. Use testSwiftXR.testAll() to run tests.');
}

export default testSwiftXR;

