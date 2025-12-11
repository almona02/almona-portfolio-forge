/**
 * ALM 6510 MDB Export Service
 * ============================
 * 
 * Generates MDB files for Yılmaz ALM 6510 machines.
 * The MDB file structure matches exactly the machine's software requirements.
 */

import { WindowUnit, OptimizationResult, CuttingPlan, Cut } from '@/types/fabricator';
import { ALM6510_CONFIG, convertToALM6510MDB, ALM6510MDBRecord } from '@/lib/machines/ALM6510MachineSet';

export interface ALM6510ExportOptions {
  orderNumber: string;
  customerCode?: string;
  customerName?: string;
  project?: {
    positionNumber?: number;
    [key: string]: any;
  };
}

export class ALM6510MDBExportService {
  private apiBaseUrl: string;

  constructor(apiBaseUrl: string = '/api/v2') {
    this.apiBaseUrl = apiBaseUrl;
  }

  /**
   * Generate ALM 6510 MDB file from optimization result
   */
  async generateMDB(
    project: WindowUnit,
    optimization: OptimizationResult,
    options: ALM6510ExportOptions
  ): Promise<Blob> {
    // Validate inputs
    if (!project || !optimization) {
      throw new Error('Project and optimization data are required');
    }

    if (!optimization.cuttingPlan || optimization.cuttingPlan.length === 0) {
      throw new Error('No cutting plan data available. Please generate optimization first.');
    }

    // Prepare cutting plan data
    const cuttingPlanData = this.prepareCuttingPlanData(optimization.cuttingPlan);
    
    if (cuttingPlanData.length === 0) {
      throw new Error('No cuts found in cutting plan. Please check your design.');
    }

    // Prepare profiles data
    const profilesData = project.components.map(comp => ({
      id: comp.profileId || comp.profile?.id || '',
      name: comp.profile?.name || '',
      code: comp.profile?.code || '',
      material: comp.profile?.material || 'aluminum',
    }));

    try {
      // Call backend API
      const response = await fetch(`${this.apiBaseUrl}/alm6510/generate-mdb`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderNumber: options.orderNumber || project.orderNumber || `ORDER-${Date.now()}`,
          customerCode: options.customerCode || project.customer || '',
          customerName: options.customerName || project.customer || '',
          cuttingPlan: cuttingPlanData,
          profiles: profilesData,
          project: options.project || {
            positionNumber: parseInt(project.posNumber || '1'),
          },
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to generate MDB file';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
          console.error('ALM 6510 API error:', errorData);
        } catch {
          // If response is not JSON, try to get text
          try {
            const errorText = await response.text();
            errorMessage = errorText || errorMessage;
            console.error('ALM 6510 API error (text):', errorText);
          } catch {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
        }
        throw new Error(errorMessage);
      }

      // Backend returns JSON structure, convert to blob
      let jsonData;
      try {
        jsonData = await response.json();
      } catch (error) {
        console.error('Failed to parse JSON response:', error);
        throw new Error('Invalid response format from server');
      }

      if (!jsonData || !jsonData.rows || jsonData.rows.length === 0) {
        throw new Error('No data returned from server. Please check your cutting plan.');
      }

      const jsonString = JSON.stringify(jsonData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      
      return blob;
    } catch (error) {
      console.error('ALM 6510 MDB generation error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to generate MDB file: ' + String(error));
    }
  }

  /**
   * Download MDB file
   */
  async downloadMDB(
    project: WindowUnit,
    optimization: OptimizationResult,
    options: ALM6510ExportOptions
  ): Promise<void> {
    try {
      const blob = await this.generateMDB(project, optimization, options);
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const orderNum = options.orderNumber || project.orderNumber || 'ORDER';
      link.download = `ALM6510_${orderNum}_${timestamp}.mdb.json`;
      
      document.body.appendChild(link);
      link.click();
      
      // Clean up after a short delay
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error('Error downloading ALM 6510 MDB:', error);
      throw error;
    }
  }

  /**
   * Prepare cutting plan data for API
   */
  private prepareCuttingPlanData(cuttingPlans: CuttingPlan[]): any[] {
    const cuts: any[] = [];
    
    cuttingPlans.forEach((plan, planIndex) => {
      plan.cuts.forEach((cut, cutIndex) => {
        cuts.push({
          length: cut.length,
          angle: cut.angle || 90,
          width: cut.width || 0,
          height: cut.height || 0,
          barIndex: planIndex + 1,
          cutIndex: cutIndex + 1,
          componentId: cut.componentId || '',
          componentType: cut.componentType || '',
          profile: {
            id: cut.profileId || '',
            name: cut.profileName || '',
            code: cut.profileCode || '',
            material: cut.material || 'aluminum',
          },
          operationCode: cut.operationCode || null,
          robotY: cut.robotY || 0,
          robotZ: cut.robotZ || 0,
          robotVertical: cut.robotVertical || 0,
        });
      });
    });

    return cuts;
  }
}

// Export singleton instance
export const alm6510MDBExport = new ALM6510MDBExportService();

