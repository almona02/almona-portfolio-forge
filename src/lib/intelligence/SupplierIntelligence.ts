/**
 * Supplier Intelligence - Reputation & Trust System
 * 
 * Vets suppliers based on Egyptian workshop reality:
 * - Reputation tracking
 * - Quality risk assessment
 * - Maalem warnings
 * - Trust patterns
 */

export interface SupplierVerdict {
  status: 'OK' | 'WARNING' | 'AVOID';
  message: string;
  messageArabic: string;
  maalemVoice: string;
  risks: string[];
  recommendations: string[];
}

export interface SupplierData {
  name: string;
  location: string;
  reputation: 'high' | 'medium' | 'mixed' | 'low';
  risks: string[];
  strengths: string[];
  trustLevel: number; // 0-10
  yearsInBusiness?: number;
}

/**
 * Supplier Intelligence
 */
export class SupplierIntelligence {
  private supplierDatabase: Record<string, SupplierData> = {
    'store_x_shobra': {
      name: 'Store X - Shobra',
      location: 'Shobra',
      reputation: 'mixed',
      risks: ['mixes_weights', 'inconsistent_quality'],
      strengths: ['cheap_prices', 'fast_delivery'],
      trustLevel: 5,
    },
    'store_y_maadi': {
      name: 'Store Y - Maadi',
      location: 'Maadi',
      reputation: 'high',
      risks: ['expensive'],
      strengths: ['consistent_quality', 'reliable'],
      trustLevel: 9,
    },
    'store_z_heliopolis': {
      name: 'Store Z - Heliopolis',
      location: 'Heliopolis',
      reputation: 'high',
      risks: [],
      strengths: ['premium_quality', 'trusted', 'good_warranty'],
      trustLevel: 9.5,
    },
  };

  /**
   * Vet supplier
   */
  async vetSupplier(supplierName: string): Promise<SupplierVerdict> {
    const supplier = this.supplierDatabase[supplierName];

    if (!supplier) {
      return {
        status: 'WARNING',
        message: 'Supplier not in database. Proceed with caution.',
        messageArabic: 'المورد مش موجود في قاعدة البيانات. تحرك بحذر.',
        maalemVoice: 'مش عارف الراجل ده. خد عينة صغيرة أول، متاخدش كمية كبيرة.',
        risks: ['unknown_supplier'],
        recommendations: ['Request sample first', 'Start with small order'],
      };
    }

    // Check for critical risks
    if (supplier.risks.includes('mixes_weights')) {
      return {
        status: 'WARNING',
        message: 'Technical: Inconsistent wall thickness detected in past batches.',
        messageArabic: 'تحذير: سماكة الجدار غير متسقة في دفعات سابقة.',
        maalemVoice: 'خد بالك من الميزان عند الراجل ده. ساعات بيحط خفيف في وسط التقيل. اوزن عود عود.',
        risks: supplier.risks,
        recommendations: [
          'Weigh each piece individually',
          'Check wall thickness before accepting',
          'Consider alternative supplier for critical projects',
        ],
      };
    }

    if (supplier.risks.includes('inconsistent_quality')) {
      return {
        status: 'WARNING',
        message: 'Quality varies between batches. Inspect carefully.',
        messageArabic: 'الجودة تختلف بين الدفعات. افحص بعناية.',
        maalemVoice: 'الجودة مش ثابتة. افتح كل علبة وافحصها قبل ما تبدأ الشغل.',
        risks: supplier.risks,
        recommendations: [
          'Inspect each batch',
          'Test sample before full order',
          'Have backup supplier ready',
        ],
      };
    }

    if (supplier.reputation === 'high' && supplier.trustLevel >= 8) {
      return {
        status: 'OK',
        message: 'Trusted supplier with good reputation.',
        messageArabic: 'مورد موثوق بسمعة جيدة.',
        maalemVoice: 'الراجل ده معروف ونضيف. ممكن تاخد منه بدون قلق.',
        risks: [],
        recommendations: ['Continue relationship', 'Maintain good terms'],
      };
    }

    return {
      status: supplier.reputation === 'low' ? 'AVOID' : 'WARNING',
      message: `Supplier reputation: ${supplier.reputation}`,
      messageArabic: `سمعة المورد: ${supplier.reputation}`,
      maalemVoice: 'خلي بالك من المورد ده.',
      risks: supplier.risks,
      recommendations: ['Proceed with caution', 'Inspect all materials'],
    };
  }

  /**
   * Get supplier recommendation
   */
  async recommendSupplier(
    location: string,
    priority: 'price' | 'quality' | 'balance' = 'balance'
  ): Promise<SupplierData | null> {
    const suppliers = Object.values(this.supplierDatabase).filter(
      s => s.location.toLowerCase().includes(location.toLowerCase())
    );

    if (suppliers.length === 0) {
      return null;
    }

    // Sort by priority
    if (priority === 'price') {
      suppliers.sort((a, b) => {
        // Lower trust might mean cheaper (but riskier)
        return a.trustLevel - b.trustLevel;
      });
    } else if (priority === 'quality') {
      suppliers.sort((a, b) => b.trustLevel - a.trustLevel);
    } else {
      // Balance: high trust, reasonable price
      suppliers.sort((a, b) => {
        const aScore = a.trustLevel - (a.risks.length * 0.5);
        const bScore = b.trustLevel - (b.risks.length * 0.5);
        return bScore - aScore;
      });
    }

    return suppliers[0] || null;
  }

  /**
   * Add supplier to database
   */
  addSupplier(supplier: SupplierData): void {
    this.supplierDatabase[supplier.name.toLowerCase().replace(/\s+/g, '_')] = supplier;
  }

  /**
   * Get all suppliers
   */
  getAllSuppliers(): SupplierData[] {
    return Object.values(this.supplierDatabase);
  }
}

