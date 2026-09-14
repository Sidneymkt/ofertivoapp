import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

const InstitutionalVideo = () => {
  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardContent className="p-6">
        <div className="aspect-video">
          <iframe
            src="https://www.youtube.com/embed/VIDEO_ID"
            title="Institutional Video"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full rounded-lg"
          ></iframe>
        </div>
      </CardContent>
    </Card>
  );
};

export default InstitutionalVideo;