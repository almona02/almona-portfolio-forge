import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/ui/ui/card';
import { Badge } from '@/shared/ui/ui/badge';
import type { Profile } from '@/types/fabricator';

interface Rock60CuttingSummaryProps {
  profiles: Profile[];
}

/**
 * Rock60CuttingSummary
 * Lightweight 2D cutting list viewer for ROCK 60 / 45° miter configuration.
 * Reads the embedded rock60_45_degree_config from the ROCK 60 system template profile.
 */
export const Rock60CuttingSummary: React.FC<Rock60CuttingSummaryProps> = ({ profiles }) => {
  const rockProfile = profiles.find(
    (p) =>
      p.systemBrand === 'ROCK 60' ||
      (p.specifications && p.specifications.window_system === 'ROCK 60')
  );

  const config = rockProfile?.specifications?.rock60_45_degree_config as any | undefined;

  if (!rockProfile || !config) {
    return null;
  }

  const frame = config.frame_profiles?.main_frame;
  const sash = config.sash_profiles?.main_sash;
  const bead = config.glazing_beads?.bead_profile;

  return (
    <Card className="bg-gray-900/60 border-gray-700 card-dark">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm flex items-center gap-2">
            ROCK 60 – 45° 2D Cutting List
            <Badge variant="outline" className="text-[10px]">
              {config.cut_angle}
            </Badge>
          </CardTitle>
          <p className="text-[11px] text-gray-400 mt-1">
            Based on {rockProfile.name} template & ELSHERIF ROCK 60 configuration.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-[11px]">
        {/* Frame profiles */}
        {frame && (
          <div>
            <div className="mb-1 font-semibold text-gray-200">Frame Profile ({frame.profile_code})</div>
            <div className="border border-gray-700 rounded-md overflow-hidden">
              <div className="grid grid-cols-5 bg-gray-800/80 px-2 py-1 font-semibold">
                <div>Purpose</div>
                <div className="text-center">Qty</div>
                <div>Formula</div>
                <div>Angle</div>
                <div>Notes</div>
              </div>
              {frame.cuts?.map((c: any, idx: number) => (
                <div
                  key={`frame-${idx}`}
                  className="grid grid-cols-5 px-2 py-1 border-t border-gray-800 bg-gray-900 /60 card-dark"
                >
                  <div>{c.purpose?.replace(/_/g, ' ')}</div>
                  <div className="text-center">{c.quantity}</div>
                  <div>{c.calculation}</div>
                  <div>{c.cut_angle}</div>
                  <div>{c.notes}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sash profiles */}
        {sash && (
          <div>
            <div className="mb-1 font-semibold text-gray-200">Sash Profile ({sash.profile_code})</div>
            <div className="border border-gray-700 rounded-md overflow-hidden">
              <div className="grid grid-cols-5 bg-gray-800/80 px-2 py-1 font-semibold">
                <div>Purpose</div>
                <div className="text-center">Qty</div>
                <div>Formula</div>
                <div>Angle</div>
                <div>Notes</div>
              </div>
              {sash.cuts?.map((c: any, idx: number) => (
                <div
                  key={`sash-${idx}`}
                  className="grid grid-cols-5 px-2 py-1 border-t border-gray-800 bg-gray-900 /60 card-dark"
                >
                  <div>{c.purpose?.replace(/_/g, ' ')}</div>
                  <div className="text-center">{c.quantity}</div>
                  <div>{c.calculation}</div>
                  <div>{c.cut_angle}</div>
                  <div>{c.notes}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Glazing beads */}
        {bead && (
          <div>
            <div className="mb-1 font-semibold text-gray-200">
              Glazing Bead ({bead.profile_code})
            </div>
            <div className="border border-gray-700 rounded-md overflow-hidden">
              <div className="grid grid-cols-5 bg-gray-800/80 px-2 py-1 font-semibold">
                <div>Purpose</div>
                <div className="text-center">Qty</div>
                <div>Formula</div>
                <div>Angle</div>
                <div>Notes</div>
              </div>
              {bead.cuts?.map((c: any, idx: number) => (
                <div
                  key={`bead-${idx}`}
                  className="grid grid-cols-5 px-2 py-1 border-t border-gray-800 bg-gray-900 /60 card-dark"
                >
                  <div>{c.purpose?.replace(/_/g, ' ')}</div>
                  <div className="text-center">{c.quantity}</div>
                  <div>{c.calculation}</div>
                  <div>{c.cut_angle}</div>
                  <div>{c.notes}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Glass & notes */}
        {config.glass && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="font-semibold text-gray-200 mb-1">Glass</div>
              <div className="border border-gray-700 rounded-md px-2 py-2 bg-gray-900/60">
                <div>{config.glass.type}</div>
                <div className="mt-1 text-gray-300">
                  {`Width: ${config.glass.dimensions?.width} | Height: ${config.glass.dimensions?.height}`}
                </div>
              </div>
            </div>
            <div>
              <div className="font-semibold text-gray-200 mb-1">45° Installation Notes</div>
              <div className="btn-primary">
                <ul className="list-disc list-inside space-y-1 text-[10px]">
                  <li>All corners mitered at 45° with visible aluminum finish.</li>
                  <li>Use corner connectors 1130/1110 for 45° joint reinforcement and locking.</li>
                  <li>Hinges 0253 mounted on 45° cut faces.</li>
                  <li>Gaskets follow the 45° perimeter; glass size remains as per formula.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Rock60CuttingSummary;


