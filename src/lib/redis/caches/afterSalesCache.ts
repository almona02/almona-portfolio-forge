import { supabase } from '@/lib/supabase';
import { CacheHelper } from '../cacheHelper';

export class AfterSalesCache {
  private static readonly NAMESPACE = 'aftersales';

  /**
   * Cache service ticket details (5 min TTL)
   */
  static async getTicket(ticketId: string) {
    const key = `${this.NAMESPACE}:ticket:${ticketId}:details`;
    
    return CacheHelper.getOrSet(
      key,
      async () => {
        const { data } = await supabase
          .from('service_tickets')
          .select('*')
          .eq('id', ticketId)
          .single();
        return data;
      },
      { ttl: 300 } // 5 minutes
    );
  }

  /**
   * Invalidate ticket cache on update
   */
  static async invalidateTicket(ticketId: string) {
    const key = `${this.NAMESPACE}:ticket:${ticketId}:details`;
    await CacheHelper.delete(key);
  }

  /**
   * Cache machine catalog (1 hour TTL)
   */
  static async getMachineCatalog() {
    const key = `${this.NAMESPACE}:machines:catalog`;
    
    return CacheHelper.getOrSet(
      key,
      async () => {
        const { data } = await supabase
          .from('yilmaz_machines')
          .select('*')
          .eq('is_active', true);
        return data;
      },
      { ttl: 3600 } // 1 hour
    );
  }

  /**
   * Cache technician availability (1 min TTL)
   */
  static async getTechnicianAvailability(techId: string) {
    const key = `${this.NAMESPACE}:tech:${techId}:availability`;
    
    return CacheHelper.getOrSet(
      key,
      async () => {
        // Query technician's assigned tickets
        const { data } = await supabase
          .from('service_tickets')
          .select('id, status, priority')
          .eq('assigned_to', techId)
          .in('status', ['open', 'in_progress']);
        
        return {
          techId,
          assignedTickets: data?.length || 0,
          isAvailable: (data?.length || 0) < 5,
          lastUpdated: new Date().toISOString()
        };
      },
      { ttl: 60 } // 1 minute
    );
  }

  /**
   * Cache ticket list by status (2 min TTL)
   */
  static async getTicketsByStatus(status: string, userId?: string) {
    const key = userId 
      ? `${this.NAMESPACE}:tickets:user:${userId}:status:${status}`
      : `${this.NAMESPACE}:tickets:status:${status}`;
    
    return CacheHelper.getOrSet(
      key,
      async () => {
        let query = supabase
          .from('service_tickets')
          .select('*')
          .eq('status', status)
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (userId) {
          query = query.eq('user_id', userId);
        }
        
        const { data } = await query;
        return data;
      },
      { ttl: 120 } // 2 minutes
    );
  }

  /**
   * Invalidate all ticket caches
   */
  static async invalidateAllTickets() {
    await CacheHelper.invalidatePattern(`${this.NAMESPACE}:ticket:*`);
    await CacheHelper.invalidatePattern(`${this.NAMESPACE}:tickets:*`);
  }
}
