import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface ResponseComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  generatedResponse: string;
  expectedResponse: string;
  feedback: string;
  isValid: boolean;
  score: number;
  title?: string;
}

export default function ResponseComparisonModal({
  isOpen,
  onClose,
  generatedResponse,
  expectedResponse,
  feedback,
  isValid,
  score,
  title = 'Response Comparison',
}: ResponseComparisonModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {title}
            <Badge className={isValid ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
              {isValid ? 'Valid' : 'Invalid'} ({score}%)
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium mb-2">Generated Response</h3>
            <Card>
              <CardContent className="p-4 whitespace-pre-wrap break-words text-sm max-h-96 overflow-y-auto">
                {generatedResponse || 'No response generated'}
              </CardContent>
            </Card>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Expected Response</h3>
            <Card>
              <CardContent className="p-4 whitespace-pre-wrap break-words text-sm max-h-96 overflow-y-auto">
                {expectedResponse || 'No expected response provided'}
              </CardContent>
            </Card>
          </div>
        </div>
        
        <Separator className="my-4" />
        
        <div>
          <h3 className="font-medium mb-2">Feedback Analysis</h3>
          <Card>
            <CardContent className="p-4 whitespace-pre-wrap break-words text-sm max-h-48 overflow-y-auto">
              {feedback || 'No feedback available'}
            </CardContent>
          </Card>
        </div>
        
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}