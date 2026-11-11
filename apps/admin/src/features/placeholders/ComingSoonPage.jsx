import { useEffect } from 'react';
import { Button, Card, EmptyState } from '../../components/ui/index.js';

/**
 * Stand-in for pages that are not built yet, so the sidebar links don't break.
 * @param {{ title: string, icon: string, milestone: string }} props
 */
export function ComingSoonPage({ title, icon, milestone }) {
  useEffect(() => {
    document.title = `${title} · IRON CAMPUS GYM`;
  }, [title]);

  return (
    <>
      <div className="px-1">
        <h1 className="text-[26px] font-bold">{title}</h1>
      </div>
      <Card>
        <EmptyState
          icon={icon}
          title={`${title} is coming soon`}
          message={`This page is being built (${milestone}). Use the Overview page for now.`}
          action={
            <Button to="/" variant="secondary">
              Back to Overview
            </Button>
          }
        />
      </Card>
    </>
  );
}
