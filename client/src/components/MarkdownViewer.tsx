import { useState, useEffect } from 'react';
import { getPdfMarkdown } from '@/lib/pdfUtils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface MarkdownViewerProps {
  fileId: string;
  title?: string;
}

export function MarkdownViewer({ fileId, title }: MarkdownViewerProps) {
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!fileId) return;

    async function loadMarkdown() {
      setIsLoading(true);
      setError(null);
      try {
        const markdownContent = await getPdfMarkdown(fileId);
        setMarkdown(markdownContent);
        if (!markdownContent) {
          setError('No markdown content available for this PDF.');
        }
      } catch (err: any) {
        console.error('Error loading markdown:', err);
        setError(`Failed to load markdown: ${err.message}`);
        toast({
          title: 'Error',
          description: 'Failed to load markdown content',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadMarkdown();
  }, [fileId, toast]);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  if (isLoading) {
    return (
      <Card className="w-full my-2">
        <CardContent className="p-4 text-center">
          <span className="material-icons animate-spin">refresh</span>
          <p>Loading markdown content...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full my-2 bg-red-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-red-600 mb-2">
            <span className="material-icons">error_outline</span>
            <p className="font-medium">Error</p>
          </div>
          <p className="text-sm text-gray-700">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!markdown) {
    return (
      <Card className="w-full my-2 bg-gray-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-gray-600 mb-2">
            <span className="material-icons">info_outline</span>
            <p className="font-medium">No Content</p>
          </div>
          <p className="text-sm text-gray-700">
            No markdown content is available for this PDF file. It may not have been
            processed yet or the extraction failed.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full my-2">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-md font-medium">
            {title || 'Markdown Content'} 
            <span className="text-xs text-gray-500 ml-2">(Extracted from PDF)</span>
          </h3>
          <Button variant="outline" size="sm" onClick={toggleExpand}>
            <span className="material-icons text-sm mr-1">
              {isExpanded ? 'compress' : 'expand'}
            </span>
            {isExpanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>
        
        <div 
          className={`bg-gray-50 rounded p-3 text-sm prose prose-sm max-w-none overflow-auto ${
            isExpanded ? 'max-h-[800px]' : 'max-h-[200px]'
          }`}
        >
          {/* Display markdown content with basic formatting */}
          <pre className="whitespace-pre-wrap font-sans text-gray-800">{markdown}</pre>
        </div>
      </CardContent>
    </Card>
  );
}