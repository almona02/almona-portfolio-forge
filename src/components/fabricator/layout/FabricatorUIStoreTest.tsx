import React, { useEffect, useState } from 'react';
import { Button } from '@/shared/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Badge } from '@/shared/ui/ui/badge';
import { 
  useFabricatorUIStore, 
  usePanelState, 
  useTogglePanel,
  useTheme,
  useSetTheme,
  type SectionId 
} from '@/stores/fabricatorUIStore';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

/**
 * Test component to verify fabricatorUIStore functionality
 * Tests:
 * 1. Store initialization
 * 2. togglePanel action
 * 3. Theme switching
 * 4. localStorage persistence
 * 5. TypeScript type safety
 */
export const FabricatorUIStoreTest: React.FC = () => {
  const [testResults, setTestResults] = useState<Array<{ test: string; passed: boolean; message: string }>>([]);
  const [localStorageCheck, setLocalStorageCheck] = useState<string>('Not checked');

  // Use store hooks
  const panelState = usePanelState('fabrication');
  const togglePanel = useTogglePanel();
  const theme = useTheme();
  const setTheme = useSetTheme();
  
  // Get full store state for testing
  const storeState = useFabricatorUIStore((state) => state);

  // Test 1: Verify store initialization
  useEffect(() => {
    const results: Array<{ test: string; passed: boolean; message: string }> = [];

    // Test 1: Store state exists
    try {
      if (storeState && typeof storeState === 'object') {
        results.push({ test: 'Store Initialization', passed: true, message: 'Store state exists and is an object' });
      } else {
        results.push({ test: 'Store Initialization', passed: false, message: 'Store state is invalid' });
      }
    } catch (error) {
      results.push({ test: 'Store Initialization', passed: false, message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }

    // Test 2: Panel state structure
    try {
      if (panelState && typeof panelState.leftCollapsed === 'boolean' && typeof panelState.rightCollapsed === 'boolean') {
        results.push({ test: 'Panel State Structure', passed: true, message: 'Panel state has correct structure' });
      } else {
        results.push({ test: 'Panel State Structure', passed: false, message: 'Panel state structure is invalid' });
      }
    } catch (error) {
      results.push({ test: 'Panel State Structure', passed: false, message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }

    // Test 3: Theme state
    try {
      if (theme === 'dark' || theme === 'light') {
        results.push({ test: 'Theme State', passed: true, message: `Theme is valid: ${theme}` });
      } else {
        results.push({ test: 'Theme State', passed: false, message: `Theme is invalid: ${theme}` });
      }
    } catch (error) {
      results.push({ test: 'Theme State', passed: false, message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }

    // Test 4: Actions exist
    try {
      if (typeof togglePanel === 'function' && typeof setTheme === 'function') {
        results.push({ test: 'Actions Exist', passed: true, message: 'All action functions exist' });
      } else {
        results.push({ test: 'Actions Exist', passed: false, message: 'Some actions are missing' });
      }
    } catch (error) {
      results.push({ test: 'Actions Exist', passed: false, message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }

    // Test 5: Check localStorage persistence
    try {
      const stored = localStorage.getItem('almona_fabricator_ui_preferences');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.state && parsed.state.theme && parsed.state.panelStates) {
          setLocalStorageCheck('Persistence working - data found in localStorage');
          results.push({ test: 'LocalStorage Persistence', passed: true, message: 'Data persisted to localStorage' });
        } else {
          setLocalStorageCheck('Persistence structure invalid');
          results.push({ test: 'LocalStorage Persistence', passed: false, message: 'LocalStorage structure is invalid' });
        }
      } else {
        setLocalStorageCheck('No data in localStorage yet (will appear after first state change)');
        results.push({ test: 'LocalStorage Persistence', passed: true, message: 'LocalStorage ready (empty on first load is normal)' });
      }
    } catch (error) {
      setLocalStorageCheck(`Error checking localStorage: ${error instanceof Error ? error.message : 'Unknown error'}`);
      results.push({ test: 'LocalStorage Persistence', passed: false, message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }

    setTestResults(results);
  }, [storeState, panelState, theme, togglePanel, setTheme]);

  // Test togglePanel action
  const handleTestToggle = (sectionId: SectionId, panel: 'left' | 'right') => {
    const beforeState = useFabricatorUIStore.getState().panelStates[sectionId][panel === 'left' ? 'leftCollapsed' : 'rightCollapsed'];
    togglePanel(sectionId, panel);
    
    // Check state after a brief delay (state updates are async)
    setTimeout(() => {
      const newPanelState = useFabricatorUIStore.getState().panelStates[sectionId];
      const afterState = newPanelState[panel === 'left' ? 'leftCollapsed' : 'rightCollapsed'];
      
      if (beforeState !== afterState) {
        const newResult = { test: `Toggle ${panel} Panel (${sectionId})`, passed: true, message: `Panel toggled: ${beforeState} → ${afterState}` };
        setTestResults(prev => [...prev.filter(r => !r.test.includes(`Toggle ${panel} Panel`)), newResult]);
      } else {
        const newResult = { test: `Toggle ${panel} Panel (${sectionId})`, passed: false, message: `Panel did not toggle (still ${beforeState})` };
        setTestResults(prev => [...prev.filter(r => !r.test.includes(`Toggle ${panel} Panel`)), newResult]);
      }
    }, 100);
  };

  // Test theme toggle
  const handleTestThemeToggle = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    
    setTimeout(() => {
      const currentTheme = useFabricatorUIStore.getState().theme;
      const newResult = { 
        test: 'Theme Toggle', 
        passed: currentTheme === newTheme, 
        message: `Theme changed: ${theme} → ${currentTheme}` 
      };
      setTestResults(prev => [...prev.filter(r => r.test !== 'Theme Toggle'), newResult]);
    }, 100);
  };

  const allPassed = testResults.length > 0 && testResults.every(r => r.passed);
  const passedCount = testResults.filter(r => r.passed).length;
  const totalCount = testResults.length;

  return (
    <Card className="w-full max-w-4xl mx-auto mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          Fabricator UI Store Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg">
          <div>
            <div className="text-sm text-gray-400">Test Results</div>
            <div className="text-2xl font-bold">
              {passedCount}/{totalCount} Passed
            </div>
          </div>
          <div>
            {allPassed ? (
              <Badge className="bg-green-600 text-white">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                All Tests Passed
              </Badge>
            ) : (
              <Badge variant="destructive">
                <XCircle className="h-4 w-4 mr-1" />
                Some Tests Failed
              </Badge>
            )}
          </div>
        </div>

        {/* Current State Display */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-900/30 rounded-lg">
            <div className="text-xs text-gray-400 mb-2">Current Theme</div>
            <div className="text-lg font-semibold">{theme}</div>
          </div>
          <div className="p-4 bg-gray-900/30 rounded-lg">
            <div className="text-xs text-gray-400 mb-2">Fabrication Panel State</div>
            <div className="text-sm">
              Left: {panelState.leftCollapsed ? 'Collapsed' : 'Expanded'} | 
              Right: {panelState.rightCollapsed ? 'Collapsed' : 'Expanded'}
            </div>
          </div>
        </div>

        {/* LocalStorage Status */}
        <div className="p-4 bg-gray-900/30 rounded-lg">
          <div className="text-xs text-gray-400 mb-2">LocalStorage Status</div>
          <div className="text-sm">{localStorageCheck}</div>
        </div>

        {/* Test Actions */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => handleTestToggle('fabrication', 'left')} variant="outline" size="sm">
            Test Toggle Left Panel
          </Button>
          <Button onClick={() => handleTestToggle('fabrication', 'right')} variant="outline" size="sm">
            Test Toggle Right Panel
          </Button>
          <Button onClick={handleTestThemeToggle} variant="outline" size="sm">
            Test Toggle Theme ({theme === 'dark' ? '→ Light' : '→ Dark'})
          </Button>
        </div>

        {/* Test Results List */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-gray-300">Test Results:</div>
          {testResults.map((result, index) => (
            <div 
              key={index} 
              className={`flex items-center gap-3 p-3 rounded-lg ${
                result.passed ? 'bg-green-900/20 border border-green-700/30' : 'bg-red-900/20 border border-red-700/30'
              }`}
            >
              {result.passed ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              )}
              <div className="flex-1">
                <div className="font-medium">{result.test}</div>
                <div className="text-xs text-gray-400">{result.message}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Raw Store State (for debugging) */}
        <details className="p-4 bg-gray-900/30 rounded-lg">
          <summary className="cursor-pointer text-sm font-semibold text-gray-300 mb-2">
            Raw Store State (Debug)
          </summary>
          <pre className="text-xs overflow-auto mt-2 p-2 bg-black/50 rounded">
            {JSON.stringify(storeState, null, 2)}
          </pre>
        </details>
      </CardContent>
    </Card>
  );
};
