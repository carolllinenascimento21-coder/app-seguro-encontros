import { Suspense } from 'react';

import AceitarTermosClient from './AceitarTermosClient';

export default function AceitarTermosPage() {
  return (
    <Suspense>
      <AceitarTermosClient />
    </Suspense>
  );
}
