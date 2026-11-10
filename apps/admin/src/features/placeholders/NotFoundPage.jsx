import { useEffect } from 'react';
import { Button, Card, EmptyState } from '../../components/ui/index.js';

export function NotFoundPage() {
  useEffect(() => {
    document.title = 'Page not found · IRON CAMPUS GYM';
  }, []);

  return (
    <Card>
      <EmptyState
        icon="alert"
        title="Page not found"
        message="This address doesn't match any page. Use the menu on the left to find what you need."
        action={
          <Button to="/" variant="primary">
            Go to Overview
          </Button>
        }
      />
    </Card>
  );
}
